// src/modules/logistics/logistics.controller.js
import * as service from './logistics.service.js';

export async function createPurchaseOrder(req, reply) {
    const order = await service.createPurchaseOrder(req.body, req.server.io);
    return reply.code(201).send(order);
}

export async function listPurchaseOrders(req, reply) {
    const orders = await service.listPurchaseOrders();
    return reply.send(orders);
}

export async function createReceivingBatch(req, reply) {
    const batch = await service.createReceivingBatch(req.body, req.server.io);
    return reply.code(201).send(batch);
}

export async function listReceivingBatches(req, reply) {
    const batches = await service.listReceivingBatches();
    return reply.send(batches);
}

export async function updateReceivingStatus(req, reply) {
    const { id } = req.params;
    const { status } = req.body;
    await service.updateReceivingStatus(id, status, req.server.io);
    return reply.code(204).send();
}

export async function addConferenceRound(req, reply) {
    const { id } = req.params;
    const result = await service.addConferenceRound(id, req.body, req.server.io);
    return reply.send(result);
}
