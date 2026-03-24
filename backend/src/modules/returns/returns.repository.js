// src/modules/returns/returns.repository.js
import { db } from '../../shared/database/db.js';

export async function findAll({ limit, offset, status }) {
  const where  = status ? 'WHERE r.status = ?' : '';
  const params = status ? [status, limit, offset] : [limit, offset];
  const [rows] = await db.execute(
    `SELECT r.id, r.order_id, r.status, r.reason, r.created_at,
            c.name AS customer_name
     FROM returns r
     JOIN orders o    ON o.id = r.order_id
     JOIN customers c ON c.id = o.customer_id
     ${where}
     ORDER BY r.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await db.execute(
    `SELECT r.*, o.customer_id, c.name AS customer_name
     FROM returns r
     JOIN orders o    ON o.id = r.order_id
     JOIN customers c ON c.id = o.customer_id
     WHERE r.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function findItems(returnId) {
  const [rows] = await db.execute(
    `SELECT ri.id, ri.product_id, p.name AS product_name, p.sku,
            ri.quantity, ri.reason AS item_reason, ri.condition_on_return
     FROM return_items ri
     JOIN products p ON p.id = ri.product_id
     WHERE ri.return_id = ?`,
    [returnId]
  );
  return rows;
}

export async function insert({ orderId, reason }, connection = db) {
  const [result] = await connection.execute(
    "INSERT INTO returns (order_id, status, reason) VALUES (?, 'REQUESTED', ?)",
    [orderId, reason || null]
  );
  return result.insertId;
}

export async function insertItem({ returnId, productId, quantity, reason, condition }, connection = db) {
  await connection.execute(
    'INSERT INTO return_items (return_id, product_id, quantity, reason, condition_on_return) VALUES (?, ?, ?, ?, ?)',
    [returnId, productId, quantity, reason || null, condition || 'GOOD']
  );
}

export async function updateStatus(id, status) {
  await db.execute('UPDATE returns SET status = ? WHERE id = ?', [status, id]);
}
