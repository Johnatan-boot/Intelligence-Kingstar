import * as service      from './reports.service.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError }  from '../../shared/utils/errors.js';

export default async function reportsRoutes(fastify) {
  const auth = { preHandler: authenticate };

  // GET /reports/dashboard
  fastify.get('/dashboard', auth, async (req, reply) => {
    try { return reply.send(await service.getDashboard()); }
    catch (err) { return handleError(reply, err); }
  });

  // GET /reports/orders/summary
  fastify.get('/orders/summary', auth, async (req, reply) => {
    try { return reply.send(await service.getOrderStatusSummary()); }
    catch (err) { return handleError(reply, err); }
  });

  // GET /reports/products/top?limit=5
  fastify.get('/products/top', auth, async (req, reply) => {
    try { 
      const limit = Number(req.query.limit) || 10;
      return reply.send(await service.getTopProducts(limit)); 
    }
    catch (err) { return handleError(reply, err); }
  });

  // GET /reports/revenue?period=daily
  fastify.get('/revenue', auth, async (req, reply) => {
    try {
      const { period = 'daily', start, end } = req.query;
      return reply.send(await service.getRevenueSummary({ period, start, end }));
    } catch (err) { return handleError(reply, err); }
  });

  // GET /reports/inventory/critical
  fastify.get('/inventory/critical', auth, async (req, reply) => {
    try {
      const threshold = Number(req.query.threshold) || 5;
      return reply.send(await service.getCriticalInventory(threshold));
    } catch (err) { return handleError(reply, err); }
  });
}
