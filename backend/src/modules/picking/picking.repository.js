// src/modules/picking/picking.repository.js
import { db } from '../../shared/database/db.js';

export async function findAll({ limit, offset, status }) {
  const where  = status ? 'WHERE po.status = ?' : '';
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

export async function findById(pickingId) {
  const [rows] = await db.execute(
    `SELECT po.*, o.status AS order_status
     FROM picking_orders po
     JOIN orders o ON o.id = po.order_id
     WHERE po.id = ?`,
    [pickingId]
  );
  return rows[0] || null;
}

export async function findItems(pickingId) {
  const [rows] = await db.execute(
    `SELECT pi.id, pi.product_id, p.name AS product_name, p.sku,
            l.code AS location_code,
            pi.quantity_requested, pi.quantity_picked, pi.status
     FROM picking_items pi
     JOIN products  p ON p.id = pi.product_id
     JOIN locations l ON l.id = pi.location_id
     WHERE pi.picking_order_id = ?`,
    [pickingId]
  );
  return rows;
}

export async function findItemById(itemId, pickingId, connection = db) {
  const [rows] = await connection.execute(
    'SELECT * FROM picking_items WHERE id = ? AND picking_order_id = ? FOR UPDATE',
    [itemId, pickingId]
  );
  return rows[0] || null;
}

export async function existsForOrder(orderId) {
  const [rows] = await db.execute(
    "SELECT id FROM picking_orders WHERE order_id = ? AND status NOT IN ('CANCELLED')",
    [orderId]
  );
  return rows.length > 0;
}

export async function insertPickingOrder(orderId, connection = db) {
  const [result] = await connection.execute(
    "INSERT INTO picking_orders (order_id, status) VALUES (?, 'PENDING')", [orderId]
  );
  return result.insertId;
}

export async function insertPickingItem({ pickingId, productId, locationId, quantity }, connection = db) {
  await connection.execute(
    `INSERT INTO picking_items
       (picking_order_id, product_id, location_id, quantity_requested, quantity_picked, status)
     VALUES (?, ?, ?, ?, 0, 'PENDING')`,
    [pickingId, productId, locationId, quantity]
  );
}

export async function updateItemPicked(itemId, qty, status, connection = db) {
  await connection.execute(
    'UPDATE picking_items SET quantity_picked = ?, status = ? WHERE id = ?',
    [qty, status, itemId]
  );
}

export async function countPendingItems(pickingId, connection = db) {
  const [[{ cnt }]] = await connection.execute(
    "SELECT COUNT(*) AS cnt FROM picking_items WHERE picking_order_id = ? AND status != 'PICKED'",
    [pickingId]
  );
  return cnt;
}

export async function updatePickingStatus(pickingId, status, connection = db) {
  await connection.execute(
    'UPDATE picking_orders SET status = ? WHERE id = ?', [status, pickingId]
  );
}
