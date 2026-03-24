// tests/shipments.test.js
// node --test tests/shipments.test.js
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

async function createConfirmedOrder(token) {
  const r1 = await req('POST', '/orders', {
    customer_id: 1,
    items: [{ product_id: 3, quantity: 1, price: 400.00 }],
  }, token);
  const o = await r1.json();
  await req('PUT', `/orders/${o.order_id}/confirm`, null, token);
  return o.order_id;
}

describe('SHIPMENTS', () => {
  let token, orderId, shipmentId;

  test('setup: login + pedido confirmado', async () => {
    token   = await getToken();
    orderId = await createConfirmedOrder(token);
    assert.ok(orderId);
  });

  test('GET /shipments → 200', async () => {
    const res  = await req('GET', '/shipments', null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body));
  });

  test('POST /shipments → 201 cria envio e libera estoque', async () => {
    const res = await req('POST', '/shipments', {
      order_id:           orderId,
      carrier:            'Correios',
      tracking_code:      `BR${Date.now()}`,
      estimated_delivery: '2026-04-01',
    }, token);
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));
    assert.ok(body.shipment_id);
    shipmentId = body.shipment_id;
  });

  test('PATCH /shipments/:id/status → IN_TRANSIT', async () => {
    const res  = await req('PATCH', `/shipments/${shipmentId}/status`, { status: 'IN_TRANSIT' }, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.status, 'IN_TRANSIT');
  });

  test('PATCH /shipments/:id/status → DELIVERED atualiza pedido', async () => {
    const res  = await req('PATCH', `/shipments/${shipmentId}/status`, { status: 'DELIVERED' }, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.status, 'DELIVERED');

    // Confirma que o pedido foi para DELIVERED
    const r2    = await req('GET', `/orders/${orderId}`, null, token);
    const order = await r2.json();
    assert.equal(order.status, 'DELIVERED', 'pedido deveria estar DELIVERED');
  });

  test('PATCH /shipments/:id/status → 400 status inválido', async () => {
    const res = await req('PATCH', `/shipments/${shipmentId}/status`, { status: 'VOANDO' }, token);
    assert.equal(res.status, 400);
  });

  test('POST /shipments → 404 pedido inexistente', async () => {
    const res = await req('POST', '/shipments', { order_id: 999999 }, token);
    assert.equal(res.status, 404);
  });
});
