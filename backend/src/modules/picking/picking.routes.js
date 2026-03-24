// src/modules/picking/picking.routes.js
import * as service from './picking.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

export default async function pickingRoutes(fastify) {
  const auth = { preHandler: authenticate };

  fastify.get('/', auth, async (req, reply) => {
    try {
      const { page = 1, limit = 20, status } = req.query;
      return reply.send(await service.listPickingOrders({ page: +page, limit: +limit, status }));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.get('/:id', auth, async (req, reply) => {
    try {
      return reply.send(await service.getPickingOrder(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  });

  // Criar picking a partir de um pedido
  fastify.post('/order/:orderId', auth, async (req, reply) => {
    try {
      return reply.code(201).send(await service.createPickingOrder(+req.params.orderId));
    } catch (err) { return handleError(reply, err); }
  });

  // Marcar item como separado
  fastify.patch('/:pickingId/items/:itemId/pick', auth, async (req, reply) => {
    try {
      const { quantity_picked } = req.body;
      return reply.send(await service.pickItem(+req.params.pickingId, +req.params.itemId, quantity_picked));
    } catch (err) { return handleError(reply, err); }
  });
}
