// src/modules/users/users.service.js
import { db } from '../../shared/database/db.js';
import bcrypt from 'bcrypt';
import { AppError } from '../../shared/utils/errors.js';

export async function listUsers({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [rows] = await db.execute(
    'SELECT id, name, email, role, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM users');
  return { data: rows, total, page, limit };
}

export async function getUser(id) {
  const [rows] = await db.execute(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]
  );
  if (!rows.length) throw new AppError('Usuário não encontrado', 404);
  return rows[0];
}

export async function updateUser(id, data) {
  await getUser(id);
  const { name, role, password } = data;

  if (password) {
    const hash = await bcrypt.hash(password, 10);
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
  return getUser(id);
}

export async function deleteUser(id) {
  await getUser(id);
  await db.execute('DELETE FROM users WHERE id = ?', [id]);
  return { success: true, message: 'Usuário excluído' };
}
