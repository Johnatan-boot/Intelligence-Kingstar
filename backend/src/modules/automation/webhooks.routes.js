// src/modules/automation/webhooks.routes.js
import { authenticate } from '../../shared/middlewares/auth.js';
import { handleError } from '../../shared/utils/errors.js';

const hooks = new Map();
const EVENTS = ['order.confirmed','order.cancelled','order.delivered','shipment.created','shipment.delivered','stock.critical','return.requested','picking.completed'];

export async function dispatchEvent(event, payload) {
  const list = hooks.get(event) ?? [];
  await Promise.allSettled(list.map(({ url }) => fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ event, data: payload, ts: new Date().toISOString() }) })));
}

export default async function automationRoutes(fastify) {
  const auth = { preHandler: authenticate };
  fastify.get('/events', auth, async (req, reply) => reply.send({ events: EVENTS }));
  fastify.get('/webhooks', auth, async (req, reply) => { const l = []; for (const [e, ws] of hooks) ws.forEach(w => l.push({ event: e, url: w.url })); return reply.send(l); });
  fastify.post('/webhooks', auth, async (req, reply) => {
    try {
      const { event, url } = req.body;
      if (!EVENTS.includes(event)) return reply.code(400).send({ error: 'Evento inválido' });
      if (!url?.startsWith('http')) return reply.code(400).send({ error: 'URL inválida' });
      const list = hooks.get(event) ?? []; list.push({ url }); hooks.set(event, list);
      return reply.code(201).send({ success: true, event, url });
    } catch (err) { return handleError(reply, err); }
  });
  fastify.decorate('dispatchEvent', dispatchEvent);
}
