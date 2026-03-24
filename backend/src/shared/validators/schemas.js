// src/shared/validators/schemas.js
import { z } from 'zod';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const id        = z.coerce.number().int().positive('ID deve ser um número positivo');
const page      = z.coerce.number().int().min(1).default(1);
const limit     = z.coerce.number().int().min(1).max(100).default(20);
const threshold = z.coerce.number().int().min(1).default(5);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name:     z.string().min(2,  'Nome deve ter ao menos 2 caracteres').max(150),
  email:    z.string().email('Email inválido'),
  password: z.string().min(6,  'Senha deve ter ao menos 6 caracteres').max(100),
  role:     z.enum(['admin', 'manager', 'operator']).default('operator'),
});

export const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

// ─── USERS ────────────────────────────────────────────────────────────────────
export const updateUserSchema = z.object({
  name:     z.string().min(2).max(150).optional(),
  role:     z.enum(['admin', 'manager', 'operator']).optional(),
  password: z.string().min(6).max(100).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const userParamsSchema  = z.object({ id });
export const paginationSchema  = z.object({ page, limit });

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
export const createProductSchema = z.object({
  sku:   z.string().min(1).max(50).regex(/^\S+$/, 'SKU não pode ter espaços'),
  name:  z.string().min(2).max(150),
  price: z.number().positive('Preço deve ser positivo'),
});

export const updateProductSchema = z.object({
  name:  z.string().min(2).max(150).optional(),
  price: z.number().positive().optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const productQuerySchema = z.object({
  page,
  limit,
  search: z.string().max(100).default(''),
});

export const productParamsSchema = z.object({ id });

// ─── INVENTORY ────────────────────────────────────────────────────────────────
export const adjustStockSchema = z.object({
  product_id:  id,
  location_id: id,
  quantity:    z.number().int().positive('Quantidade deve ser positiva'),
  type:        z.enum(['IN', 'OUT', 'ADJUST'], { message: 'type deve ser IN, OUT ou ADJUST' }),
  reason:      z.string().max(255).optional(),
});

export const inventoryQuerySchema  = z.object({ page, limit });
export const criticalQuerySchema   = z.object({ threshold });
export const productIdParamsSchema = z.object({ productId: id });

// ─── ORDERS ───────────────────────────────────────────────────────────────────
const orderItemSchema = z.object({
  product_id: id,
  quantity:   z.number().int().positive('Quantidade deve ser positiva'),
  price:      z.number().positive('Preço deve ser positivo'),
});

export const createOrderSchema = z.object({
  customer_id: id,
  items:       z.array(orderItemSchema).min(1, 'Pedido deve ter ao menos 1 item'),
});

export const orderQuerySchema = z.object({
  page,
  limit,
  status:      z.enum(['PENDING','CONFIRMED','CANCELLED','SHIPPED','DELIVERED']).optional(),
  customer_id: z.coerce.number().int().positive().optional(),
});

export const orderParamsSchema = z.object({ id });

// ─── PICKING ──────────────────────────────────────────────────────────────────
export const pickItemSchema = z.object({
  quantity_picked: z.number().int().min(1, 'Quantidade separada deve ser ao menos 1'),
});

export const pickingQuerySchema  = z.object({ page, limit, status: z.string().optional() });
export const pickingParamsSchema = z.object({ id });
export const pickItemParamsSchema = z.object({
  pickingId: id,
  itemId:    id,
});
export const orderIdParamsSchema = z.object({ orderId: id });

// ─── SHIPMENTS ────────────────────────────────────────────────────────────────
export const createShipmentSchema = z.object({
  order_id:           id,
  carrier:            z.string().max(100).optional(),
  tracking_code:      z.string().max(100).optional(),
  estimated_delivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD').optional(),
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum(['PREPARING','SHIPPED','IN_TRANSIT','DELIVERED','FAILED'], {
    message: 'Status deve ser PREPARING, SHIPPED, IN_TRANSIT, DELIVERED ou FAILED',
  }),
});

export const shipmentParamsSchema = z.object({ id });
export const shipmentQuerySchema  = z.object({ page, limit });

// ─── DELIVERIES ───────────────────────────────────────────────────────────────
export const createDeliverySchema = z.object({
  shipment_id:    id,
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD').optional(),
  notes:          z.string().max(500).optional(),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PENDING','IN_TRANSIT','DELIVERED','FAILED','RETURNED'], {
    message: 'Status inválido',
  }),
  notes: z.string().max(500).optional(),
});

export const deliveryParamsSchema = z.object({ id });
export const deliveryQuerySchema  = z.object({
  page,
  limit,
  status: z.enum(['PENDING','IN_TRANSIT','DELIVERED','FAILED','RETURNED']).optional(),
});

// ─── RETURNS ──────────────────────────────────────────────────────────────────
const returnItemSchema = z.object({
  product_id: id,
  quantity:   z.number().int().positive(),
  reason:     z.string().max(255).optional(),
  condition:  z.enum(['GOOD','DAMAGED','EXPIRED']).default('GOOD'),
});

export const createReturnSchema = z.object({
  order_id: id,
  reason:   z.string().max(500).optional(),
  items:    z.array(returnItemSchema).min(1, 'Devolução deve ter ao menos 1 item'),
});

export const rejectReturnSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const returnParamsSchema = z.object({ id });
export const returnQuerySchema  = z.object({
  page,
  limit,
  status: z.enum(['REQUESTED','APPROVED','REJECTED','COMPLETED']).optional(),
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────
export const revenueQuerySchema = z.object({
  period: z.enum(['daily','monthly','custom']).default('daily'),
  start:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(d => {
  if (d.period === 'custom') return !!d.start && !!d.end;
  return true;
}, { message: 'Para period=custom informe start e end (YYYY-MM-DD)' });

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
