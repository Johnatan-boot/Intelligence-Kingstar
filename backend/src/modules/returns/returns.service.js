// src/modules/returns/returns.service.js
import { db } from '../../shared/database/db.js';
import * as repo from './returns.repository.js';
import { AppError } from '../../shared/utils/errors.js';

export async function listReturns({ page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  return repo.findAll({ limit, offset, status });
}

export async function getReturn(id) {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError('Devolução não encontrada', 404);
  const items = await repo.findItems(id);
  return { ...ret, items };
}

export async function createReturn(data) {
  const { order_id, reason, items } = data;
  if (!items || !items.length) throw new AppError('Devolução sem itens');

  // Validar pedido
  const [orders] = await db.execute(
    "SELECT id, status FROM orders WHERE id = ?", [order_id]
  );
  if (!orders.length)                           throw new AppError('Pedido não encontrado', 404);
  if (!['DELIVERED','SHIPPED'].includes(orders[0].status))
    throw new AppError('Só é possível devolver pedidos entregues ou em trânsito');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const returnId = await repo.insert({ orderId: order_id, reason }, connection);

    for (const item of items) {
      await repo.insertItem({
        returnId,
        productId:  item.product_id,
        quantity:   item.quantity,
        reason:     item.reason,
        condition:  item.condition || 'GOOD',
      }, connection);
    }

    await connection.commit();
    return getReturn(returnId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function approveReturn(id) {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError('Devolução não encontrada', 404);
  if (ret.status !== 'REQUESTED') throw new AppError('Devolução não está em status REQUESTED');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await repo.updateStatus(id, 'APPROVED');

    // Reabastece o estoque para cada item devolvido
    const items = await repo.findItems(id);
    for (const item of items) {
      await connection.execute(
        `UPDATE inventory SET quantity = quantity + ?
         WHERE product_id = ?
         LIMIT 1`,
        [item.quantity, item.product_id]
      );
    }

    await connection.commit();
    return getReturn(id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function rejectReturn(id, reason) {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError('Devolução não encontrada', 404);
  if (ret.status !== 'REQUESTED') throw new AppError('Devolução não pode ser rejeitada neste status');
  await repo.updateStatus(id, 'REJECTED');
  return getReturn(id);
}
