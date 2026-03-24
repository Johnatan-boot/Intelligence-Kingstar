// src/app.js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import socketio from 'fastify-socket.io';
import dotenv from 'dotenv';

import authRoutes      from './modules/auth/auth.routes.js';
import usersRoutes     from './modules/users/users.routes.js';
import productsRoutes  from './modules/products/products.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import ordersRoutes    from './modules/orders/orders.routes.js';
import pickingRoutes   from './modules/picking/picking.routes.js';
import shipmentsRoutes  from './modules/shipments/shipments.routes.js';
import deliveriesRoutes from './modules/deliveries/deliveries.routes.js';
import returnsRoutes    from './modules/returns/returns.routes.js';
import reportsRoutes    from './modules/reports/reports.routes.js';
import advisorRoutes    from './modules/advisor/advisor.routes.js';
import automationRoutes from './modules/automation/webhooks.routes.js';
import logisticsRoutes  from './modules/logistics/logistics.routes.js';
import intelligenceRoutes from './modules/intelligence/intelligence.routes.js';
import realtimeRoutes from './modules/realtime/realtime.routes.js';


dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'kingstar_secret_troque_em_producao')) {
  throw new Error('JWT_SECRET forte é obrigatório em produção');
}

/* Atrás de Cloudflare / load balancer: IP real e rate limit corretos */
const trustProxy = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';

const app = Fastify({
  trustProxy,
  logger: {
    transport: !isProd
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        }
      : undefined,
  },
});

// ── Plugins ──────────────────────────────────────────────────────────────────
await app.register(helmet, {
  global: true,
  contentSecurityPolicy: isProd ? undefined : false,
});
await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  allowList: (req) => req.ip === '127.0.0.1' || req.ip === '::1',
  keyGenerator: (req) => (trustProxy && req.headers['cf-connecting-ip']) ? String(req.headers['cf-connecting-ip']) : req.ip,
});
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || !isProd) return cb(null, true);
    if (!allowedOrigins.length) return cb(null, false);
    return cb(null, allowedOrigins.includes(origin));
  },
  credentials: true
});
await app.register(socketio, {
  cors: { origin: !isProd ? true : allowedOrigins }
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'kingstar_secret_troque_em_producao',
});

if (!isProd) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: { title: 'KINGSTAR WMS API', description: 'Sistema de Gestão de Armazém', version: '2.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });
}

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', { logLevel: 'silent' }, async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '2.0.0',
}));

// ── Rotas ────────────────────────────────────────────────────────────────────
app.register(authRoutes,      { prefix: '/auth' });
app.register(usersRoutes,     { prefix: '/users' });
app.register(productsRoutes,  { prefix: '/products' });
app.register(inventoryRoutes, { prefix: '/inventory' });
app.register(ordersRoutes,    { prefix: '/orders' });
app.register(pickingRoutes,   { prefix: '/picking' });
app.register(shipmentsRoutes,  { prefix: '/shipments' });
app.register(deliveriesRoutes, { prefix: '/deliveries' });
app.register(returnsRoutes,    { prefix: '/returns' });
app.register(reportsRoutes,    { prefix: '/reports' });
app.register(logisticsRoutes,  { prefix: '/logistics' });
app.register(intelligenceRoutes, { prefix: '/intelligence' });
app.register(realtimeRoutes, { prefix: '/realtime' });
app.register(advisorRoutes,    { prefix: '/advisor' });
app.register(automationRoutes, { prefix: '/automation' });

// ── Erro Global ───────────────────────────────────────────────────────────────
app.setErrorHandler((err, req, reply) => {
  app.log.error(err);
  const code = err.statusCode || 500;
  reply.code(code).send({ error: err.message || 'Erro interno do servidor' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
    console.log(`\n🚀  http://localhost:${process.env.PORT || 3001}`);
    console.log(`📚  Swagger: http://localhost:${process.env.PORT || 3001}/docs`);
    console.log(`💚  Health:  http://localhost:${process.env.PORT || 3001}/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();




