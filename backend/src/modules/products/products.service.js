// src/modules/products/products.service.js
import { db } from '../../shared/database/db.js';
import { AppError } from '../../shared/utils/errors.js';

export async function listProducts({ page = 1, limit = 20, search = '' } = {}) {
  const offset = (page - 1) * limit;
  let where = '';
  const params = [];

  if (search) {
    where = 'WHERE p.name LIKE ? OR p.sku LIKE ?';
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

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM products p ${where}`,
    params
  );

  return { data: rows, total, page, limit };
}

export async function getProduct(id) {
  const [rows] = await db.execute(
    `SELECT p.id, p.sku, p.name, p.price, p.created_at,
            COALESCE(SUM(i.quantity), 0)          AS total_stock,
            COALESCE(SUM(i.reserved_quantity), 0) AS reserved_stock,
            COALESCE(SUM(i.quantity - i.reserved_quantity), 0) AS available_stock
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.id = ?
     GROUP BY p.id`,
    [id]
  );
  if (!rows.length) throw new AppError('Produto não encontrado', 404);
  return rows[0];
}

export async function createProduct(data) {
  const { sku, name, price } = data;
  if (!sku || !name || price == null) throw new AppError('sku, name e price são obrigatórios');

  const [existing] = await db.execute('SELECT id FROM products WHERE sku = ?', [sku]);
  if (existing.length) throw new AppError('SKU já cadastrado', 409);

  const [result] = await db.execute(
    'INSERT INTO products (sku, name, price) VALUES (?, ?, ?)',
    [sku, name, price]
  );
  return getProduct(result.insertId);
}

export async function updateProduct(id, data) {
  const { name, price } = data;
  await getProduct(id); // garante que existe
  await db.execute(
    'UPDATE products SET name = COALESCE(?, name), price = COALESCE(?, price) WHERE id = ?',
    [name ?? null, price ?? null, id]
  );
  return getProduct(id);
}

export async function deleteProduct(id) {
  const [orders] = await db.execute(
    'SELECT id FROM order_items WHERE product_id = ? LIMIT 1',
    [id]
  );
  if (orders.length) throw new AppError('Produto possui pedidos vinculados e não pode ser excluído', 409);
  await db.execute('DELETE FROM inventory WHERE product_id = ?', [id]);
  await db.execute('DELETE FROM products WHERE id = ?', [id]);
  return { success: true };
}
