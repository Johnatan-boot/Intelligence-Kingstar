// tests/products.test.js
// node --test tests/products.test.js
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

describe('PRODUCTS', () => {
  let token, createdId;
  const sku = `SKU-TEST-${Date.now()}`;

  test('setup: login', async () => {
    token = await getToken();
    assert.ok(token);
  });

  test('GET /products → 200 lista paginada', async () => {
    const res  = await req('GET', '/products?page=1&limit=5', null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body.data));
    assert.ok(typeof body.total === 'number');
  });

  test('GET /products?search=Notebook → filtra resultados', async () => {
    const res  = await req('GET', '/products?search=Notebook', null, token);
    const body = await res.json();
    assert.equal(res.status, 200);
    // Pode retornar 0 ou mais, só valida estrutura
    assert.ok(Array.isArray(body.data));
  });

  test('POST /products → 201 cria produto', async () => {
    const res  = await req('POST', '/products', { sku, name: 'Produto Teste', price: 99.90 }, token);
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));
    assert.ok(body.id, 'id ausente');
    assert.equal(body.sku, sku);
    createdId = body.id;
  });

  test('POST /products → 409 SKU duplicado', async () => {
    const res = await req('POST', '/products', { sku, name: 'Dup', price: 1 }, token);
    assert.equal(res.status, 409);
  });

  test('POST /products → 400 sem campos obrigatórios', async () => {
    const res = await req('POST', '/products', { name: 'Sem SKU' }, token);
    assert.equal(res.status, 400);
  });

  test('GET /products/:id → 200', async () => {
    const res  = await req('GET', `/products/${createdId}`, null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.id, createdId);
    assert.ok('available_stock' in body, 'falta available_stock');
  });

  test('PUT /products/:id → 200 atualiza', async () => {
    const res  = await req('PUT', `/products/${createdId}`, { name: 'Produto Atualizado', price: 149.90 }, token);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.name, 'Produto Atualizado');
  });

  test('DELETE /products/:id → 200 exclui', async () => {
    const res  = await req('DELETE', `/products/${createdId}`, null, token);
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.ok(body.success);
  });

  test('GET /products/999999 → 404', async () => {
    const res = await req('GET', '/products/999999', null, token);
    assert.equal(res.status, 404);
  });

  test('GET /products → 401 sem token', async () => {
    const res = await fetch(`${BASE}/products`);
    assert.equal(res.status, 401);
  });
});
