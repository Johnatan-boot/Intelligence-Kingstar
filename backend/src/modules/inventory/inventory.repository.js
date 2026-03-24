// src/modules/inventory/inventory.repository.js
import { db } from '../../shared/database/db.js';

export async function findAll({ limit, offset }) {
  const [rows] = await db.execute(
    `SELECT i.id, i.product_id, p.name AS product_name, p.sku,
            w.name AS warehouse, l.code AS location_code,
            i.quantity, i.reserved_quantity,
            (i.quantity - i.reserved_quantity) AS available
     FROM inventory i
     JOIN products   p ON p.id = i.product_id
     JOIN locations  l ON l.id = i.location_id
     JOIN warehouses w ON w.id = l.warehouse_id
     ORDER BY i.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

export async function countAll() {
  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM inventory');
  return total;
}

export async function findByProduct(productId) {
  const [rows] = await db.execute(
    `SELECT i.id, l.code AS location, w.name AS warehouse,
            i.quantity, i.reserved_quantity,
            (i.quantity - i.reserved_quantity) AS available
     FROM inventory i
     JOIN locations  l ON l.id = i.location_id
     JOIN warehouses w ON w.id = l.warehouse_id
     WHERE i.product_id = ?`,
    [productId]
  );
  return rows;
}

export async function findByProductAndLocation(productId, locationId, connection = db) {
  const [rows] = await connection.execute(
    'SELECT id, quantity, reserved_quantity FROM inventory WHERE product_id = ? AND location_id = ? FOR UPDATE',
    [productId, locationId]
  );
  return rows[0] || null;
}

export async function insertInventory({ productId, locationId }, connection = db) {
  const [result] = await connection.execute(
    'INSERT INTO inventory (product_id, location_id, quantity, reserved_quantity) VALUES (?, ?, 0, 0)',
    [productId, locationId]
  );
  return result.insertId;
}

export async function updateQuantity(id, newQty, connection = db) {
  await connection.execute('UPDATE inventory SET quantity = ? WHERE id = ?', [newQty, id]);
}

export async function findCritical(threshold) {
  const [rows] = await db.execute(
    `SELECT i.product_id, p.name, p.sku,
            SUM(i.quantity) AS total_qty,
            SUM(i.reserved_quantity) AS reserved,
            SUM(i.quantity - i.reserved_quantity) AS available
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     GROUP BY i.product_id
     HAVING available < ?
     ORDER BY available ASC`,
    [threshold]
  );
  return rows;
}

export async function insertMovement({ inventoryId, productId, locationId, type, quantity, reason }, connection = db) {
  try {
    await connection.execute(
      `INSERT INTO inventory_movements
         (inventory_id, product_id, location_id, type, quantity, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [inventoryId, productId, locationId, type, quantity, reason || null]
    );
  } catch (_) { /* tabela opcional */ }
}
