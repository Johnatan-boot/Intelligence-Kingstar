// src/modules/shipments/shipments.service.js
import { db } from '../../shared/database/db.js';
import { AppError } from '../../shared/utils/errors.js';

export async function createShipment(data) {
  const { order_id, carrier, tracking_code, estimated_delivery } = data;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
      [order_id]
    );
    if (!orders.length) throw new AppError('Pedido não encontrado', 404);
    if (!['CONFIRMED', 'PENDING'].includes(orders[0].status)) {
      throw new AppError('Pedido não pode ser enviado neste status');
    }

    const [result] = await connection.execute(
      `INSERT INTO shipments (order_id, carrier, tracking_code, status, estimated_delivery)
       VALUES (?, ?, ?, 'PREPARING', ?)`,
      [order_id, carrier || null, tracking_code || null, estimated_delivery || null]
    );

    await connection.execute(
      "UPDATE orders SET status = 'SHIPPED' WHERE id = ?",
      [order_id]
    );

    // Liberar estoque reservado (saída real)
    const [reservations] = await connection.execute(
      "SELECT product_id, quantity FROM stock_reservations WHERE order_id = ? AND status = 'RESERVED'",
      [order_id]
    );

    for (const r of reservations) {
      await connection.execute(
        'UPDATE inventory SET quantity = GREATEST(quantity - ?, 0), reserved_quantity = GREATEST(reserved_quantity - ?, 0) WHERE product_id = ?',
        [r.quantity, r.quantity, r.product_id]
      );
    }

    await connection.execute(
      "UPDATE stock_reservations SET status = 'RELEASED' WHERE order_id = ?",
      [order_id]
    );

    await connection.commit();
    return { success: true, shipment_id: result.insertId, order_id };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function listShipments({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [rows] = await db.execute(
    `SELECT s.id, s.order_id, s.carrier, s.tracking_code, s.status,
            s.estimated_delivery, s.created_at,
            c.name AS customer_name
     FROM shipments s
     JOIN orders o    ON o.id = s.order_id
     JOIN customers c ON c.id = o.customer_id
     ORDER BY s.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

export async function updateShipmentStatus(shipmentId, status) {
  const validStatuses = ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];
  if (!validStatuses.includes(status)) throw new AppError('Status inválido');

  const [rows] = await db.execute('SELECT id, order_id FROM shipments WHERE id = ?', [shipmentId]);
  if (!rows.length) throw new AppError('Shipment não encontrado', 404);

  await db.execute('UPDATE shipments SET status = ? WHERE id = ?', [status, shipmentId]);

  if (status === 'DELIVERED') {
    await db.execute("UPDATE orders SET status = 'DELIVERED' WHERE id = ?", [rows[0].order_id]);
  }

  return { success: true, shipment_id: shipmentId, status };
}
