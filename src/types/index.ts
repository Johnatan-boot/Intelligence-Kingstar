/**
 * KINGSTAR · IO — TypeScript Types
 * Interfaces espelhando os modelos do backend Fastify.
 * Mantém contrato entre frontend e API.
 */

/* ─── AUTH ───────────────────────────────────────────────── */
export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'manager' | 'operator'
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

/* ─── PRODUCT ────────────────────────────────────────────── */
export interface Product {
  id: number
  sku: string
  name: string
  price: number
  total_stock: number
  reserved_stock: number
  available_stock: number
  created_at: string
}

/* ─── INVENTORY ──────────────────────────────────────────── */
export interface InventoryItem {
  id: number
  product_id: number
  product_name: string
  sku: string
  warehouse: string
  location_code: string
  quantity: number
  reserved_quantity: number
  available: number
}

export interface CriticalStockItem {
  product_id: number
  name: string
  sku: string
  total_qty: number
  reserved: number
  available: number
}

/* ─── ORDER ──────────────────────────────────────────────── */
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'SHIPPED' | 'DELIVERED'

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  sku: string
  quantity: number
  price: number
  subtotal: number
}

export interface Order {
  id: number
  customer_id: number
  customer_name: string
  customer_email: string
  status: OrderStatus
  total: number
  item_count: number
  created_at: string
  items?: OrderItem[]
}

/* ─── PICKING ────────────────────────────────────────────── */
export type PickingStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type PickItemStatus = 'PENDING' | 'PARTIAL' | 'PICKED'

export interface PickingItem {
  id: number
  product_id: number
  product_name: string
  sku: string
  location_code: string
  quantity_requested: number
  quantity_picked: number
  status: PickItemStatus
}

export interface PickingOrder {
  id: number
  order_id: number
  customer_name: string
  status: PickingStatus
  created_at: string
  items?: PickingItem[]
}

/* ─── SHIPMENT ───────────────────────────────────────────── */
export type ShipmentStatus = 'PREPARING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'

export interface Shipment {
  id: number
  order_id: number
  customer_name: string
  carrier: string | null
  tracking_code: string | null
  status: ShipmentStatus
  estimated_delivery: string | null
  created_at: string
}

/* ─── REPORTS / CORE ─────────────────────────────────────── */
export interface Dashboard {
  total_orders: number
  total_revenue: number
  pending_orders: number
  low_stock_products: number
  active_shipments: number
}

export interface OrderSummaryItem {
  status: OrderStatus
  count: number
  total_value: number
}

export interface TopProduct {
  id: number
  name: string
  sku: string
  units_sold: number
  revenue: number
}

/* ─── PAGINATION ─────────────────────────────────────────── */
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

/* ─── API ERROR ──────────────────────────────────────────── */
export interface ApiError {
  error: string
}
