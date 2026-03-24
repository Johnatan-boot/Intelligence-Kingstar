// src/modules/orders/orders.routes.js
import * as service from './orders.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

export default async function ordersRoutes(fastify) {
  const auth = { preHandler: authenticate };

  // GET /orders?page=1&limit=20&status=PENDING&customer_id=1
  fastify.get('/', auth, async (req, reply) => {
    try {
      const { page = 1, limit = 20, status, customer_id } = req.query;
      return reply.send(
        await service.listOrders({
          page: +page, limit: +limit, status,
          customer_id: customer_id ? +customer_id : undefined
        })
      );
    } catch (err) { return handleError(reply, err); }
  });

  // GET /orders/:id
  fastify.get('/:id', auth, async (req, reply) => {
    try { return reply.send(await service.getOrder(+req.params.id)); }
    catch (err) { return handleError(reply, err); }
  });

  // POST /orders
  fastify.post('/', auth, async (req, reply) => {
    try {
      const result = await service.createOrder(req.body);
      return reply.code(201).send(result);
    } catch (err) { return handleError(reply, err); }
  });

  // PUT /orders/:id/confirm
  fastify.put('/:id/confirm', auth, async (req, reply) => {
    try { return reply.send(await service.confirmOrder(+req.params.id)); }
    catch (err) { return handleError(reply, err); }
  });

  // PUT /orders/:id/cancel
  fastify.put('/:id/cancel', auth, async (req, reply) => {
    try { return reply.send(await service.cancelOrder(+req.params.id)); }
    catch (err) { return handleError(reply, err); }
  });
}
