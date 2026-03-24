// tests/picking.test.js
// node --test tests/picking.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:3000';
const req  = (method, path, body, token) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

async function getToken() {
  const res  = await req('POST', '/auth/login', { email: 'admin@kingstar.com', password: 'admin123' });
  const body = await res.json();
  if (!body.token) throw new Error('Login falhou: ' + JSON.stringify(body));
  return body.token;
}

// Cria pedido → confirma → retorna order_id pronto para picking
async function createConfirmedOrder(token) {
  const r1 = await req('POST', '/orders', {
    customer_id: 1,
    items: [{ product_id: 2, quantity: 1, price: 250.00 }],
  }, token);
  const o = await r1.json();
  if (!o.order_id) throw new Error('Falha ao criar pedido: ' + JSON.stringify(o));

  const r2 = await req('PUT', `/orders/${o.order_id}/confirm`, null, token);
  const confirmed = await r2.json();
  if (!confirmed.success) throw new Error('Falha ao confirmar: ' + JSON.stringify(confirmed));

  return o.order_id;
}

describe('PICKING', () => {
  let token, orderId, pickingId, firstItemId;

  test('setup: login + pedido confirmado', async () => {
    token   = await getToken();
    orderId = await createConfirmedOrder(token);
    assert.ok(orderId);
  });

  test('GET /picking → 200 lista', async () => {
    const res  = await req('GET', '/picking?page=1&limit=10', null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body));
  });

  test('POST /picking/order/:orderId → 201 cria picking', async () => {
    const res  = await req('POST', `/picking/order/${orderId}`, null, token);
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));
    assert.ok(body.picking_order_id);
    pickingId = body.picking_order_id;
  });

  test('POST /picking/order/:orderId → 409 picking duplicado', async () => {
    const res = await req('POST', `/picking/order/${orderId}`, null, token);
    assert.equal(res.status, 409);
  });

  test('GET /picking/:id → 200 detalha com items', async () => {
    const res  = await req('GET', `/picking/${pickingId}`, null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.length > 0, 'deve ter pelo menos 1 item');
    firstItemId = body.items[0].id;
  });

  test('PATCH /picking/:id/items/:itemId/pick → 200 separa item', async () => {
    const res  = await req(
      'PATCH',
      `/picking/${pickingId}/items/${firstItemId}/pick`,
      { quantity_picked: 1 },
      token
    );
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(body.success);
    assert.ok(['PICKED', 'PARTIAL'].includes(body.status));
  });

  test('PATCH pick → 400 quantidade maior que solicitado', async () => {
    // Cria outro pedido para ter item fresco
    const newOrderId  = await createConfirmedOrder(token);
    const r1          = await req('POST', `/picking/order/${newOrderId}`, null, token);
    const picking     = await r1.json();
    const r2          = await req('GET', `/picking/${picking.picking_order_id}`, null, token);
    const det         = await r2.json();
    const itemId      = det.items[0].id;

    const res = await req(
      'PATCH',
      `/picking/${picking.picking_order_id}/items/${itemId}/pick`,
      { quantity_picked: 99999 },
      token
    );
    assert.equal(res.status, 400);
  });

  test('GET /picking/999999 → 404', async () => {
    const res = await req('GET', '/picking/999999', null, token);
    assert.equal(res.status, 404);
  });
});
