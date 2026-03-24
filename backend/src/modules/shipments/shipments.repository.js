// src/modules/shipments/shipments.repository.js
import { db } from '../../shared/database/db.js';

export async function findAll({ limit, offset }) {
  const [rows] = await db.execute(
    `SELECT s.id, s.order_id, s.carrier, s.tracking_code, s.status,
            s.estimated_delivery, s.created_at,
            c.name AS customer_name
     FROM shipments s
     JOIN orders    o ON o.id = s.order_id
     JOIN customers c ON c.id = o.customer_id
     ORDER BY s.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await db.execute(
    `SELECT s.*, o.customer_id, c.name AS customer_name, o.status AS order_status
     FROM shipments s
     JOIN orders    o ON o.id = s.order_id
     JOIN customers c ON c.id = o.customer_id
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function findByOrder(orderId) {
  const [rows] = await db.execute(
    'SELECT id, status FROM shipments WHERE order_id = ?', [orderId]
  );
  return rows;
}

export async function insert({ orderId, carrier, trackingCode, estimatedDelivery }, connection = db) {
  const [result] = await connection.execute(
    "INSERT INTO shipments (order_id, carrier, tracking_code, status, estimated_delivery) VALUES (?, ?, ?, 'PREPARING', ?)",
    [orderId, carrier || null, trackingCode || null, estimatedDelivery || null]
  );
  return result.insertId;
}

export async function updateStatus(id, status) {
  await db.execute('UPDATE shipments SET status = ? WHERE id = ?', [status, id]);
}

export async function getReservations(orderId, connection = db) {
  const [rows] = await connection.execute(
    "SELECT product_id, quantity FROM stock_reservations WHERE order_id = ? AND status = 'RESERVED'",
    [orderId]
  );
  return rows;
}
