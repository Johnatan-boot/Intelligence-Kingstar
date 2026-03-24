// src/modules/users/users.controller.js
import * as service from './users.service.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async list(req, reply) {
    try {
      const { page = 1, limit = 20 } = req.query;
      return reply.send(await service.listUsers({ page: +page, limit: +limit }));
    } catch (err) { return handleError(reply, err); }
  },
  async get(req, reply) {
    try { return reply.send(await service.getUser(+req.params.id)); }
    catch (err) { return handleError(reply, err); }
  },
  async update(req, reply) {
    try { return reply.send(await service.updateUser(+req.params.id, req.body)); }
    catch (err) { return handleError(reply, err); }
  },
  async remove(req, reply) {
    try { return reply.send(await service.deleteUser(+req.params.id)); }
    catch (err) { return handleError(reply, err); }
  },
};
