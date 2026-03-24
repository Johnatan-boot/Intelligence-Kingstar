// src/modules/logistics/logistics.routes.js
import { 
    createPurchaseOrder, 
    listPurchaseOrders, 
    createReceivingBatch, 
    listReceivingBatches,
    updateReceivingStatus,
    addConferenceRound
} from './logistics.controller.js';

export default async function logisticsRoutes(fastify) {
    // Pedidos de Compra
    fastify.post('/purchase-orders', createPurchaseOrder);
    fastify.get('/purchase-orders', listPurchaseOrders);

    // Recebimento
    fastify.post('/receiving/batches', createReceivingBatch);
    fastify.get('/receiving/batches', listReceivingBatches);
    fastify.patch('/receiving/batches/:id/status', updateReceivingStatus);
    
    // Conferência
    fastify.post('/receiving/batches/:id/conference', addConferenceRound);
}
