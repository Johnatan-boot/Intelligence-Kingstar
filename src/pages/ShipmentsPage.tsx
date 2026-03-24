/**
 * ShipmentsPage — Gestão de Envios e Entregas.
 */
import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { shipmentsApi } from '@/services/api'
import { toast } from '@/store/notificationStore'
import type { Shipment, ShipmentStatus } from '@/types'

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  PREPARING:  'text-ks-yellow  bg-ks-yellow/10  border-ks-yellow/30',
  SHIPPED:    'text-ks-blue    bg-ks-blue/10    border-ks-blue/30',
  IN_TRANSIT: 'text-ks-purple  bg-ks-purple/10  border-ks-purple/30',
  DELIVERED:  'text-ks-green   bg-ks-green/10   border-ks-green/30',
  FAILED:     'text-ks-red     bg-ks-red/10     border-ks-red/30',
}
const STATUS_FLOW: ShipmentStatus[] = ['PREPARING','SHIPPED','IN_TRANSIT','DELIVERED']
const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PREPARING: 'PREPARANDO',
  SHIPPED: 'EXPEDIDO',
  IN_TRANSIT: 'EM TRANSPORTE',
  DELIVERED: 'ENTREGUE',
  FAILED: 'FALHOU',
}

export function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState<Shipment | null>(null)
  const [updating,  setUpdating]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await shipmentsApi.list({ page: 1 })
      setShipments(Array.isArray(res) ? res : res.data ?? [])
    } catch { toast.error('Erro ao carregar expedicao') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const id = setInterval(load, 20_000); return () => clearInterval(id) }, [load])

  const updateStatus = async (id: number, status: ShipmentStatus) => {
    setUpdating(true)
    try {
      await shipmentsApi.updateStatus(id, status)
      toast.success(`Status atualizado: ${status}`)
      setSelected(null); load()
    } catch (e: any) { toast.error(e.message) }
    finally { setUpdating(false) }
  }

  const nextStatus = (current: ShipmentStatus): ShipmentStatus | null => {
    const idx = STATUS_FLOW.indexOf(current)
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
  }

  return (
    <div className="ks-container">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ks-blue flex items-center gap-3">
            <i className="fas fa-truck" /> Gestão de Expedição
          </h1>
          <p className="text-sm text-[var(--ks-text-muted)] mt-1">Rastreamento e status de expedição/transporte · 20s auto-refresh</p>
        </div>
      </div>

      {/* KPIs de status */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {(['PREPARING','SHIPPED','IN_TRANSIT','DELIVERED','FAILED'] as ShipmentStatus[]).map(s => {
          const count = shipments.filter(sh=>sh.status===s).length
          return (
            <div key={s} className={clsx('ks-card text-center py-3 px-2 border', STATUS_COLORS[s])}>
              <p className="text-xl font-bold font-display">{count}</p>
              <p className="text-[10px] font-semibold tracking-wider mt-1">{SHIPMENT_STATUS_LABELS[s]}</p>
            </div>
          )
        })}
      </div>

      {/* Lista */}
      <div className="ks-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ks-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th className="hidden sm:table-cell">Transportadora</th>
                <th className="hidden md:table-cell">Rastreio</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Previsão</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:5}).map((_,i)=>(
                <tr key={i}>{Array.from({length:7}).map((_,j)=><td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>
              )) : shipments.length===0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-[var(--ks-text-muted)]">
                  <i className="fas fa-truck text-3xl block mb-3 opacity-20"/>Nenhum envio
                </td></tr>
              ) : shipments.map(s => (
                <tr key={s.id}>
                  <td><span className="font-mono text-ks-blue font-bold">#{s.id}</span></td>
                  <td className="font-medium text-sm">{s.customer_name}</td>
                  <td className="hidden sm:table-cell text-[var(--ks-text-muted)] text-sm">{s.carrier ?? '—'}</td>
                  <td className="hidden md:table-cell font-mono text-xs text-ks-blue">{s.tracking_code ?? '—'}</td>
                  <td>
                    <span className={clsx('text-[10px] font-bold px-2 py-1 rounded-lg border', STATUS_COLORS[s.status])}>
                      {s.status.replace('_',' ')}
                    </span>
                  </td>
                  <td className="hidden md:table-cell text-[var(--ks-text-muted)] text-xs">
                    {s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td>
                    {nextStatus(s.status) && (
                      <button onClick={()=>setSelected(s)}
                        className="text-[10px] px-2 py-1 rounded bg-ks-blue/10 hover:bg-ks-blue/20 text-ks-blue border border-ks-blue/30 font-bold transition-all">
                        AVANÇAR
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal avançar status */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div className="ks-card w-full max-w-sm ks-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Atualizar Status — Expedição #{selected.id}</h3>
              <button onClick={()=>setSelected(null)} className="text-[var(--ks-text-muted)] hover:text-white"><i className="fas fa-times"/></button>
            </div>
            <p className="text-sm text-[var(--ks-text-muted)] mb-4">
              Status atual: <span className={clsx('font-bold', STATUS_COLORS[selected.status])}>{SHIPMENT_STATUS_LABELS[selected.status]}</span>
            </p>
            <p className="text-sm mb-5">Avançar para: <strong className="text-ks-green">{nextStatus(selected.status) ? SHIPMENT_STATUS_LABELS[nextStatus(selected.status)!] : '-'}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={()=>setSelected(null)} className="ks-btn ks-btn-ghost flex-1">Cancelar</button>
              <button
                onClick={()=>updateStatus(selected.id, nextStatus(selected.status)!)}
                disabled={updating}
                className="ks-btn ks-btn-primary flex-1 disabled:opacity-60"
              >
                {updating ? <i className="fas fa-circle-notch ks-spin"/> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
