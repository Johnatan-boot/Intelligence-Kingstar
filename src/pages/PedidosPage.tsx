/**
 * PedidosPage — Gestão de Pedidos em tempo real.
 *
 * BUGS CORRIGIDOS:
 *  - Nome 'confirm' conflitava com window.confirm → renomeado para confirmOrder/cancelOrder
 *  - Filtros de status agora relançam a query corretamente (useEffect com deps em [load])
 *  - customer_name agora vem do backend (listOrders com JOIN corrigido)
 *  - Botões CONFIRMAR/CANCELAR aparecem corretamente por status
 */
import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { ordersApi, pickingApi } from '@/services/api'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { toast } from '@/store/notificationStore'
import type { Order, OrderStatus } from '@/types'

const STATUS_FILTERS: (OrderStatus | 'ALL')[] = ['ALL','PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED']
const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'PENDENTE',
  CONFIRMED: 'CONFIRMADO',
  SHIPPED: 'EM EXPEDICAO',
  DELIVERED: 'ENTREGUE',
  CANCELLED: 'CANCELADO',
}

export function PedidosPage() {
  const [orders,       setOrders]       = useState<Order[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState<OrderStatus | 'ALL'>('ALL')
  const [detail,       setDetail]       = useState<Order | null>(null)
  const [detailLoading,setDetailLoading]= useState(false)
  const [actionLoading,setActionLoading]= useState<number | null>(null)

  /* load depende de filter — toda mudança de filtro recarrega */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter === 'ALL' ? { limit: 50 } : { status: filter, limit: 50 }
      const res = await ordersApi.list(params)
      /* backend retorna { data: [], total } ou array direto */
      setOrders(Array.isArray(res) ? res : (res.data ?? []))
    } catch { toast.error('Erro ao carregar pedidos') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => {
    load()
    const id = setInterval(load, 20_000)
    return () => clearInterval(id)
  }, [load])

  const openDetail = async (id: number) => {
    setDetailLoading(true)
    try { setDetail(await ordersApi.get(id)) }
    catch { toast.error('Erro ao carregar pedido') }
    finally { setDetailLoading(false) }
  }

  /* CORRIGIDO: renomeado de 'confirm' para 'confirmOrder' — evita conflito com window.confirm */
  const confirmOrder = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setActionLoading(id)
    try { await ordersApi.confirm(id); toast.success('Pedido confirmado!'); load() }
    catch (err: any) { toast.error(err.message) }
    finally { setActionLoading(null) }
  }

  /* CORRIGIDO: renomeado de 'cancel' para 'cancelOrder' */
  const cancelOrder = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!window.confirm('Cancelar este pedido? Esta ação libera o estoque reservado.')) return
    setActionLoading(id)
    try { await ordersApi.cancel(id); toast.success('Pedido cancelado'); load() }
    catch (err: any) { toast.error(err.message) }
    finally { setActionLoading(null) }
  }

  const createPicking = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation()
    setActionLoading(orderId)
    try { await pickingApi.create(orderId); toast.success('Picking criado! Acesse a página de Picking.') }
    catch (err: any) { toast.error(err.message) }
    finally { setActionLoading(null) }
  }

  const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="ks-container">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ks-blue flex items-center gap-3">
            <i className="fas fa-shopping-cart" /> Gestão de Pedidos
          </h1>
          <p className="text-sm text-[var(--ks-text-muted)] mt-1">
            {orders.length} pedido(s) · auto-refresh 20s
          </p>
        </div>

        {/* Filtros de status */}
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-lg font-semibold transition-all border whitespace-nowrap',
                filter === s
                  ? 'bg-ks-blue text-black border-ks-blue'
                  : 'border-[var(--ks-border)] text-[var(--ks-text-muted)] hover:border-ks-blue hover:text-white'
              )}
            >
              {s === 'ALL' ? 'TODOS' : ORDER_STATUS_LABELS[s]}
            </button>
          ))}
          <button onClick={load} className="ks-btn ks-btn-ghost text-xs py-1.5 px-3 ml-1">
            <i className="fas fa-sync-alt" />
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="ks-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ks-table">
            <thead>
              <tr>
                <th style={{width:60}}>ID</th>
                <th>Cliente</th>
                <th className="hidden sm:table-cell" style={{width:80}}>Itens</th>
                <th style={{width:120}}>Total</th>
                <th style={{width:110}}>Status</th>
                <th className="hidden md:table-cell" style={{width:140}}>Data</th>
                <th style={{width:160}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i}>
                    {Array.from({length: 7}).map((_, j) => (
                      <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-[var(--ks-text-muted)]">
                    <i className="fas fa-inbox text-4xl block mb-3 opacity-20" />
                    <p className="text-sm">Nenhum pedido encontrado</p>
                    {filter !== 'ALL' && (
                      <p className="text-xs mt-1 opacity-60">Tente remover o filtro de status</p>
                    )}
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(o.id)}
                  >
                    <td>
                      <span className="font-mono text-ks-blue font-bold text-sm">#{o.id}</span>
                    </td>
                    <td>
                      {/* customer_name agora vem do JOIN no backend */}
                      <p className="font-medium text-sm">{o.customer_name || '—'}</p>
                      <p className="text-xs text-[var(--ks-text-muted)] hidden sm:block">{o.customer_email || ''}</p>
                    </td>
                    <td className="hidden sm:table-cell text-[var(--ks-text-muted)] text-sm">
                      {o.item_count ?? 0} item(s)
                    </td>
                    <td>
                      <span className="font-mono font-semibold text-ks-green text-sm">{brl(o.total)}</span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="hidden md:table-cell text-[var(--ks-text-muted)] text-xs font-mono">
                      {new Date(o.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 flex-wrap">
                        {/* Botão CONFIRMAR — só para PENDING */}
                        {o.status === 'PENDING' && (
                          <button
                            onClick={e => confirmOrder(e, o.id)}
                            disabled={actionLoading === o.id}
                            className="text-[10px] px-2 py-1 rounded bg-ks-green/10 hover:bg-ks-green/20 text-ks-green border border-ks-green/30 font-bold transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {actionLoading === o.id ? <i className="fas fa-circle-notch ks-spin" /> : 'CONFIRMAR'}
                          </button>
                        )}
                        {/* Botão PICKING — só para CONFIRMED */}
                        {o.status === 'CONFIRMED' && (
                          <button
                            onClick={e => createPicking(e, o.id)}
                            disabled={actionLoading === o.id}
                            className="text-[10px] px-2 py-1 rounded bg-ks-blue/10 hover:bg-ks-blue/20 text-ks-blue border border-ks-blue/30 font-bold transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {actionLoading === o.id ? <i className="fas fa-circle-notch ks-spin" /> : 'PICKING'}
                          </button>
                        )}
                        {/* Botão CANCELAR — para PENDING e CONFIRMED */}
                        {['PENDING', 'CONFIRMED'].includes(o.status) && (
                          <button
                            onClick={e => cancelOrder(e, o.id)}
                            disabled={actionLoading === o.id}
                            className="text-[10px] px-2 py-1 rounded bg-ks-red/10 hover:bg-ks-red/20 text-ks-red border border-ks-red/30 font-bold transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            CANCELAR
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalhe */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setDetail(null)}
        >
          <div className="ks-card w-full max-w-lg max-h-[90vh] overflow-y-auto ks-slide-right">
            {detailLoading ? (
              <div className="py-16 text-center">
                <i className="fas fa-circle-notch ks-spin text-ks-blue text-2xl" />
              </div>
            ) : detail && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <i className="fas fa-receipt text-ks-blue" /> Pedido #{detail.id}
                  </h3>
                  <button onClick={() => setDetail(null)} className="text-[var(--ks-text-muted)] hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
                    <i className="fas fa-times" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[var(--ks-bg-hover)] rounded-lg p-3">
                    <p className="text-[var(--ks-text-muted)] text-xs mb-1">Cliente</p>
                    <p className="font-medium text-sm">{detail.customer_name}</p>
                  </div>
                  <div className="bg-[var(--ks-bg-hover)] rounded-lg p-3">
                    <p className="text-[var(--ks-text-muted)] text-xs mb-1">Status</p>
                    <OrderStatusBadge status={detail.status} />
                  </div>
                  <div className="bg-[var(--ks-bg-hover)] rounded-lg p-3">
                    <p className="text-[var(--ks-text-muted)] text-xs mb-1">Total</p>
                    <p className="font-mono text-ks-green font-bold">{brl(detail.total)}</p>
                  </div>
                  <div className="bg-[var(--ks-bg-hover)] rounded-lg p-3">
                    <p className="text-[var(--ks-text-muted)] text-xs mb-1">Data</p>
                    <p className="font-mono text-xs">{new Date(detail.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                {detail.items && detail.items.length > 0 && (
                  <div className="border-t border-[var(--ks-border)] pt-4">
                    <p className="text-xs text-[var(--ks-text-muted)] uppercase tracking-widest mb-3">Itens</p>
                    <div className="space-y-2">
                      {detail.items.map(i => (
                        <div key={i.id} className="flex items-center justify-between bg-[var(--ks-bg-hover)] rounded-lg px-3 py-2">
                          <div>
                            <p className="font-medium text-sm">{i.product_name}</p>
                            <p className="text-xs font-mono text-ks-blue">{i.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-ks-green text-sm">{brl(i.subtotal)}</p>
                            <p className="text-xs text-[var(--ks-text-muted)]">{i.quantity}× {brl(i.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
