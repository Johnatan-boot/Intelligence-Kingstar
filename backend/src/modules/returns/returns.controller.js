// src/modules/returns/returns.controller.js
import * as service from './returns.service.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async list(req, reply) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      return reply.send(await service.listReturns({ page: +page, limit: +limit, status }));
    } catch (err) { return handleError(reply, err); }
  },

  async get(req, reply) {
    try {
      return reply.send(await service.getReturn(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  },

  async create(req, reply) {
    try {
      return reply.code(201).send(await service.createReturn(req.body));
    } catch (err) { return handleError(reply, err); }
  },

  async approve(req, reply) {
    try {
      return reply.send(await service.approveReturn(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  },

  async reject(req, reply) {
    try {
      const { reason } = req.body || {};
      return reply.send(await service.rejectReturn(+req.params.id, reason));
    } catch (err) { return handleError(reply, err); }
  },
};
