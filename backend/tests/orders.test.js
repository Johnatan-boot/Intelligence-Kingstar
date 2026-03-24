// tests/orders.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const BASE  = 'http://localhost:3000';
const req   = (method, path, body, token) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

// Login helper
async function getToken() {
  const res = await req('POST', '/auth/login', {
    email: 'admin@kingstar.com',
    password: 'admin123',
  });
  const body = await res.json();
  if (!body.token) throw new Error('Login falhou: ' + JSON.stringify(body));
  return body.token;
}

describe('ORDERS', () => {
  let token, createdOrderId;

  test('setup: login', async () => {
    token = await getToken();
    assert.ok(token);
  });

  test('GET /orders → 200 lista paginada', async () => {
    const res  = await req('GET', '/orders?page=1&limit=5', null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body.data), 'data deve ser array');
    assert.ok(typeof body.total === 'number', 'total deve ser number');
  });

  test('GET /orders?status=PENDING → filtra por status', async () => {
    const res  = await req('GET', '/orders?status=PENDING', null, token);
    const body = await res.json();
    assert.equal(res.status, 200);
    if (body.data.length) {
      assert.ok(body.data.every(o => o.status === 'PENDING'), 'todos devem ser PENDING');
    }
  });

  test('POST /orders → 201 cria pedido com estoque', async () => {
    const res = await req('POST', '/orders', {
      customer_id: 1,
      items: [{ product_id: 2, quantity: 1, price: 250.00 }],
    }, token);
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));
    assert.ok(body.order_id, 'order_id ausente');
    assert.ok(body.total > 0, 'total deve ser > 0');
    createdOrderId = body.order_id;
  });

  test('GET /orders/:id → 200 detalha pedido com items', async () => {
    const res  = await req('GET', `/orders/${createdOrderId}`, null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body.items), 'items deve ser array');
    assert.ok(body.items.length > 0, 'deve ter pelo menos 1 item');
  });

  test('PUT /orders/:id/confirm → 200', async () => {
    const res  = await req('PUT', `/orders/${createdOrderId}/confirm`, null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.status, 'CONFIRMED');
  });

  test('PUT /orders/:id/cancel → 200 libera estoque', async () => {
    // Cria um pedido novo para cancelar
    const r1   = await req('POST', '/orders', {
      customer_id: 1,
      items: [{ product_id: 3, quantity: 1, price: 400.00 }],
    }, token);
    const o    = await r1.json();
    const res  = await req('PUT', `/orders/${o.order_id}/cancel`, null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(body.success);
  });

  test('POST /orders → 400 sem itens', async () => {
    const res = await req('POST', '/orders', { customer_id: 1, items: [] }, token);
    assert.equal(res.status, 400);
  });

  test('GET /orders/999999 → 404', async () => {
    const res = await req('GET', '/orders/999999', null, token);
    assert.equal(res.status, 404);
  });
});
