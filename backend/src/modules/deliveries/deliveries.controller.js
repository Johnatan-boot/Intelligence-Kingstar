// src/modules/deliveries/deliveries.controller.js
import * as service from './deliveries.service.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async list(req, reply) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      return reply.send(await service.listDeliveries({ page: +page, limit: +limit, status }));
    } catch (err) { return handleError(reply, err); }
  },

  async get(req, reply) {
    try {
      return reply.send(await service.getDelivery(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  },

  async create(req, reply) {
    try {
      return reply.code(201).send(await service.createDelivery(req.body));
    } catch (err) { return handleError(reply, err); }
  },

  async updateStatus(req, reply) {
    try {
      return reply.send(await service.updateDeliveryStatus(+req.params.id, req.body));
    } catch (err) { return handleError(reply, err); }
  },
};
