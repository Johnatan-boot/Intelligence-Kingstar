// src/modules/reports/reports.controller.js
import * as service from './reports.service.js';
import { handleError } from '../../shared/utils/errors.js';

export default {
  async revenue(req, reply) {
    try {
      const { period = 'daily', start, end } = req.query;
      return reply.send(await service.getRevenueSummary({ period, start, end }));
    } catch (err) { return handleError(reply, err); }
  },

  async orderSummary(req, reply) {
    try {
      return reply.send(await service.getOrderStatusSummary());
    } catch (err) { return handleError(reply, err); }
  },

  async criticalInventory(req, reply) {
    try {
      const threshold = Number(req.query.threshold) || 5;
      return reply.send(await service.getCriticalInventory(threshold));
    } catch (err) { return handleError(reply, err); }
  },

  async topProducts(req, reply) {
    try {
      const limit = Number(req.query.limit) || 10;
      return reply.send(await service.getTopProducts(limit));
    } catch (err) { return handleError(reply, err); }
  },

  async dashboard(req, reply) {
    try {
      return reply.send(await service.getDashboard());
    } catch (err) { return handleError(reply, err); }
  },
};
