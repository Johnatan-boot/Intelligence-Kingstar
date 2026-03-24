// src/modules/users/users.repository.js
import { db } from '../../shared/database/db.js';

export async function findAll() {
  const [rows] = await db.execute(
    'SELECT id, name, email, role, created_at FROM users ORDER BY id DESC'
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]
  );
  return rows[0] || null;
}

export async function update(id, { name, role, hash }) {
  if (hash) {
    await db.execute(
      'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), password_hash = ? WHERE id = ?',
      [name ?? null, role ?? null, hash, id]
    );
  } else {
    await db.execute(
      'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role) WHERE id = ?',
      [name ?? null, role ?? null, id]
    );
  }
}

export async function remove(id) {
  await db.execute('DELETE FROM users WHERE id = ?', [id]);
}
