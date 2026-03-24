// src/modules/advisor/advisor.routes.js
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError, AppError } from '../../shared/utils/errors.js';

const SYSTEM = `Você é o KINGSTAR I.O Advisor — IA operacional do sistema KINGSTAR WMS.
Responda em português, de forma concisa e profissional.
Conhecimentos: logística, WMS, estoque, picking, shipments, KPIs, curva ABC, OTIF.`;

function fallback(msg) {
  const p = msg.toLowerCase();
  if (p.includes('ruptura') || p.includes('crítico')) return '⚠️ Verifique Estoque → Críticos. SKUs abaixo do mínimo precisam reposição urgente.';
  if (p.includes('picking')) return '📋 Acesse Picking para ver ordens abertas. Confirme pedidos em Pedidos → CONFIRMAR antes de criar picking.';
  if (p.includes('pedido') || p.includes('order')) return '🛒 Fluxo: criar pedido → confirmar → picking → shipment → entregue.';
  if (p.includes('faturamento') || p.includes('receita')) return '📊 Veja Relatórios para dados de faturamento diário e mensal.';
  return '🤖 KINGSTAR Advisor online. Posso ajudar com estoque, pedidos, picking, shipments e relatórios.';
}

export default async function advisorRoutes(fastify) {
  fastify.post('/chat', { preHandler: authenticate }, async (req, reply) => {
    try {
      const { messages } = req.body;
      if (!messages?.length) throw new AppError('messages obrigatório', 400);
      const last = messages[messages.length - 1]?.content ?? '';
      const key = process.env.ANTHROPIC_API_KEY;
      if (key) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, system: SYSTEM, messages: messages.slice(-8).map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.content })) }),
        });
        if (res.ok) {
          const data = await res.json();
          return reply.send({ response: data.content?.[0]?.text ?? fallback(last), source: 'claude' });
        }
      }
      return reply.send({ response: fallback(last), source: 'fallback' });
    } catch (err) { return handleError(reply, err); }
  });

  fastify.get('/status', { preHandler: authenticate }, async (req, reply) => {
    return reply.send({ status: process.env.ANTHROPIC_API_KEY ? 'online' : 'fallback', model: 'claude-haiku-4-5-20251001' });
  });
}
