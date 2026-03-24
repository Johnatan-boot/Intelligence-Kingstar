// src/modules/products/products.routes.js
import * as service from './products.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

export default async function productsRoutes(fastify) {
  const auth = { preHandler: authenticate };

  fastify.get('/', auth, async (req, reply) => {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      return reply.send(await service.listProducts({ page: +page, limit: +limit, search }));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.get('/:id', auth, async (req, reply) => {
    try {
      return reply.send(await service.getProduct(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.post('/', auth, async (req, reply) => {
    try {
      return reply.code(201).send(await service.createProduct(req.body));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.put('/:id', auth, async (req, reply) => {
    try {
      return reply.send(await service.updateProduct(+req.params.id, req.body));
    } catch (err) { return handleError(reply, err); }
  });

  fastify.delete('/:id', auth, async (req, reply) => {
    try {
      return reply.send(await service.deleteProduct(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  });
}
