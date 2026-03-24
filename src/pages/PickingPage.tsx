/**
 * PickingPage — Separação de produtos para despacho.
 */
import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { pickingApi } from '@/services/api'
import { toast } from '@/store/notificationStore'
import type { PickingOrder } from '@/types'

const STATUS_MAP: Record<string, string> = {
  PENDING: 'bg-ks-yellow/10 text-ks-yellow border-ks-yellow/30',
  IN_PROGRESS: 'bg-ks-blue/10 text-ks-blue border-ks-blue/30',
  COMPLETED: 'bg-ks-green/10 text-ks-green border-ks-green/30',
  CANCELLED: 'bg-ks-red/10 text-ks-red border-ks-red/30',
}

export function PickingPage() {
  const [pickings, setPickings] = useState<PickingOrder[]>([])
  const [loading,  setLoading]  = useState(true)
  const [detail,   setDetail]   = useState<PickingOrder | null>(null)
  const [pickingQty, setPickingQty] = useState<Record<number, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await pickingApi.list({ limit: 50 })
      setPickings(Array.isArray(res) ? res : res.data)
    } catch { toast.error('Erro ao carregar picking') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const id = setInterval(load, 15_000); return () => clearInterval(id) }, [load])

  const openDetail = async (id: number) => {
    try { setDetail(await pickingApi.get(id)) }
    catch { toast.error('Erro ao carregar detalhe') }
  }

  const handlePick = async (pickingId: number, itemId: number, qty: number) => {
    try {
      await pickingApi.pickItem(pickingId, itemId, qty)
      toast.success('Item separado!')
      const updated = await pickingApi.get(pickingId)
      setDetail(updated)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="ks-container">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ks-green flex items-center gap-3">
            <i className="fas fa-hand-paper" /> Picking — Separação
          </h1>
          <p className="text-sm text-[var(--ks-text-muted)] mt-1">Ordens de separação ativas · atualiza a cada 15s</p>
        </div>
        <button onClick={load} className="ks-btn ks-btn-ghost text-xs">
          <i className="fas fa-sync-alt" /> Atualizar
        </button>
      </div>

      {/* Grid de cards de picking */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} className="ks-card animate-pulse"><div className="h-4 bg-white/5 rounded mb-3"/><div className="h-3 bg-white/5 rounded w-2/3"/></div>
          ))}
        </div>
      ) : pickings.length===0 ? (
        <div className="ks-card flex flex-col items-center justify-center py-20 gap-4">
          <i className="fas fa-hand-paper text-4xl text-[var(--ks-text-muted)] opacity-30"/>
          <p className="text-[var(--ks-text-muted)]">Nenhuma ordem de picking ativa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pickings.map(p => (
            <div key={p.id} className={clsx('ks-card cursor-pointer hover:border-ks-blue transition-all ks-fade-up')} onClick={()=>openDetail(p.id)}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-ks-blue font-bold text-sm">PICK #{p.id}</span>
                <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded border', STATUS_MAP[p.status] ?? 'bg-white/5 text-white border-white/10')}>
                  {p.status}
                </span>
              </div>
              <p className="text-sm font-medium truncate">{p.customer_name}</p>
              <p className="text-xs text-[var(--ks-text-muted)] mt-1">Pedido #{p.order_id}</p>
              <p className="text-xs text-[var(--ks-text-muted)] font-mono mt-2">{new Date(p.created_at).toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalhe com separação */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
          <div className="ks-card w-full max-w-lg max-h-[90vh] overflow-y-auto ks-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <i className="fas fa-hand-paper text-ks-green"/>
                Picking #{detail.id} — Pedido #{detail.order_id}
              </h3>
              <button onClick={()=>setDetail(null)} className="text-[var(--ks-text-muted)] hover:text-white"><i className="fas fa-times"/></button>
            </div>
            <p className="text-sm text-[var(--ks-text-muted)] mb-4">{detail.customer_name}</p>
            <div className="space-y-3">
              {detail.items?.map(item => (
                <div key={item.id} className={clsx('border rounded-xl p-3 transition-all', item.status==='PICKED'?'border-ks-green/30 bg-ks-green/5':'border-[var(--ks-border)] bg-[var(--ks-bg-hover)]')}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="font-mono text-xs text-ks-blue">{item.sku} · {item.location_code}</p>
                    </div>
                    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0', STATUS_MAP[item.status]??'bg-white/5 text-white border-white/10')}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--ks-text-muted)]">Solicitado: <strong className="text-white">{item.quantity_requested}</strong></span>
                    <span className="text-[var(--ks-text-muted)]">Separado: <strong className="text-ks-green">{item.quantity_picked}</strong></span>
                  </div>
                  {item.status !== 'PICKED' && (
                    <div className="flex gap-2 mt-2">
                      <input type="number" min={1} max={item.quantity_requested}
                        value={pickingQty[item.id] ?? item.quantity_requested}
                        onChange={e=>setPickingQty(q=>({...q,[item.id]:Number(e.target.value)}))}
                        className="w-20 bg-[#000] border border-[var(--ks-border)] rounded-lg px-2 py-1.5 text-sm text-white font-mono outline-none focus:border-ks-green"
                      />
                      <button onClick={()=>handlePick(detail.id, item.id, pickingQty[item.id]??item.quantity_requested)}
                        className="ks-btn ks-btn-primary text-xs py-1.5 px-4">
                        <i className="fas fa-check"/> SEPARAR
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
