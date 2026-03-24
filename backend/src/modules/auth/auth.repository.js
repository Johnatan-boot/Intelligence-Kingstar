// src/modules/auth/auth.repository.js
import { db } from '../../shared/database/db.js';

export async function findByEmail(email) {
  const [rows] = await db.execute(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

export async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function insertUser({ name, email, hash, role }) {
  const [result] = await db.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]
  );
  return { id: result.insertId, name, email, role };
}

export async function emailExists(email) {
  const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
  return rows.length > 0;
}
