// tests/reports.test.js
// node --test tests/reports.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:3000';
const req  = (method, path, token) =>
  fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

async function getToken() {
  const res  = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: 'admin@kingstar.com', password: 'admin123' }),
  });
  const body = await res.json();
  if (!body.token) throw new Error('Login falhou: ' + JSON.stringify(body));
  return body.token;
}

describe('REPORTS', () => {
  let token;

  test('setup: login', async () => {
    token = await getToken();
    assert.ok(token);
  });

  test('GET /reports/revenue?period=daily → 200', async () => {
    const res  = await req('GET', '/reports/revenue?period=daily', token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok('revenue' in body, 'falta campo revenue');
    assert.ok('order_count' in body, 'falta campo order_count');
  });

  test('GET /reports/revenue?period=monthly → 200', async () => {
    const res  = await req('GET', '/reports/revenue?period=monthly', token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.period, 'monthly');
  });

  test('GET /reports/orders/summary → 200 array por status', async () => {
    const res  = await req('GET', '/reports/orders/summary', token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body), 'deve ser array');
    if (body.length) {
      assert.ok('status'      in body[0], 'falta campo status');
      assert.ok('count'       in body[0], 'falta campo count');
      assert.ok('total_value' in body[0], 'falta campo total_value');
    }
  });

  test('GET /reports/inventory/critical → 200', async () => {
    const res  = await req('GET', '/reports/inventory/critical?threshold=1000', token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body));
  });

  test('GET /reports/revenue → 401 sem token', async () => {
    const res = await fetch(`${BASE}/reports/revenue`);
    assert.equal(res.status, 401);
  });
});
