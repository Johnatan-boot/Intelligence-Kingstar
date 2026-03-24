// src/modules/shipments/shipments.controller.js
import * as service from './shipments.service.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async list(req, reply) {
    try {
      const { page = 1, limit = 20 } = req.query;
      return reply.send(await service.listShipments({ page: +page, limit: +limit }));
    } catch (err) { return handleError(reply, err); }
  },
  async create(req, reply) {
    try {
      return reply.code(201).send(await service.createShipment(req.body));
    } catch (err) { return handleError(reply, err); }
  },
  async updateStatus(req, reply) {
    try {
      return reply.send(await service.updateShipmentStatus(+req.params.id, req.body.status));
    } catch (err) { return handleError(reply, err); }
  },
};
