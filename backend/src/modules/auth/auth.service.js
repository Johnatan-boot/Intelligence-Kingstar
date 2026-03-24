// src/modules/auth/auth.service.js
import { db } from '../../shared/database/db.js';
import bcrypt from 'bcrypt';
import { AppError } from '../../shared/utils/errors.js';

export async function register(data) {
  const { name, email, password, role = 'operator' } = data;

  const [existing] = await db.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existing.length > 0) {
    throw new AppError('Email já cadastrado', 409);
  }

  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]
  );

  return { id: result.insertId, name, email, role };
}

export async function login(email, password, fastify) {
  const [rows] = await db.execute(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
    [email]
  );

  if (!rows.length) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const token = fastify.jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    { expiresIn: process.env.JWT_EXPIRES || '24h' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function me(userId) {
  const [rows] = await db.execute(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (!rows.length) throw new AppError('Usuário não encontrado', 404);
  return rows[0];
}
