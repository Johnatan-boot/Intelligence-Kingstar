/**
 * KINGSTAR · IO — API Service
 * Wrapper centralizado do Axios.
 * Todas as chamadas da aplicação passam por aqui.
 *
 * Padrão: uma instância axios com interceptors de request/response.
 * - Request: injeta token JWT automaticamente
 * - Response: extrai data / captura erros globalmente
 */
import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'

/* Cria instância com base URL vinda do Vite proxy (/api → localhost:3000) */
const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

/* ── Interceptor REQUEST ─────────────────────────────────── */
/* Injeta "Authorization: Bearer <token>" em toda requisição */
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* ── Interceptor RESPONSE ────────────────────────────────── */
/* 401 → logout automático. Outros erros → re-throw formatado */
http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error: string }>) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    const message = err.response?.data?.error ?? err.message
    return Promise.reject(new Error(message))
  }
)

/* ── Endpoints AUTH ──────────────────────────────────────── */
export const authApi = {
  login:    (data: { email: string; password: string }) =>
              http.post('/auth/login', data).then(r => r.data),
  register: (data: { name: string; email: string; password: string; role?: string }) =>
              http.post('/auth/register', data).then(r => r.data),
  me:       () => http.get('/auth/me').then(r => r.data),
}

/* ── Endpoints CORE (Reports/Dashboard) ─────────────────── */
export const coreApi = {
  dashboard:    () => http.get('/reports/dashboard').then(r => r.data),
  revenue:      (period = 'daily') => http.get(`/reports/revenue?period=${period}`).then(r => r.data),
  orderSummary: () => http.get('/reports/orders/summary').then(r => r.data),
  topProducts:  (limit = 10) => http.get(`/reports/products/top?limit=${limit}`).then(r => r.data),
}

/* ── Endpoints PRODUCTS ──────────────────────────────────── */
export const productsApi = {
  list:   (params?: { page?: number; limit?: number; search?: string }) =>
            http.get('/products', { params }).then(r => r.data),
  get:    (id: number) => http.get(`/products/${id}`).then(r => r.data),
  create: (data: unknown) => http.post('/products', data).then(r => r.data),
  update: (id: number, data: unknown) => http.put(`/products/${id}`, data).then(r => r.data),
  remove: (id: number) => http.delete(`/products/${id}`).then(r => r.data),
}

/* ── Endpoints INVENTORY ─────────────────────────────────── */
export const inventoryApi = {
  list:      (params?: { page?: number; limit?: number }) =>
               http.get('/inventory', { params }).then(r => r.data),
  byProduct: (productId: number) =>
               http.get(`/inventory/product/${productId}`).then(r => r.data),
  adjust:    (data: { product_id: number; location_id: number; quantity: number; type: string; reason?: string }) =>
               http.post('/inventory/adjust', data).then(r => r.data),
  critical:  (threshold = 5) =>
               http.get(`/inventory/critical?threshold=${threshold}`).then(r => r.data),
}

/* ── Endpoints ORDERS ────────────────────────────────────── */
export const ordersApi = {
  list:    (params?: { page?: number; limit?: number; status?: string }) =>
             http.get('/orders', { params }).then(r => r.data),
  get:     (id: number) => http.get(`/orders/${id}`).then(r => r.data),
  create:  (data: unknown) => http.post('/orders', data).then(r => r.data),
  confirm: (id: number) => http.put(`/orders/${id}/confirm`).then(r => r.data),
  cancel:  (id: number) => http.put(`/orders/${id}/cancel`).then(r => r.data),
}

/* ── Endpoints PICKING ───────────────────────────────────── */
export const pickingApi = {
  list:      (params?: { page?: number; limit?: number; status?: string }) =>
               http.get('/picking', { params }).then(r => r.data),
  get:       (id: number) => http.get(`/picking/${id}`).then(r => r.data),
  create:    (orderId: number) => http.post(`/picking/order/${orderId}`).then(r => r.data),
  pickItem:  (pickingId: number, itemId: number, qty: number) =>
               http.patch(`/picking/${pickingId}/items/${itemId}/pick`, { quantity_picked: qty }).then(r => r.data),
}

/* ── Endpoints SHIPMENTS ─────────────────────────────────── */
export const shipmentsApi = {
  list:         (params?: { page?: number }) =>
                  http.get('/shipments', { params }).then(r => r.data),
  create:       (data: unknown) => http.post('/shipments', data).then(r => r.data),
  updateStatus: (id: number, status: string) =>
                  http.patch(`/shipments/${id}/status`, { status }).then(r => r.data),
}

export default http

/* ── Endpoints REALTIME ──────────────────────────────────────── */
export const realtimeApi = {
  status: () => http.get('/realtime/status').then(r => r.data),
  driverLocation: (data: unknown) => http.post('/realtime/driver', data).then(r => r.data),
}

/* ── Endpoints INTELLIGENCE ──────────────────────────────────── */
export const intelligenceApi = {
  dashboard:  () => http.get('/intelligence/dashboard').then(r => r.data),
  ruptura:    () => http.get('/intelligence/ruptura').then(r => r.data),
  sla:        () => http.get('/intelligence/sla').then(r => r.data),
  score:      () => http.get('/intelligence/score').then(r => r.data),
  run:        () => http.post('/intelligence/run').then(r => r.data),
}

/* ── Endpoints WHATSAPP ──────────────────────────────────────── */
export const whatsappApi = {
  status:    () => http.get('/whatsapp/status').then(r => r.data),
  send:      (data: unknown) => http.post('/whatsapp/send', data).then(r => r.data),
  test:      (phone: string) => http.post('/whatsapp/test', { phone }).then(r => r.data),
  templates: () => http.get('/whatsapp/templates').then(r => r.data),
}
