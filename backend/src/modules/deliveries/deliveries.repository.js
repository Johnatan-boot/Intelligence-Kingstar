// src/modules/deliveries/deliveries.repository.js
import { db } from '../../shared/database/db.js';

export async function findAll({ limit, offset, status }) {
  const where  = status ? 'WHERE d.status = ?' : '';
  const params = status ? [status, limit, offset] : [limit, offset];
  const [rows] = await db.execute(
    `SELECT d.id, d.shipment_id, d.status, d.notes,
            d.scheduled_date, d.delivered_at, d.created_at,
            s.tracking_code, s.carrier,
            c.name AS customer_name
     FROM deliveries d
     JOIN shipments  s ON s.id = d.shipment_id
     JOIN orders     o ON o.id = s.order_id
     JOIN customers  c ON c.id = o.customer_id
     ${where}
     ORDER BY d.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await db.execute(
    `SELECT d.*, s.tracking_code, s.carrier, s.order_id
     FROM deliveries d
     JOIN shipments s ON s.id = d.shipment_id
     WHERE d.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function findByShipment(shipmentId) {
  const [rows] = await db.execute(
    'SELECT * FROM deliveries WHERE shipment_id = ?', [shipmentId]
  );
  return rows[0] || null;
}

export async function insert({ shipmentId, scheduledDate, notes }) {
  const [result] = await db.execute(
    "INSERT INTO deliveries (shipment_id, status, scheduled_date, notes) VALUES (?, 'PENDING', ?, ?)",
    [shipmentId, scheduledDate || null, notes || null]
  );
  return result.insertId;
}

export async function updateStatus(id, status, notes) {
  const deliveredAt = status === 'DELIVERED' ? new Date() : null;
  await db.execute(
    'UPDATE deliveries SET status = ?, notes = COALESCE(?, notes), delivered_at = COALESCE(?, delivered_at) WHERE id = ?',
    [status, notes || null, deliveredAt, id]
  );
}
