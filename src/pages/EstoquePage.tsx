/**
 * EstoquePage — Gestão de Inventário Físico em tempo real.
 * Recursos: busca, ajuste de estoque, status visual, paginação, export CSV.
 */
import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { inventoryApi } from '@/services/api'
import { StockStatusBadge } from '@/components/ui/Badge'
import { toast } from '@/store/notificationStore'
import type { InventoryItem } from '@/types'

interface AdjustModal { item: InventoryItem; type: 'IN' | 'OUT' | 'ADJUST' }

export function EstoquePage() {
  const [data,         setData]         = useState<InventoryItem[]>([])
  const [search,       setSearch]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const [page,         setPage]         = useState(1)
  const [total,        setTotal]        = useState(0)
  const [modal,        setModal]        = useState<AdjustModal | null>(null)
  const [adjQty,       setAdjQty]       = useState(1)
  const [adjReason,    setAdjReason]    = useState('')
  const [adjLoading,   setAdjLoading]   = useState(false)
  const [critical,     setCritical]     = useState<InventoryItem[]>([])
  const LIMIT = 20

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const [inv, crit] = await Promise.allSettled([
        inventoryApi.list({ page: p, limit: LIMIT }),
        inventoryApi.critical(5),
      ])
      if (inv.status === 'fulfilled') { setData(inv.value.data); setTotal(inv.value.total) }
      if (crit.status === 'fulfilled') setCritical(crit.value)
    } catch { toast.error('Erro ao carregar estoque') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1); const id = setInterval(() => load(page), 30_000); return () => clearInterval(id) }, [])

  const handleAdjust = async () => {
    if (!modal) return
    setAdjLoading(true)
    try {
      await inventoryApi.adjust({
        product_id:  modal.item.product_id,
        location_id: modal.item.id,
        quantity:    adjQty,
        type:        modal.type,
        reason:      adjReason || `Ajuste manual — ${modal.type}`,
      })
      toast.success(`Estoque ajustado: ${modal.item.product_name}`)
      setModal(null); setAdjQty(1); setAdjReason('')
      load(page)
    } catch (err: any) { toast.error(err.message) }
    finally { setAdjLoading(false) }
  }

  const exportCSV = () => {
    const rows = [['SKU','Produto','Local','Disponível','Reservado','Status']]
    data.forEach(i => rows.push([i.sku, i.product_name, `${i.location_code} · ${i.warehouse}`, String(i.available), String(i.reserved_quantity), i.available <= 0 ? 'RUPTURA' : i.available < 5 ? 'BAIXO' : 'OK']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'estoque-kingstar.csv' })
    a.click(); URL.revokeObjectURL(url)
    toast.success('CSV exportado!')
  }

  const filtered = data.filter(i =>
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    i.product_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="ks-container">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ks-yellow flex items-center gap-3">
            <i className="fas fa-boxes" /> Controle de Estoque
          </h1>
          <p className="text-sm text-[var(--ks-text-muted)] mt-1">Posição em tempo real · atualiza a cada 30s</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-[var(--ks-bg-card)] border border-[var(--ks-border)] rounded-lg px-3 py-2">
            <i className="fas fa-search text-[var(--ks-text-muted)] text-sm" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar..." className="bg-transparent outline-none text-sm w-36 sm:w-48 placeholder:text-[var(--ks-text-muted)]" />
          </div>
          <button onClick={exportCSV} className="ks-btn ks-btn-primary text-xs py-2 px-4"><i className="fas fa-file-csv" /> CSV</button>
        </div>
      </div>

      {/* Alertas críticos */}
      {critical.length > 0 && (
        <div className="ks-card ks-card-io border-l-4 border-ks-red mb-5 bg-ks-red/5">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-exclamation-triangle text-ks-red ks-blink" />
            <span className="text-sm font-bold text-ks-red">{critical.length} item(s) com estoque crítico</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {critical.slice(0, 5).map(i => (
              <span key={i.product_id} className="text-xs font-mono bg-ks-red/10 border border-ks-red/30 text-ks-red px-2 py-1 rounded-lg">
                {i.sku} — {i.available} un
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="ks-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ks-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto</th>
                <th className="hidden md:table-cell">Localização</th>
                <th>Disponível</th>
                <th className="hidden sm:table-cell">Reservado</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i) => (
                <tr key={i}>{Array.from({length:7}).map((_,j) => <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-[var(--ks-text-muted)]">
                  <i className="fas fa-box-open text-3xl block mb-3 opacity-20" />
                  {search ? 'Nenhum resultado' : 'Estoque vazio'}
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id}>
                  <td><span className="font-mono text-ks-blue font-semibold text-sm">{item.sku}</span></td>
                  <td className="font-medium max-w-[180px] truncate">{item.product_name}</td>
                  <td className="hidden md:table-cell text-[var(--ks-text-muted)] text-sm">
                    <i className="fas fa-map-marker-alt mr-1 text-xs text-ks-blue" />
                    {item.location_code} · {item.warehouse}
                  </td>
                  <td><span className={clsx('font-bold font-mono text-base', item.available<=0?'text-ks-red':item.available<5?'text-ks-yellow':'text-ks-green')}>{item.available}</span></td>
                  <td className="hidden sm:table-cell text-[var(--ks-text-muted)] font-mono text-sm">{item.reserved_quantity}</td>
                  <td><StockStatusBadge available={item.available} minimum={5} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setModal({item, type:'IN'}); setAdjQty(1) }} className="w-7 h-7 rounded-lg bg-ks-green/10 hover:bg-ks-green/20 text-ks-green text-xs transition-colors" title="Entrada"><i className="fas fa-plus" /></button>
                      <button onClick={() => { setModal({item, type:'OUT'}); setAdjQty(1) }} className="w-7 h-7 rounded-lg bg-ks-red/10 hover:bg-ks-red/20 text-ks-red text-xs transition-colors" title="Saída"><i className="fas fa-minus" /></button>
                      <button onClick={() => { setModal({item, type:'ADJUST'}); setAdjQty(item.quantity) }} className="w-7 h-7 rounded-lg bg-ks-blue/10 hover:bg-ks-blue/20 text-ks-blue text-xs transition-colors" title="Ajustar"><i className="fas fa-sliders-h" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginação */}
        {!loading && total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--ks-border)]">
            <span className="text-xs text-[var(--ks-text-muted)]">{total} itens</span>
            <div className="flex gap-2 items-center">
              <button onClick={() => { setPage(p=>p-1); load(page-1) }} disabled={page===1} className="ks-btn ks-btn-ghost py-1 px-3 text-xs disabled:opacity-40"><i className="fas fa-chevron-left" /></button>
              <span className="text-xs text-[var(--ks-text-muted)]">Pág {page} de {Math.ceil(total/LIMIT)}</span>
              <button onClick={() => { setPage(p=>p+1); load(page+1) }} disabled={page*LIMIT>=total} className="ks-btn ks-btn-ghost py-1 px-3 text-xs disabled:opacity-40"><i className="fas fa-chevron-right" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de ajuste */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="ks-card w-full max-w-md ks-slide-in sm:ks-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold flex items-center gap-2">
                <i className={clsx(modal.type==='IN'?'fas fa-plus text-ks-green':modal.type==='OUT'?'fas fa-minus text-ks-red':'fas fa-sliders-h text-ks-blue')} />
                {modal.type==='IN'?'Entrada':(modal.type==='OUT'?'Saída':'Ajuste')} de Estoque
              </h3>
              <button onClick={() => setModal(null)} className="text-[var(--ks-text-muted)] hover:text-white"><i className="fas fa-times" /></button>
            </div>
            <p className="text-sm text-[var(--ks-text-muted)] mb-1">{modal.item.product_name}</p>
            <p className="font-mono text-xs text-ks-blue mb-4">{modal.item.sku} · Atual: {modal.item.quantity} un</p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest block mb-1">Quantidade</label>
                <input type="number" min={1} value={adjQty} onChange={e=>setAdjQty(Number(e.target.value))}
                  className="w-full bg-[#000] border border-[var(--ks-border)] rounded-lg px-4 py-3 text-white font-mono outline-none focus:border-ks-blue" />
              </div>
              <div>
                <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest block mb-1">Motivo (opcional)</label>
                <input type="text" value={adjReason} onChange={e=>setAdjReason(e.target.value)} placeholder="Ex: Recebimento NF 1234"
                  className="w-full bg-[#000] border border-[var(--ks-border)] rounded-lg px-4 py-3 text-white outline-none focus:border-ks-blue placeholder:text-[#444]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setModal(null)} className="ks-btn ks-btn-ghost flex-1">Cancelar</button>
              <button onClick={handleAdjust} disabled={adjLoading} className="ks-btn ks-btn-primary flex-1 disabled:opacity-60">
                {adjLoading ? <i className="fas fa-circle-notch ks-spin" /> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
