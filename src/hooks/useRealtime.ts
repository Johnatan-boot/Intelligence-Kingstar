/**
 * useRealtime — Hook SSE para atualizações em tempo real
 *
 * Conecta ao endpoint GET /api/realtime/stream via EventSource (SSE).
 * Sem WebSocket: SSE é suficiente para push unidirecional do servidor,
 * mais simples, sem dependências extras.
 *
 * Eventos recebidos:
 *   kpi_update      → atualiza KPIs sem reload
 *   order_update    → atualiza lista de pedidos
 *   stock_alert     → alerta de estoque crítico
 *   sla_alert       → alerta de SLA em risco
 *   score_update    → score operacional
 *   driver_location → posição do entregador (mapa)
 *
 * Uso:
 *   const { connected, lastEvent, alerts } = useRealtime()
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/notificationStore'

export interface RealtimeAlert {
  id:        string
  type:      'stock_alert' | 'sla_alert' | 'score_update' | 'order_update'
  title:     string
  message:   string
  severity:  'info' | 'warning' | 'critical'
  timestamp: number
  data:      unknown
}

interface RealtimeState {
  connected:   boolean
  lastEvent:   string | null
  alerts:      RealtimeAlert[]
  score:       number | null
  kpis:        Record<string, unknown> | null
  driverPos:   { lat: number; lng: number; id: string; name: string } | null
  clearAlerts: () => void
}

export function useRealtime(): RealtimeState {
  const token = useAuthStore(s => s.token)
  const [connected,  setConnected]  = useState(false)
  const [lastEvent,  setLastEvent]  = useState<string | null>(null)
  const [alerts,     setAlerts]     = useState<RealtimeAlert[]>([])
  const [score,      setScore]      = useState<number | null>(null)
  const [kpis,       setKpis]       = useState<Record<string, unknown> | null>(null)
  const [driverPos,  setDriverPos]  = useState<RealtimeState['driverPos']>(null)
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addAlert = useCallback((alert: Omit<RealtimeAlert, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`
    setAlerts(prev => [{ ...alert, id }, ...prev].slice(0, 20))
  }, [])

  const connect = useCallback(() => {
    if (!token) return
    if (esRef.current) esRef.current.close()

    /* EventSource não suporta headers — passamos token via cookie ou query param */
    const es = new EventSource(`/api/realtime/stream?token=${token}`)
    esRef.current = es

    es.addEventListener('connected', () => setConnected(true))

    es.addEventListener('kpi_update', (e) => {
      setKpis(JSON.parse(e.data))
      setLastEvent('kpi_update')
    })

    es.addEventListener('stock_alert', (e) => {
      const data = JSON.parse(e.data)
      setLastEvent('stock_alert')
      data.items?.forEach((item: any) => {
        if (item.status === 'CRITICO' || item.status === 'RUPTURA') {
          toast.error(`Estoque crítico: ${item.name} — ${item.disponivel} un`)
          addAlert({
            type:      'stock_alert',
            title:     `Estoque ${item.status}: ${item.sku}`,
            message:   `${item.name} — ${item.disponivel} un restantes. Previsão: ${item.dias_restantes} dias.`,
            severity:  item.status === 'RUPTURA' ? 'critical' : 'warning',
            timestamp: Date.now(),
            data:      item,
          })
        }
      })
    })

    es.addEventListener('sla_alert', (e) => {
      const data = JSON.parse(e.data)
      setLastEvent('sla_alert')
      data.orders?.forEach((o: any) => {
        if (o.risco === 'CRITICO' || o.risco === 'VIOLADO') {
          addAlert({
            type:      'sla_alert',
            title:     `SLA ${o.risco}: Pedido #${o.order_id}`,
            message:   o.recomendacao,
            severity:  o.risco === 'VIOLADO' ? 'critical' : 'warning',
            timestamp: Date.now(),
            data:      o,
          })
        }
      })
    })

    es.addEventListener('score_update', (e) => {
      const data = JSON.parse(e.data)
      setScore(data.score?.score ?? data.score)
      setLastEvent('score_update')
    })

    es.addEventListener('driver_location', (e) => {
      const data = JSON.parse(e.data)
      setDriverPos({ lat: data.lat, lng: data.lng, id: data.driver_id, name: data.name })
      setLastEvent('driver_location')
    })

    es.addEventListener('order_update', (e) => {
      setLastEvent('order_update')
    })

    es.onerror = () => {
      setConnected(false)
      es.close()
      /* Reconecta após 5s */
      retryRef.current = setTimeout(connect, 5000)
    }
  }, [token, addAlert])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [connect])

  return {
    connected,
    lastEvent,
    alerts,
    score,
    kpis,
    driverPos,
    clearAlerts: () => setAlerts([]),
  }
}
