import { db } from "../../shared/database/db.js";

export async function insertOrder(data) {
  const [result] = await db.execute(
    `INSERT INTO orders (customer_id, status, total)
     VALUES (?, 'PENDING', ?)`,
    [data.customer_id, data.total || 0]
  );

  return { id: result.insertId, ...data };
}

export async function findOrders() {
  const [rows] = await db.execute(`SELECT * FROM orders`);
  return rows;
}