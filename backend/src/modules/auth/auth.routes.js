// src/modules/auth/auth.routes.js
import * as service from './auth.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

export default async function authRoutes(fastify) {
  // POST /auth/register
  fastify.post('/register', async (req, reply) => {
    try {
      const user = await service.register(req.body);
      return reply.code(201).send({ success: true, user });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  // POST /auth/login
  fastify.post('/login', async (req, reply) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return reply.code(400).send({ error: 'Email e senha obrigatórios' });
      }
      const result = await service.login(email, password, fastify);
      return reply.send(result);
    } catch (err) {
      return handleError(reply, err);
    }
  });

  // GET /auth/me
  fastify.get('/me', { preHandler: authenticate }, async (req, reply) => {
    try {
      const user = await service.me(req.user.id);
      return reply.send(user);
    } catch (err) {
      return handleError(reply, err);
    }
  });
}
