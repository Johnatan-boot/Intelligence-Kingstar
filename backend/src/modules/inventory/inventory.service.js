// src/modules/inventory/inventory.service.js
import { db } from '../../shared/database/db.js';
import { AppError } from '../../shared/utils/errors.js';

export async function listInventory({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [rows] = await db.execute(
    `SELECT i.id, i.product_id, p.name AS product_name, p.sku,
            w.name AS warehouse_name, l.code AS location_code,
            i.quantity, i.reserved_quantity,
            (i.quantity - i.reserved_quantity) AS available
     FROM inventory i
     JOIN products p  ON p.id  = i.product_id
     JOIN locations l ON l.id  = i.location_id
     JOIN warehouses w ON w.id = l.warehouse_id
     ORDER BY i.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM inventory');
  return { data: rows, total, page, limit };
}

export async function getInventoryByProduct(productId) {
  const [rows] = await db.execute(
    `SELECT i.id, l.code AS location, w.name AS warehouse,
            i.quantity, i.reserved_quantity,
            (i.quantity - i.reserved_quantity) AS available
     FROM inventory i
     JOIN locations l  ON l.id  = i.location_id
     JOIN warehouses w ON w.id = l.warehouse_id
     WHERE i.product_id = ?`,
    [productId]
  );
  return rows;
}

export async function adjustStock(data) {
  const { product_id, location_id, quantity, type, reason } = data;
  if (!['IN', 'OUT', 'ADJUST'].includes(type)) {
    throw new AppError('type deve ser IN, OUT ou ADJUST');
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, quantity, reserved_quantity FROM inventory WHERE product_id = ? AND location_id = ? FOR UPDATE',
      [product_id, location_id]
    );

    let inventoryId;
    let currentQty = 0;

    if (rows.length) {
      inventoryId = rows[0].id;
      currentQty = rows[0].quantity;
    } else {
      // Criar registro de inventário se não existir
      const [ins] = await connection.execute(
        'INSERT INTO inventory (product_id, location_id, quantity, reserved_quantity) VALUES (?, ?, 0, 0)',
        [product_id, location_id]
      );
      inventoryId = ins.insertId;
    }

    let newQty;
    if (type === 'ADJUST') {
      newQty = quantity;
    } else if (type === 'IN') {
      newQty = currentQty + quantity;
    } else {
      newQty = currentQty - quantity;
      if (newQty < 0) throw new AppError('Estoque insuficiente para saída');
    }

    await connection.execute(
      'UPDATE inventory SET quantity = ? WHERE id = ?',
      [newQty, inventoryId]
    );

    // Registrar movimentação
    await connection.execute(
      `INSERT INTO inventory_movements (inventory_id, product_id, location_id, type, quantity, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [inventoryId, product_id, location_id, type, quantity, reason || null]
    );

    await connection.commit();
    return { success: true, product_id, location_id, new_quantity: newQty };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getMovements(productId, { page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  const [rows] = await db.execute(
    `SELECT im.id, im.type, im.quantity, im.reason, im.created_at,
            l.code AS location, w.name AS warehouse
     FROM inventory_movements im
     JOIN locations l  ON l.id  = im.location_id
     JOIN warehouses w ON w.id = l.warehouse_id
     WHERE im.product_id = ?
     ORDER BY im.id DESC
     LIMIT ? OFFSET ?`,
    [productId, limit, offset]
  );
  return rows;
}

export async function criticalStock(threshold = 5) {
  const [rows] = await db.execute(
    `SELECT i.product_id, p.name, p.sku,
            SUM(i.quantity) AS total_qty,
            SUM(i.reserved_quantity) AS reserved_qty,
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
