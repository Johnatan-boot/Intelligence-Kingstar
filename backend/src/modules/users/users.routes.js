// src/modules/users/users.routes.js
import * as service from './users.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

export default async function usersRoutes(fastify) {
  const auth = { preHandler: authenticate };

  fastify.get('/', auth, async (req, reply) => {
    try { return reply.send(await service.listUsers()); }
    catch (err) { return handleError(reply, err); }
  });

  fastify.get('/:id', auth, async (req, reply) => {
    try { return reply.send(await service.getUser(+req.params.id)); }
    catch (err) { return handleError(reply, err); }
  });

  fastify.put('/:id', auth, async (req, reply) => {
    try { return reply.send(await service.updateUser(+req.params.id, req.body)); }
    catch (err) { return handleError(reply, err); }
  });

  fastify.delete('/:id', auth, async (req, reply) => {
    try { return reply.send(await service.deleteUser(+req.params.id)); }
    catch (err) { return handleError(reply, err); }
  });
}
