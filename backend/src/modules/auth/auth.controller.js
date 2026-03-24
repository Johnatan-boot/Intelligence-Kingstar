// src/modules/auth/auth.controller.js
import * as service from './auth.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async register(req, reply) {
    try {
      const user = await service.register(req.body);
      return reply.code(201).send({ success: true, user });
    } catch (err) { return handleError(reply, err); }
  },

  async login(req, reply) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return reply.code(400).send({ error: 'email e password obrigatórios' });
      const result = await service.login(email, password, req.server);
      return reply.send(result);
    } catch (err) { return handleError(reply, err); }
  },

  async me(req, reply) {
    try {
      await authenticate(req, reply);
      if (reply.sent) return;
      return reply.send(await service.me(req.user.id));
    } catch (err) { return handleError(reply, err); }
  },
};
