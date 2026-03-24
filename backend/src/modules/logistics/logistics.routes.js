// src/modules/logistics/logistics.routes.js
import { 
    createPurchaseOrder, 
    listPurchaseOrders, 
    createReceivingBatch, 
    listReceivingBatches,
    updateReceivingStatus,
    addConferenceRound
} from './logistics.controller.js';
import { authenticate } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/validators/validate.js';
import {
    createPurchaseOrderLogisticsSchema,
    createReceivingBatchSchema,
    receivingBatchParamsSchema,
    updateReceivingBatchStatusSchema,
    addConferenceRoundSchema
} from '../../shared/validators/schemas.js';

export default async function logisticsRoutes(fastify) {
    const auth = { preHandler: authenticate };

    // Pedidos de Compra
    fastify.post('/purchase-orders', auth, async (req, reply) => {
        req.body = validate(createPurchaseOrderLogisticsSchema, req.body);
        return createPurchaseOrder(req, reply);
    });
    fastify.get('/purchase-orders', auth, listPurchaseOrders);

    // Recebimento
    fastify.post('/receiving/batches', auth, async (req, reply) => {
        req.body = validate(createReceivingBatchSchema, req.body);
        return createReceivingBatch(req, reply);
    });
    fastify.get('/receiving/batches', auth, listReceivingBatches);
    fastify.patch('/receiving/batches/:id/status', auth, async (req, reply) => {
        req.params = validate(receivingBatchParamsSchema, req.params);
        req.body = validate(updateReceivingBatchStatusSchema, req.body);
        return updateReceivingStatus(req, reply);
    });
    
    // Conferência
    fastify.post('/receiving/batches/:id/conference', auth, async (req, reply) => {
        req.params = validate(receivingBatchParamsSchema, req.params);
        req.body = validate(addConferenceRoundSchema, req.body);
        return addConferenceRound(req, reply);
    });
}
