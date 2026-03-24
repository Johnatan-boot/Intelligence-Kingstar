// src/modules/inventory/inventory.routes.js
import * as service from './inventory.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

export default async function inventoryRoutes(fastify) {
  const auth = { preHandler: authenticate };

  fastify.get('/', auth, async (req, reply) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      return reply.send(await service.listInventory({ page: +page, limit: +limit }));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.get('/product/:productId', auth, async (req, reply) => {
    try {
      return reply.send(await service.getInventoryByProduct(+req.params.productId));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.post('/adjust', auth, async (req, reply) => {
    try {
      return reply.send(await service.adjustStock(req.body));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.get('/movements/:productId', auth, async (req, reply) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      return reply.send(await service.getMovements(+req.params.productId, { page: +page, limit: +limit }));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.get('/critical', auth, async (req, reply) => {
    try {
      const threshold = Number(req.query.threshold) || 5;
      return reply.send(await service.criticalStock(threshold));
    } catch (err) { return handleError(reply, err); }
  });
}
