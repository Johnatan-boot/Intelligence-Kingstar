// tests/auth.test.js
// Testes de integração para o módulo Auth
// Para rodar: node --test tests/auth.test.js
// (Node.js 20+ tem test runner nativo)

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

// ─── helpers ─────────────────────────────────────────────────────────────────
const BASE = 'http://localhost:3000';
const post = (path, body, token) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const get = (path, token) =>
  fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── testes ──────────────────────────────────────────────────────────────────
describe('AUTH', () => {
  const testEmail = `test_${Date.now()}@kingstar.com`;
  let token;

  test('POST /auth/register → 201', async () => {
    const res = await post('/auth/register', {
      name: 'Teste User',
      email: testEmail,
      password: 'senha123',
    });
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));
    assert.ok(body.user.id);
    assert.equal(body.user.email, testEmail);
  });

  test('POST /auth/register → 409 email duplicado', async () => {
    const res = await post('/auth/register', {
      name: 'Dup',
      email: testEmail,
      password: '123',
    });
    assert.equal(res.status, 409);
  });

  test('POST /auth/login → 200 + token', async () => {
    const res = await post('/auth/login', { email: testEmail, password: 'senha123' });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(body.token, 'token ausente');
    token = body.token;
  });

  test('POST /auth/login → 401 senha errada', async () => {
    const res = await post('/auth/login', { email: testEmail, password: 'errada' });
    assert.equal(res.status, 401);
  });

  test('GET /auth/me → 200 com token válido', async () => {
    const res = await get('/auth/me', token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.email, testEmail);
  });

  test('GET /auth/me → 401 sem token', async () => {
    const res = await fetch(`${BASE}/auth/me`);
    assert.equal(res.status, 401);
  });
});
