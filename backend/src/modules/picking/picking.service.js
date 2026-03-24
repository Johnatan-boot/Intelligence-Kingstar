// src/modules/picking/picking.service.js
import { db } from '../../shared/database/db.js';
import { AppError } from '../../shared/utils/errors.js';

export async function createPickingOrder(orderId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar se pedido existe e está CONFIRMED
    const [orders] = await connection.execute(
      'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );
    if (!orders.length) throw new AppError('Pedido não encontrado', 404);
    if (orders[0].status !== 'CONFIRMED') throw new AppError('Pedido precisa estar CONFIRMED para picking');

    // Verificar se já existe picking
    const [existing] = await connection.execute(
      "SELECT id FROM picking_orders WHERE order_id = ? AND status NOT IN ('CANCELLED')",
      [orderId]
    );
    if (existing.length) throw new AppError('Picking já criado para este pedido', 409);

    // Criar picking order
    const [pickResult] = await connection.execute(
      "INSERT INTO picking_orders (order_id, status) VALUES (?, 'PENDING')",
      [orderId]
    );
    const pickingId = pickResult.insertId;

    // Criar itens de picking baseados nos order_items
    const [orderItems] = await connection.execute(
      `SELECT oi.product_id, oi.quantity, p.name,
              i.location_id, l.code AS location_code
       FROM order_items oi
       JOIN products p  ON p.id = oi.product_id
       JOIN inventory i ON i.product_id = oi.product_id
       JOIN locations l ON l.id = i.location_id
       WHERE oi.order_id = ?
       LIMIT 1000`,
      [orderId]
    );

    for (const item of orderItems) {
      await connection.execute(
        'INSERT INTO picking_items (picking_order_id, product_id, location_id, quantity_requested, quantity_picked, status) VALUES (?, ?, ?, ?, 0, ?)',
        [pickingId, item.product_id, item.location_id, item.quantity, 'PENDING']
      );
    }

    await connection.commit();
    return { success: true, picking_order_id: pickingId, order_id: orderId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function listPickingOrders({ page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  const where = status ? 'WHERE po.status = ?' : '';
  const params = status ? [status, limit, offset] : [limit, offset];

  const [rows] = await db.execute(
    `SELECT po.id, po.order_id, po.status, po.created_at,
            c.name AS customer_name
     FROM picking_orders po
     JOIN orders o    ON o.id = po.order_id
     JOIN customers c ON c.id = o.customer_id
     ${where}
     ORDER BY po.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

export async function getPickingOrder(pickingId) {
  const [picks] = await db.execute(
    `SELECT po.*, o.status AS order_status
     FROM picking_orders po
     JOIN orders o ON o.id = po.order_id
     WHERE po.id = ?`,
    [pickingId]
  );
  if (!picks.length) throw new AppError('Picking não encontrado', 404);

  const [items] = await db.execute(
    `SELECT pi.id, pi.product_id, p.name AS product_name, p.sku,
            l.code AS location_code, pi.quantity_requested,
            pi.quantity_picked, pi.status
     FROM picking_items pi
     JOIN products p  ON p.id = pi.product_id
     JOIN locations l ON l.id = pi.location_id
     WHERE pi.picking_order_id = ?`,
    [pickingId]
  );

  return { ...picks[0], items };
}

export async function pickItem(pickingId, itemId, quantityPicked) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [items] = await connection.execute(
      'SELECT * FROM picking_items WHERE id = ? AND picking_order_id = ? FOR UPDATE',
      [itemId, pickingId]
    );
    if (!items.length) throw new AppError('Item não encontrado');

    const item = items[0];
    if (item.status === 'PICKED') throw new AppError('Item já separado');
    if (quantityPicked > item.quantity_requested) throw new AppError('Quantidade maior que o solicitado');

    const newStatus = quantityPicked >= item.quantity_requested ? 'PICKED' : 'PARTIAL';

    await connection.execute(
      "UPDATE picking_items SET quantity_picked = ?, status = ? WHERE id = ?",
      [quantityPicked, newStatus, itemId]
    );

    // Verificar se todos os itens estão PICKED para fechar o picking
    const [pending] = await connection.execute(
      "SELECT COUNT(*) AS cnt FROM picking_items WHERE picking_order_id = ? AND status NOT IN ('PICKED')",
      [pickingId]
    );

    if (pending[0].cnt === 0) {
      await connection.execute(
        "UPDATE picking_orders SET status = 'COMPLETED' WHERE id = ?",
        [pickingId]
      );
    }

    await connection.commit();
    return { success: true, item_id: itemId, status: newStatus };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
