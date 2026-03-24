/**
 * InventarioPage — Auditoria, Contagem Cíclica e Agendamento de Inventário.
 * A página mais completa do sistema.
 */
import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { inventoryApi, productsApi } from '@/services/api'
import { StockStatusBadge } from '@/components/ui/Badge'
import { toast } from '@/store/notificationStore'
import type { CriticalStockItem, InventoryItem } from '@/types'

interface Agendamento { id: number; loja: string; data: string; tipo: string; status: string }
interface Contagem { productId: number; sku: string; nome: string; sistemaQty: number; contagemQty: number }

const ZONAS = ['ZONA A — Picking', 'ZONA B — Paletizado', 'ZONA C — Expedição', 'ZONA D — Devolução']
const LOJAS = ['CD Embu das Artes', 'Loja Interlagos', 'Loja Centro SP']

export function InventarioPage() {
  const [tab,        setTab]       = useState<'visao'|'contagem'|'agenda'|'divergencias'>('visao')
  const [inventory,  setInventory] = useState<InventoryItem[]>([])
  const [critical,   setCritical]  = useState<CriticalStockItem[]>([])
  const [search,     setSearch]    = useState('')
  const [loading,    setLoading]   = useState(true)
  /* Contagem cíclica */
  const [zona,       setZona]      = useState(ZONAS[0])
  const [contagens,  setContagens] = useState<Contagem[]>([])
  const [scanning,   setScanning]  = useState(false)
  /* Agendamentos */
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([
    { id:1, loja:'CD Embu das Artes', data:'2025-04-15', tipo:'TOTAL',   status:'AGENDADO' },
    { id:2, loja:'Loja Interlagos',   data:'2025-04-20', tipo:'CÍCLICO', status:'AGENDADO' },
  ])
  const [novaLoja, setNovaLoja] = useState(LOJAS[0])
  const [novaData, setNovaData] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, crit] = await Promise.allSettled([
        inventoryApi.list({ page:1, limit:50 }),
        inventoryApi.critical(10),
      ])
      if (inv.status==='fulfilled')  setInventory(inv.value.data)
      if (crit.status==='fulfilled') setCritical(crit.value)
    } catch { toast.error('Erro ao carregar inventário') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const id=setInterval(load,60_000); return ()=>clearInterval(id) }, [load])

  const filteredInv = inventory.filter(i =>
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    i.product_name.toLowerCase().includes(search.toLowerCase())
  )

  const divergencias = contagens.filter(c => c.contagemQty !== c.sistemaQty)

  const adicionarContagem = () => {
    const sku = prompt('Digite o SKU para contar:')
    if (!sku) return
    const found = inventory.find(i => i.sku.toLowerCase() === sku.toLowerCase())
    if (!found) { toast.error(`SKU ${sku} não encontrado`); return }
    const qty = prompt(`SKU ${sku} — ${found.product_name}\nSistema: ${found.quantity} un\nInforme a quantidade contada:`)
    if (qty === null) return
    setContagens(c => [...c.filter(x=>x.productId!==found.product_id), {
      productId: found.product_id, sku: found.sku,
      nome: found.product_name, sistemaQty: found.quantity, contagemQty: Number(qty)
    }])
    toast.success(`Contagem registrada: ${found.sku}`)
  }

  const agendar = () => {
    if (!novaData) { toast.error('Selecione uma data'); return }
    setAgendamentos(a => [...a, { id: Date.now(), loja: novaLoja, data: novaData, tipo: 'TOTAL', status: 'AGENDADO' }])
    toast.success('Inventário agendado!')
    setNovaData('')
  }

  const TABS = [
    { id:'visao',       label:'Posição Geral',   icon:'fas fa-list' },
    { id:'contagem',    label:'Contagem Cíclica', icon:'fas fa-clipboard-check' },
    { id:'agenda',      label:'Agenda',           icon:'fas fa-calendar' },
    { id:'divergencias',label:'Divergências',     icon:'fas fa-not-equal', badge: divergencias.length },
  ] as const

  return (
    <div className="ks-container">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ks-purple flex items-center gap-3">
            <i className="fas fa-clipboard-list" /> Central de Inventário
          </h1>
          <p className="text-sm text-[var(--ks-text-muted)] mt-1">
            {inventory.length} itens · {critical.length} críticos · atualiza a cada 60s
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="ks-btn ks-btn-ghost text-xs"><i className="fas fa-sync-alt"/> Atualizar</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-[var(--ks-bg-card)] border border-[var(--ks-border)] rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-none justify-center',
              tab===t.id ? 'bg-ks-purple text-white shadow' : 'text-[var(--ks-text-muted)] hover:text-white'
            )}>
            <i className={t.icon} />
            <span className="hidden sm:inline">{t.label}</span>
            {'badge' in t && t.badge > 0 && (
              <span className="w-5 h-5 rounded-full bg-ks-red text-white text-[10px] font-black flex items-center justify-center">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: POSIÇÃO GERAL */}
      {tab==='visao' && (
        <>
          {/* Alertas críticos no topo */}
          {critical.length > 0 && (
            <div className="ks-card border-l-4 border-ks-red mb-5 bg-ks-red/5">
              <p className="text-sm font-bold text-ks-red mb-3 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle ks-blink"/> {critical.length} produto(s) abaixo do nível crítico
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {critical.slice(0,6).map(c => (
                  <div key={c.product_id} className="flex justify-between items-center bg-ks-red/10 border border-ks-red/20 rounded-lg px-3 py-2 text-sm">
                    <span className="font-mono text-ks-blue text-xs">{c.sku}</span>
                    <span className="text-[var(--ks-text-muted)] text-xs truncate mx-2">{c.name}</span>
                    <span className="font-bold text-ks-red">{c.available} un</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Busca */}
          <div className="flex items-center gap-2 bg-[var(--ks-bg-card)] border border-[var(--ks-border)] rounded-lg px-3 py-2 mb-4 max-w-sm">
            <i className="fas fa-search text-[var(--ks-text-muted)] text-sm"/>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrar SKU ou produto..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--ks-text-muted)]"/>
          </div>

          <div className="ks-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ks-table">
                <thead>
                  <tr><th>SKU</th><th>Produto</th><th className="hidden md:table-cell">Local</th><th>Total</th><th>Disponível</th><th>Reservado</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {loading ? Array.from({length:8}).map((_,i)=>(
                    <tr key={i}>{Array.from({length:7}).map((_,j)=><td key={j}><div className="h-4 bg-white/5 rounded animate-pulse"/></td>)}</tr>
                  )) : filteredInv.map(item=>(
                    <tr key={item.id}>
                      <td><span className="font-mono text-ks-blue font-semibold text-sm">{item.sku}</span></td>
                      <td className="font-medium text-sm max-w-[150px] truncate">{item.product_name}</td>
                      <td className="hidden md:table-cell text-[var(--ks-text-muted)] text-xs"><i className="fas fa-warehouse mr-1"/>{item.location_code} · {item.warehouse}</td>
                      <td className="font-mono font-semibold">{item.quantity}</td>
                      <td><span className={clsx('font-bold font-mono',item.available<=0?'text-ks-red':item.available<5?'text-ks-yellow':'text-ks-green')}>{item.available}</span></td>
                      <td className="text-[var(--ks-text-muted)] font-mono text-sm">{item.reserved_quantity}</td>
                      <td><StockStatusBadge available={item.available} minimum={5}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB: CONTAGEM CÍCLICA */}
      {tab==='contagem' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="ks-card ks-card-io">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><i className="fas fa-barcode text-ks-green"/>Nova Contagem Cíclica</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest block mb-1">Zona do Armazém</label>
                <select value={zona} onChange={e=>setZona(e.target.value)} className="w-full bg-[#000] border border-[var(--ks-border)] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-ks-blue">
                  {ZONAS.map(z=><option key={z}>{z}</option>)}
                </select>
              </div>
              <button onClick={adicionarContagem} className="ks-btn ks-btn-primary w-full">
                <i className="fas fa-plus"/> ADICIONAR SKU À CONTAGEM
              </button>
            </div>
            {contagens.length>0 && (
              <div className="mt-5 space-y-2">
                {contagens.map(c=>(
                  <div key={c.productId} className={clsx('flex items-center justify-between p-3 rounded-lg border text-sm', c.contagemQty===c.sistemaQty?'border-ks-green/30 bg-ks-green/5':'border-ks-red/30 bg-ks-red/5')}>
                    <div><p className="font-mono text-ks-blue text-xs">{c.sku}</p><p className="font-medium text-xs">{c.nome}</p></div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--ks-text-muted)]">Sistema: {c.sistemaQty}</p>
                      <p className={clsx('font-bold text-sm', c.contagemQty===c.sistemaQty?'text-ks-green':'text-ks-red')}>Contagem: {c.contagemQty}</p>
                    </div>
                  </div>
                ))}
                <button className="ks-btn ks-btn-primary w-full mt-3" onClick={()=>toast.info('Relatório enviado para aprovação!')}>
                  <i className="fas fa-paper-plane"/> FINALIZAR E ENVIAR
                </button>
              </div>
            )}
          </div>
          <div className="ks-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><i className="fas fa-not-equal text-ks-red"/>Divergências da Sessão</h3>
            {divergencias.length===0 ? (
              <div className="text-center py-10 text-[var(--ks-text-muted)]">
                <i className="fas fa-check-circle text-ks-green text-3xl block mb-3 opacity-60"/>
                <p className="text-sm">Nenhuma divergência encontrada</p>
              </div>
            ) : divergencias.map(d=>(
              <div key={d.productId} className="flex justify-between items-center p-3 rounded-lg bg-ks-red/5 border border-ks-red/20 mb-2">
                <div><p className="font-mono text-xs text-ks-blue">{d.sku}</p><p className="text-sm font-medium">{d.nome}</p></div>
                <div className="text-right text-sm">
                  <p className="text-[var(--ks-text-muted)]">Δ {d.contagemQty - d.sistemaQty > 0 ? '+' : ''}{d.contagemQty - d.sistemaQty} un</p>
                  <p className="text-ks-red font-bold">{d.sistemaQty} → {d.contagemQty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: AGENDA */}
      {tab==='agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="ks-card ks-card-io">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><i className="fas fa-calendar-plus text-ks-blue"/>Agendar Inventário</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest block mb-1">Unidade</label>
                <select value={novaLoja} onChange={e=>setNovaLoja(e.target.value)} className="w-full bg-[#000] border border-[var(--ks-border)] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-ks-blue">
                  {LOJAS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest block mb-1">Data</label>
                <input type="date" value={novaData} onChange={e=>setNovaData(e.target.value)} className="w-full bg-[#000] border border-[var(--ks-border)] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-ks-blue" />
              </div>
              <button onClick={agendar} className="ks-btn ks-btn-primary w-full"><i className="fas fa-check"/>CONFIRMAR AGENDAMENTO</button>
            </div>
          </div>
          <div className="ks-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><i className="fas fa-clock text-ks-yellow"/>Próximas Auditorias</h3>
            <div className="space-y-2">
              {agendamentos.map(a=>(
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--ks-bg-hover)] border border-[var(--ks-border)]">
                  <div>
                    <p className="font-medium text-sm">{a.loja}</p>
                    <p className="text-xs text-[var(--ks-text-muted)] font-mono">{new Date(a.data).toLocaleDateString('pt-BR')} · {a.tipo}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-ks-yellow/10 text-ks-yellow border border-ks-yellow/30">{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: DIVERGÊNCIAS */}
      {tab==='divergencias' && (
        <div className="ks-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><i className="fas fa-not-equal text-ks-red"/>Histórico de Divergências</h3>
          {divergencias.length===0 ? (
            <div className="text-center py-16 text-[var(--ks-text-muted)]">
              <i className="fas fa-check-double text-4xl block mb-4 text-ks-green opacity-60"/>
              <p>Nenhuma divergência registrada nesta sessão</p>
              <p className="text-xs mt-2 opacity-60">Execute uma contagem cíclica para comparar</p>
            </div>
          ) : (
            <table className="ks-table">
              <thead><tr><th>SKU</th><th>Produto</th><th>Sistema</th><th>Contagem</th><th>Diferença</th></tr></thead>
              <tbody>
                {divergencias.map(d=>(
                  <tr key={d.productId}>
                    <td><span className="font-mono text-ks-blue">{d.sku}</span></td>
                    <td>{d.nome}</td>
                    <td className="font-mono">{d.sistemaQty}</td>
                    <td className="font-mono">{d.contagemQty}</td>
                    <td><span className={clsx('font-bold font-mono',d.contagemQty>d.sistemaQty?'text-ks-green':'text-ks-red')}>{d.contagemQty-d.sistemaQty>0?'+':''}{d.contagemQty-d.sistemaQty}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
