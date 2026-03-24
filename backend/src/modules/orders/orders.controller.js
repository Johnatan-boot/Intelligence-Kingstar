import * as service from "./orders.service.js";

export default {
  // ✅ CRIAR PEDIDO
  async create(req, reply) {
    try {
      const result = await service.createOrder(req.body);
      // ✅ retornar order_id e total
      return reply.code(201).send({
        success: true,
        order_id: result.order_id,
        total: result.total
      });
    } catch (err) {
      console.log("ERRO REAL:", err);
      return reply.code(400).send({ error: err.message });
    }
  },

  // ✅ LISTAR PEDIDOS
  async list(req, reply) {
    try {
      const orders = await service.listOrders();
      return reply.send(orders);
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  },

  // ❗ CANCELAR PEDIDO
  async cancel(req, reply) {
    try {
      const { id } = req.params;
      const result = await service.cancelOrder(id);
      return reply.send(result);
    } catch (err) {
      req.log.error(err);
      return reply.code(400).send({ error: err.message });
    }
  }
};