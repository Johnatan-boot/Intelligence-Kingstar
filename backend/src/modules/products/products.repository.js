// src/modules/products/products.repository.js
import { db } from '../../shared/database/db.js';

export async function findAll({ limit, offset, search }) {
  const params = [];
  let where = '';
  if (search) {
    where = 'WHERE (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  const [rows] = await db.execute(
    `SELECT p.id, p.sku, p.name, p.price, p.created_at,
            COALESCE(SUM(i.quantity - i.reserved_quantity), 0) AS available_stock
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY p.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

export async function countAll(search) {
  const params = [];
  let where = '';
  if (search) {
    where = 'WHERE (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM products p ${where}`, params
  );
  return total;
}

export async function findById(id) {
  const [rows] = await db.execute(
    `SELECT p.id, p.sku, p.name, p.price, p.created_at,
            COALESCE(SUM(i.quantity), 0) AS total_stock,
            COALESCE(SUM(i.reserved_quantity), 0) AS reserved_stock,
            COALESCE(SUM(i.quantity - i.reserved_quantity), 0) AS available_stock
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.id = ?
     GROUP BY p.id`,
    [id]
  );
  return rows[0] || null;
}

export async function findBySku(sku) {
  const [rows] = await db.execute('SELECT id FROM products WHERE sku = ?', [sku]);
  return rows[0] || null;
}

export async function insert({ sku, name, price }) {
  const [result] = await db.execute(
    'INSERT INTO products (sku, name, price) VALUES (?, ?, ?)',
    [sku, name, price]
  );
  return result.insertId;
}

export async function update(id, { name, price }) {
  await db.execute(
    'UPDATE products SET name = COALESCE(?, name), price = COALESCE(?, price) WHERE id = ?',
    [name ?? null, price ?? null, id]
  );
}

export async function remove(id) {
  await db.execute('DELETE FROM inventory WHERE product_id = ?', [id]);
  await db.execute('DELETE FROM products WHERE id = ?', [id]);
}

export async function hasOrders(productId) {
  const [rows] = await db.execute(
    'SELECT id FROM order_items WHERE product_id = ? LIMIT 1', [productId]
  );
  return rows.length > 0;
}
