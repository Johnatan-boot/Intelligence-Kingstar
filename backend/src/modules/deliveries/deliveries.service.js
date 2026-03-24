// src/modules/deliveries/deliveries.service.js
import { db } from '../../shared/database/db.js';
import * as repo from './deliveries.repository.js';
import { AppError } from '../../shared/utils/errors.js';

export async function listDeliveries({ page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  const rows   = await repo.findAll({ limit, offset, status });
  return rows;
}

export async function getDelivery(id) {
  const delivery = await repo.findById(id);
  if (!delivery) throw new AppError('Entrega não encontrada', 404);
  return delivery;
}

export async function createDelivery(data) {
  const { shipment_id, scheduled_date, notes } = data;

  // Verificar se shipment existe
  const [shipments] = await db.execute(
    'SELECT id, status FROM shipments WHERE id = ?', [shipment_id]
  );
  if (!shipments.length) throw new AppError('Shipment não encontrado', 404);

  // Evitar duplicata
  const existing = await repo.findByShipment(shipment_id);
  if (existing) throw new AppError('Entrega já criada para este shipment', 409);

  const id = await repo.insert({ shipmentId: shipment_id, scheduledDate: scheduled_date, notes });
  return getDelivery(id);
}

export async function updateDeliveryStatus(id, { status, notes }) {
  const valid = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'];
  if (!valid.includes(status)) throw new AppError('Status inválido');

  const delivery = await repo.findById(id);
  if (!delivery) throw new AppError('Entrega não encontrada', 404);

  await repo.updateStatus(id, status, notes);

  // Ao entregar, atualizar shipment e order
  if (status === 'DELIVERED') {
    await db.execute("UPDATE shipments SET status = 'DELIVERED' WHERE id = ?", [delivery.shipment_id]);
    await db.execute("UPDATE orders SET status = 'DELIVERED' WHERE id = ?",    [delivery.order_id]);
  }

  return getDelivery(id);
}
