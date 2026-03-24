// src/modules/inventory/inventory.controller.js
import * as service from './inventory.service.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async list(req, reply) {
    try {
      const { page = 1, limit = 20 } = req.query;
      return reply.send(await service.listInventory({ page: +page, limit: +limit }));
    } catch (err) { return handleError(reply, err); }
  },

  async byProduct(req, reply) {
    try {
      return reply.send(await service.getInventoryByProduct(+req.params.productId));
    } catch (err) { return handleError(reply, err); }
  },

  async adjust(req, reply) {
    try {
      return reply.send(await service.adjustStock(req.body));
    } catch (err) { return handleError(reply, err); }
  },

  async critical(req, reply) {
    try {
      const threshold = Number(req.query.threshold) || 5;
      return reply.send(await service.criticalStock(threshold));
    } catch (err) { return handleError(reply, err); }
  },
};
