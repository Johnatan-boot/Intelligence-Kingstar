// backend/src/modules/realtime/realtime.routes.js
import { authenticate } from '../../shared/middlewares/auth.js';

export default async function realtimeRoutes(fastify) {
  fastify.get('/stream', async (req, reply) => {
    // EventSource (SSE) setup
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    // Enviar confirmação de conexão
    reply.raw.write('event: connected\ndata: {"status":"online"}\n\n');

    // Manter conexão viva com ping
    const keepAlive = setInterval(() => {
      reply.raw.write(': keep-alive\n\n');
    }, 30000);

    // Escutar eventos do barramento central (Socket.io ou EventEmitter)
    // Aqui usamos o próprio fastify.io se quiser, ou uma lógica SSE simples
    const onKpiUpdate = (data) => {
      reply.raw.write(`event: kpi_update\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const onAlert = (data) => {
      reply.raw.write(`event: stock_alert\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const onSla = (data) => {
      reply.raw.write(`event: sla_alert\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Registrar listeners (exemplo simplificado — em prod usaria um EventEmitter global)
    fastify.io.on('connection', (socket) => {
       // Poderiamos repassar eventos do socket para o SSE se necessário
    });

    req.raw.on('close', () => {
      clearInterval(keepAlive);
    });
  });
}
