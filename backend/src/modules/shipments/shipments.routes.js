// src/modules/shipments/shipments.routes.js
import * as service from './shipments.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

export default async function shipmentsRoutes(fastify) {
  const auth = { preHandler: authenticate };

  fastify.get('/', auth, async (req, reply) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      return reply.send(await service.listShipments({ page: +page, limit: +limit }));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.post('/', auth, async (req, reply) => {
    try {
      return reply.code(201).send(await service.createShipment(req.body));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.patch('/:id/status', auth, async (req, reply) => {
    try {
      const { status } = req.body;
      return reply.send(await service.updateShipmentStatus(+req.params.id, status));
    } catch (err) { return handleError(reply, err); }
  });
}
