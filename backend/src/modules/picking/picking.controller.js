// src/modules/picking/picking.controller.js
import * as service from './picking.service.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async list(req, reply) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      return reply.send(await service.listPickingOrders({ page: +page, limit: +limit, status }));
    } catch (err) { return handleError(reply, err); }
  },

  async get(req, reply) {
    try {
      return reply.send(await service.getPickingOrder(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  },

  async create(req, reply) {
    try {
      return reply.code(201).send(await service.createPickingOrder(+req.params.orderId));
    } catch (err) { return handleError(reply, err); }
  },

  async pickItem(req, reply) {
    try {
      const { quantity_picked } = req.body;
      return reply.send(
        await service.pickItem(+req.params.pickingId, +req.params.itemId, quantity_picked)
      );
    } catch (err) { return handleError(reply, err); }
  },
};
