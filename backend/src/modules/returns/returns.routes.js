// src/modules/returns/returns.routes.js
import controller from './returns.controller.js';
import { authenticate } from '../../shared/middlewares/auth.js';

export default async function returnsRoutes(fastify) {
  const auth = { preHandler: authenticate };

  fastify.get('/',              auth, controller.list);      // Listar devoluções
  fastify.get('/:id',           auth, controller.get);       // Detalhar com itens
  fastify.post('/',             auth, controller.create);    // Solicitar devolução
  fastify.patch('/:id/approve', auth, controller.approve);   // Aprovar + reabastecer estoque
  fastify.patch('/:id/reject',  auth, controller.reject);    // Rejeitar
}
