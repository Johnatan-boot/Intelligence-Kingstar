// src/modules/logistics/logistics.service.js
import { db } from '../../shared/database/db.js';
import { AppError } from '../../shared/utils/errors.js';

export async function createPurchaseOrder(data, io) {
    const { provider_id, expected_delivery_date, items } = data;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [res] = await connection.execute(
            'INSERT INTO purchase_orders (provider_id, expected_delivery_date, status) VALUES (?, ?, "PURCHASED")',
            [provider_id, expected_delivery_date]
        );
        const poId = res.insertId;

        for (const item of items) {
            await connection.execute(
                'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered) VALUES (?, ?, ?)',
                [poId, item.product_id, item.quantity_ordered]
            );
        }

        await connection.commit();
        const order = { id: poId, provider_id, status: 'PURCHASED', items };
        io.emit('order_created', order); // Notificação em tempo real
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
        SELECT po.*, p.name as provider_name 
        FROM purchase_orders po
        JOIN providers p ON p.id = po.provider_id
        ORDER BY po.id DESC
    `);
    return rows;
}

export async function createReceivingBatch(data, io) {
    const { purchase_order_id, invoice_number, license_plate } = data;
    const [res] = await db.execute(
        'INSERT INTO receiving_batches (purchase_order_id, invoice_number, license_plate, status) VALUES (?, ?, ?, "ARRIVED")',
        [purchase_order_id, invoice_number, license_plate]
    );
    const batchId = res.insertId;
    
    // Atualizar status do pedido de compra
    await db.execute('UPDATE purchase_orders SET status = "RECEIVING" WHERE id = ?', [purchase_order_id]);
    
    const batch = { id: batchId, purchase_order_id, invoice_number, license_plate, status: 'ARRIVED' };
    io.emit('truck_arrived', batch);
    return batch;
}

export async function addConferenceRound(batchId, data, io) {
    const { product_id, round_number, quantity_counted, user_id } = data;
    
    await db.execute(
        'INSERT INTO receiving_conferences (batch_id, product_id, round_number, quantity_counted, user_id) VALUES (?, ?, ?, ?, ?)',
        [batchId, product_id, round_number, quantity_counted, user_id]
    );

    // Lógica de Divergência Simples: Se houver rodada 1 e 2, comparar
    if (round_number === 2) {
        const [rounds] = await db.execute(
            'SELECT round_number, quantity_counted FROM receiving_conferences WHERE batch_id = ? AND product_id = ? AND round_number IN (1, 2)',
            [batchId, product_id]
        );
        
        if (rounds.length === 2) {
            const r1 = rounds.find(r => r.round_number === 1).quantity_counted;
            const r2 = rounds.find(r => r.round_number === 2).quantity_counted;
            
            if (r1 !== r2) {
                await db.execute('UPDATE receiving_batches SET status = "DIVERGENT" WHERE id = ?', [batchId]);
                await db.execute('UPDATE purchase_orders SET status = "DIVERGENT" WHERE id = (SELECT purchase_order_id FROM receiving_batches WHERE id = ?)', [batchId]);
                io.emit('conference_divergence', { batchId, product_id, r1, r2 });
            }
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
