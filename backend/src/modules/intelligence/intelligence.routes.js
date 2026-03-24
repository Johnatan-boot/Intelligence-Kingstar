// backend/src/modules/intelligence/intelligence.routes.js
import { authenticate } from '../../shared/middlewares/auth.js';
import { getIntelligenceStatus } from './intelligence.service.js';

export default async function intelligenceRoutes(fastify) {
  fastify.get('/status', { preHandler: authenticate }, async (req, reply) => {
    try {
      const status = await getIntelligenceStatus();
      return reply.send(status);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Erro ao processar inteligência operacional' });
    }
  });

  // Rota para simular disparos de alertas manuais via Socket.io
  fastify.post('/simulate-alert', { preHandler: authenticate }, async (req, reply) => {
    const { title, message, severity } = req.body;
    const alert = { id: Date.now(), title, message, severity, timestamp: new Date() };
    
    // Emitir via Socket.io global
    fastify.io.emit('stock_alert', alert);
    fastify.io.emit('kpi_update', { alerts_count: 1 });
    
    return reply.send({ success: true, alert });
  });
}
