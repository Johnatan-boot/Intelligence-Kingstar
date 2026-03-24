// src/modules/products/products.controller.js
import * as service from './products.service.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async list(req, reply) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      return reply.send(await service.listProducts({ page: +page, limit: +limit, search }));
    } catch (err) { return handleError(reply, err); }
  },

  async get(req, reply) {
    try {
      return reply.send(await service.getProduct(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  },

  async create(req, reply) {
    try {
      return reply.code(201).send(await service.createProduct(req.body));
    } catch (err) { return handleError(reply, err); }
  },

  async update(req, reply) {
    try {
      return reply.send(await service.updateProduct(+req.params.id, req.body));
    } catch (err) { return handleError(reply, err); }
  },

  async remove(req, reply) {
    try {
      return reply.send(await service.deleteProduct(+req.params.id));
    } catch (err) { return handleError(reply, err); }
  },
};