// src/modules/deliveries/deliveries.routes.js
import controller from './deliveries.controller.js';
import { authenticate } from '../../shared/middlewares/auth.js';

export default async function deliveriesRoutes(fastify) {
  const auth = { preHandler: authenticate };

  fastify.get('/',              auth, controller.list);
  fastify.get('/:id',           auth, controller.get);
  fastify.post('/',             auth, controller.create);
  fastify.patch('/:id/status',  auth, controller.updateStatus);
}
