// src/modules/logistics/logistics.service.js
import { db } from '../../shared/database/db.js';
import { AppError } from '../../shared/utils/errors.js';

export async function createPurchaseOrder(data, io) {
    const {
        provider_id,
        provider_name,
        expected_delivery_date,
        items = [],
        invoice_number,
        license_plate
    } = data;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        let resolvedProviderId = provider_id;

        if (!resolvedProviderId && provider_name) {
            const [existingProvider] = await connection.execute(
                'SELECT id FROM providers WHERE name = ? LIMIT 1',
                [provider_name]
            );
            if (existingProvider.length) {
                resolvedProviderId = existingProvider[0].id;
            } else {
                const [providerRes] = await connection.execute(
                    'INSERT INTO providers (name) VALUES (?)',
                    [provider_name]
                );
                resolvedProviderId = providerRes.insertId;
            }
        }

        if (!resolvedProviderId) {
            throw new AppError('provider_id ou provider_name é obrigatório', 400);
        }

        const [res] = await connection.execute(
            'INSERT INTO purchase_orders (provider_id, expected_delivery_date, status) VALUES (?, ?, "PURCHASED")',
            [resolvedProviderId, expected_delivery_date || null]
        );
        const poId = res.insertId;

        for (const item of (Array.isArray(items) ? items : [])) {
            if (!item?.product_id || !item?.quantity_ordered) continue;
            await connection.execute(
                'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered) VALUES (?, ?, ?)',
                [poId, item.product_id, item.quantity_ordered]
            );
        }

        await connection.commit();
        const order = {
            id: poId,
            provider_id: resolvedProviderId,
            provider_name: provider_name || null,
            invoice_number: invoice_number || null,
            license_plate: license_plate || null,
            status: 'PURCHASED',
            items
        };
        io.emit('order_created', order); // Notificação em tempo real
        if (invoice_number || license_plate || provider_name) {
            io.emit('truck_arrived', {
                purchase_order_id: poId,
                invoice_number: invoice_number || null,
                license_plate: license_plate || null,
                provider: provider_name || null
            });
        }
        return order;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

export async function listPurchaseOrders() {
    const [rows] = await db.execute(`
        SELECT
            po.*,
            p.name as provider_name,
            rb.invoice_number,
            rb.license_plate
        FROM purchase_orders po
        JOIN providers p ON p.id = po.provider_id
        LEFT JOIN receiving_batches rb
            ON rb.id = (
                SELECT rb2.id
                FROM receiving_batches rb2
                WHERE rb2.purchase_order_id = po.id
                ORDER BY rb2.id DESC
                LIMIT 1
            )
        ORDER BY po.id DESC
    `);
    return rows;
}

export async function createReceivingBatch(data, io) {
    const { purchase_order_id, invoice_number, license_plate, provider_name } = data;
    if (!purchase_order_id) throw new AppError('purchase_order_id é obrigatório', 400);
    const [res] = await db.execute(
        'INSERT INTO receiving_batches (purchase_order_id, invoice_number, license_plate, status) VALUES (?, ?, ?, "ARRIVED")',
        [purchase_order_id, invoice_number, license_plate]
    );
    const batchId = res.insertId;
    
    // Atualizar status do pedido de compra
    await db.execute('UPDATE purchase_orders SET status = "RECEIVING" WHERE id = ?', [purchase_order_id]);
    
    const batch = { id: batchId, purchase_order_id, invoice_number, license_plate, provider_name: provider_name || null, status: 'ARRIVED' };
    io.emit('truck_arrived', batch);
    return batch;
}

export async function addConferenceRound(batchId, data, io) {
    const {
        product_id,
        round_number,
        quantity_counted,
        user_id,
        invoice_number,
        provider_name,
        license_plate,
        evidence_image_base64
    } = data;
    if (![1, 2, 3].includes(Number(round_number))) {
        throw new AppError('round_number deve ser 1, 2 ou 3', 400);
    }
    
    await db.execute(
        'INSERT INTO receiving_conferences (batch_id, product_id, round_number, quantity_counted, user_id) VALUES (?, ?, ?, ?, ?)',
        [batchId, product_id, round_number, quantity_counted, user_id]
    );

    // Rodadas 1 e 2: progresso de conferência (não encerra lote)
    if ([1, 2].includes(Number(round_number))) {
        await db.execute(
            'UPDATE receiving_batches SET status = "IN_CONFERENCE" WHERE id = ?',
            [batchId]
        );
    }

    // Rodada 3: validação final obrigatória
    if (Number(round_number) === 3) {
        const [rounds] = await db.execute(
            `SELECT product_id, round_number, quantity_counted
             FROM receiving_conferences
             WHERE batch_id = ? AND round_number IN (1, 2, 3)`,
            [batchId]
        );

        const grouped = new Map();
        for (const row of rounds) {
            if (!grouped.has(row.product_id)) grouped.set(row.product_id, {});
            grouped.get(row.product_id)[row.round_number] = row.quantity_counted;
        }

        const hasDivergence = Array.from(grouped.values()).some((r) => {
            return !(r[1] !== undefined && r[2] !== undefined && r[3] !== undefined && r[1] === r[2] && r[2] === r[3]);
        });

        if (hasDivergence) {
            await db.execute('UPDATE receiving_batches SET status = "DIVERGENT" WHERE id = ?', [batchId]);
            await db.execute('UPDATE purchase_orders SET status = "DIVERGENT" WHERE id = (SELECT purchase_order_id FROM receiving_batches WHERE id = ?)', [batchId]);
            io.emit('conference_divergence', { batchId });
        } else {
            if (!evidence_image_base64) {
                throw new AppError('Evidência (print) é obrigatória para liberar o lote', 400);
            }
            await db.execute('UPDATE receiving_batches SET status = "RELEASED", finished_at = NOW() WHERE id = ?', [batchId]);
            await db.execute('UPDATE purchase_orders SET status = "COMPLETED" WHERE id = (SELECT purchase_order_id FROM receiving_batches WHERE id = ?)', [batchId]);
            io.emit('receiving_completed', {
                batchId,
                invoice_number: invoice_number || null,
                provider_name: provider_name || null,
                license_plate: license_plate || null,
                evidence_image_base64
            });
        }
    }

    io.emit('conference_update', { batchId, product_id, round_number, quantity_counted });
    return { success: true };
}

export async function updateReceivingStatus(id, status, io) {
    await db.execute('UPDATE receiving_batches SET status = ? WHERE id = ?', [status, id]);
    io.emit('receiving_status_updated', { id, status });
}

export async function listReceivingBatches() {
    const [rows] = await db.execute(`
        SELECT rb.*, po.expected_delivery_date, p.name as provider_name
        FROM receiving_batches rb
        JOIN purchase_orders po ON po.id = rb.purchase_order_id
        JOIN providers p ON p.id = po.provider_id
        ORDER BY rb.id DESC
    `);
    return rows;
}
