// tests/inventory.test.js
// node --test tests/inventory.test.js
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

describe('INVENTORY', () => {
  let token;

  test('setup: login', async () => {
    token = await getToken();
    assert.ok(token);
  });

  test('GET /inventory → 200 lista paginada', async () => {
    const res  = await req('GET', '/inventory?page=1&limit=10', null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body.data));
    assert.ok(typeof body.total === 'number');
    if (body.data.length) {
      const item = body.data[0];
      assert.ok('available' in item, 'falta campo available');
      assert.ok('warehouse'  in item, 'falta campo warehouse');
    }
  });

  test('GET /inventory/product/1 → 200 estoque por produto', async () => {
    const res  = await req('GET', '/inventory/product/1', null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body));
  });

  test('POST /inventory/adjust IN → aumenta estoque', async () => {
    // Produto 2 (Mouse), location_id 1
    const res  = await req('POST', '/inventory/adjust', {
      product_id: 2, location_id: 1, quantity: 10, type: 'IN', reason: 'Teste entrada'
    }, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(body.success);
    assert.ok(typeof body.new_quantity === 'number');
  });

  test('POST /inventory/adjust OUT → diminui estoque', async () => {
    const res  = await req('POST', '/inventory/adjust', {
      product_id: 2, location_id: 1, quantity: 3, type: 'OUT', reason: 'Teste saida'
    }, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(body.success);
  });

  test('POST /inventory/adjust ADJUST → define quantidade exata', async () => {
    const res  = await req('POST', '/inventory/adjust', {
      product_id: 2, location_id: 1, quantity: 50, type: 'ADJUST', reason: 'Inventario fisico'
    }, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.new_quantity, 50);
  });

  test('POST /inventory/adjust → 400 type inválido', async () => {
    const res = await req('POST', '/inventory/adjust', {
      product_id: 1, location_id: 1, quantity: 5, type: 'INVALIDO'
    }, token);
    assert.equal(res.status, 400);
  });

  test('POST /inventory/adjust OUT → 400 estoque insuficiente', async () => {
    const res = await req('POST', '/inventory/adjust', {
      product_id: 2, location_id: 1, quantity: 99999, type: 'OUT'
    }, token);
    assert.equal(res.status, 400);
  });

  test('GET /inventory/critical?threshold=1000 → retorna produtos', async () => {
    const res  = await req('GET', '/inventory/critical?threshold=1000', null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body));
    // Com threshold=1000 quase todos os produtos aparecem
    assert.ok(body.length > 0, 'esperava pelo menos 1 produto com estoque < 1000');
  });
});
