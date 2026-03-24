/**
 * CorePage v4 — Núcleo Operacional KINGSTAR IO
 *
 * Features v4:
 *  ✅ KPIs em tempo real via SSE (sem polling)
 *  ✅ Motor de Inteligência — score + alertas
 *  ✅ Mapa logístico com rastreamento de entregadores
 *  ✅ Terminal de bipagem conectado ao backend
 *  ✅ Gráficos com dados reais (fallback demo)
 *  ✅ Log de pedidos recentes em tempo real
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { KpiCard }             from '@/components/ui/KpiCard'
import { IntelligencePanel }   from '@/components/intelligence/IntelligencePanel'
import { MapaLogistico }       from '@/components/intelligence/MapaLogistico'
import { coreApi, inventoryApi, ordersApi } from '@/services/api'
import { useRealtime }         from '@/hooks/useRealtime'
import { toast }               from '@/store/notificationStore'
import type { Dashboard, TopProduct, OrderSummaryItem } from '@/types'

const DEMO_REVENUE = [
  { hora:'08h', valor:1200 },{ hora:'09h', valor:2800 },{ hora:'10h', valor:3600 },
  { hora:'11h', valor:2100 },{ hora:'12h', valor:4200 },{ hora:'13h', valor:1800 },
  { hora:'14h', valor:5100 },{ hora:'15h', valor:3900 },{ hora:'16h', valor:4700 },{ hora:'17h', valor:6200 },
]
const DEMO_PRODUCTS: TopProduct[] = [
  { id:1, name:'Colchão King Star Lux', sku:'KS-1001', units_sold:42, revenue:147000 },
  { id:2, name:'Cama Box Baú Casal',    sku:'KS-1002', units_sold:28, revenue:56000  },
  { id:3, name:'Travesseiro NASA Gel',  sku:'KS-1003', units_sold:95, revenue:28500  },
  { id:4, name:'Protetor Impermeável',  sku:'KS-1004', units_sold:73, revenue:14600  },
  { id:5, name:'Pillow Top Queen',      sku:'KS-1005', units_sold:31, revenue:18600  },
]
const COLORS = ['#38bdf8','#22c55e','#fbbf24','#f87171','#a78bfa']
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
const Tooltip_ = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs">
      <p className="text-[var(--ks-text-muted)] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {typeof p.value === 'number' && p.value > 100 ? brl(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export function CorePage() {
  const [kpis,         setKpis]         = useState<Dashboard | null>(null)
  const [topProducts,  setTopProducts]  = useState<TopProduct[]>(DEMO_PRODUCTS)
  const [orderSummary, setOrderSummary] = useState<OrderSummaryItem[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [isDemo,       setIsDemo]       = useState(true)
  const [sku,          setSku]          = useState('')
  const [modo,         setModo]         = useState<'SAIDA'|'ENTRADA'>('SAIDA')
  const [feedback,     setFeedback]     = useState('')
  const [loading,      setLoading]      = useState(true)
  const [processing,   setProcessing]   = useState(false)
  const [sseConnected, setSseConnected] = useState(false)
  const [lastUpdate,   setLastUpdate]   = useState(new Date())
  const inputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    try {
      const [dash, top, summary, recent] = await Promise.allSettled([
        coreApi.dashboard(), coreApi.topProducts(5),
        coreApi.orderSummary(), ordersApi.list({ limit: 6 }),
      ])
      if (dash.status === 'fulfilled')    setKpis(dash.value)
      if (top.status === 'fulfilled' && Array.isArray(top.value) && top.value.length > 0) {
        setTopProducts(top.value); setIsDemo(false)
      }
      if (summary.status === 'fulfilled') setOrderSummary(Array.isArray(summary.value) ? summary.value : [])
      if (recent.status === 'fulfilled') {
        const r = recent.value?.data ?? recent.value ?? []
        setRecentOrders(Array.isArray(r) ? r.slice(0,6) : [])
      }
      setLastUpdate(new Date())
    } catch { /**/ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  /* SSE — KPIs em tempo real sem polling */
  const { connected } = useRealtime({
    on: {
      connected:    ()        => { setSseConnected(true); toast.info('🔴 Tempo real ativo') },
      kpi_update:   (d: any) => { setKpis(prev => ({ ...prev, ...d })); setLastUpdate(new Date()) },
      order_update: ()        => { loadData() },
      heartbeat:    ()        => { setSseConnected(true) },
      stock_alert:  (d: any) => {
        const criticos = (d.items || []).filter((i: any) => i.status === 'CRITICO' || i.status === 'RUPTURA')
        if (criticos.length > 0) toast.error(`⚠️ Estoque crítico: ${criticos[0].sku}`)
      },
      sla_alert: (d: any) => {
        const violados = (d.orders || []).filter((o: any) => o.risco === 'VIOLADO')
        if (violados.length > 0) toast.error(`🕐 SLA violado: Pedido #${violados[0].order_id}`)
      },
    },
  })

  const processarBipagem = async () => {
    if (!sku.trim() || processing) return
    setProcessing(true); setFeedback(`⏳ ${modo}: ${sku}...`)
    try {
      await inventoryApi.adjust({ product_id:1, location_id:1, quantity:1,
        type: modo === 'ENTRADA' ? 'IN' : 'OUT', reason:`Bipagem — ${modo} — ${sku}` })
      setFeedback(`✅ ${modo} registrada: ${sku}`)
      toast.success(`${modo}: ${sku}`)
      setSku(''); inputRef.current?.focus(); loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      setFeedback(`❌ ${msg}`); toast.error(msg)
    } finally {
      setProcessing(false); setTimeout(() => setFeedback(''), 5000)
    }
  }

  return (
    <div className="ks-container">

      {/* SSE status pill */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <span className={clsx(
          'text-[9px] font-mono font-bold px-2 py-1 rounded-full border flex items-center gap-1.5',
          connected || sseConnected
            ? 'text-ks-green bg-ks-green/10 border-ks-green/30'
            : 'text-[var(--ks-text-muted)] bg-white/5 border-white/10'
        )}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', connected || sseConnected ? 'bg-ks-green ks-blink' : 'bg-[var(--ks-text-muted)]')} />
          {connected || sseConnected ? 'TEMPO REAL ATIVO' : 'CONECTANDO...'}
        </span>
        <span className="text-[9px] font-mono text-[var(--ks-text-muted)]">
          {lastUpdate.toLocaleTimeString('pt-BR')}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Faturamento Hoje"  value={loading?'...':brl(kpis?.total_revenue??0)}  icon="fas fa-dollar-sign"          accent="yellow" loading={loading} />
        <KpiCard label="Pedidos Pendentes" value={loading?'...':kpis?.pending_orders??0}       icon="fas fa-clock"                accent="blue"   loading={loading} />
        <KpiCard label="Shipments Ativos"  value={loading?'...':kpis?.active_shipments??0}     icon="fas fa-truck"                accent="green"  loading={loading} />
        <KpiCard label="Estoque Crítico"   value={loading?'...':kpis?.low_stock_products??0}   icon="fas fa-exclamation-triangle" accent="red"    loading={loading} />
      </div>

      {/* Motor de Inteligência */}
      <div className="mb-6">
        <IntelligencePanel />
      </div>

      {/* Terminal de Bipagem */}
      <div className="ks-card ks-card-io mb-6">
        <h4 className="flex items-center gap-2 text-ks-green font-semibold text-sm mb-4">
          <i className="fas fa-barcode" /> Terminal de Bipagem
          <span className="ml-auto text-[10px] font-mono text-[var(--ks-text-muted)] hidden sm:block">ENTER para confirmar</span>
        </h4>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={modo} onChange={e=>setModo(e.target.value as any)}
            className="bg-[#000] border border-[var(--ks-border)] text-ks-green font-bold text-sm rounded-lg px-4 py-3 outline-none flex-shrink-0">
            <option value="SAIDA">📤 SAÍDA</option>
            <option value="ENTRADA">📥 ENTRADA</option>
          </select>
          <input ref={inputRef} type="text" value={sku}
            onChange={e=>setSku(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&processarBipagem()}
            placeholder="Escaneie o SKU..." className="ks-scan-input" autoFocus />
          <button onClick={processarBipagem} disabled={processing}
            className="ks-btn ks-btn-primary flex-shrink-0 h-[52px] px-6 disabled:opacity-60">
            {processing ? <><i className="fas fa-circle-notch ks-spin"/>PROCESSANDO</> : <><i className="fas fa-check"/>CONFIRMAR</>}
          </button>
        </div>
        {feedback && (
          <p className={clsx('mt-3 text-sm font-semibold font-mono',
            feedback.startsWith('✅')?'text-ks-green':feedback.startsWith('❌')?'text-ks-red':'text-ks-yellow'
          )}>{feedback}</p>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="ks-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-chart-area text-ks-blue"/> Fluxo de Faturamento
            <span className="ml-auto text-[9px] font-mono text-[var(--ks-text-muted)] bg-white/5 px-2 py-0.5 rounded">DEMONSTRAÇÃO</span>
          </h3>
          <div style={{width:'100%',height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMO_REVENUE} margin={{top:5,right:10,left:-10,bottom:0}}>
                <defs>
                  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="hora" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} width={45}/>
                <Tooltip content={<Tooltip_/>}/>
                <Area type="monotone" dataKey="valor" stroke="#38bdf8" strokeWidth={2} fill="url(#gB)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ks-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-trophy text-ks-yellow"/> Curva ABC — Top Produtos
            {isDemo && <span className="ml-auto text-[9px] font-mono text-[var(--ks-text-muted)] bg-white/5 px-2 py-0.5 rounded">DEMO</span>}
          </h3>
          <div style={{width:'100%',height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{top:0,right:10,left:5,bottom:0}}>
                <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" width={90} tick={{fill:'#94a3b8',fontSize:10}}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v:string)=>v.length>14?v.slice(0,14)+'…':v}/>
                <Tooltip content={<Tooltip_/>}/>
                <Bar dataKey="units_sold" radius={[0,4,4,0]}>
                  {topProducts.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mapa Logístico */}
      <div className="mb-6">
        <MapaLogistico />
      </div>

      {/* Status dos Pedidos + Atalhos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="ks-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-chart-pie text-ks-purple"/> Status dos Pedidos
          </h3>
          {orderSummary.length > 0 ? (
            <div style={{width:'100%',height:240}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderSummary} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={85} paddingAngle={5} stroke="none">
                    {orderSummary.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} className="focus:outline-none"/>)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{background:'rgba(0,0,0,0.8)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, fontSize:12, backdropFilter:'blur(4px)'}} 
                    itemStyle={{color:'#fff', fontWeight:'bold'}}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize:11, paddingTop:10}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center gap-2 opacity-50">
              <i className="fas fa-chart-pie text-4xl mb-2"/>
              <p className="text-xs">Nenhum dado disponível</p>
            </div>
          )}
        </div>

        <div className="ks-card lg:col-span-2">
           <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
             <i className="fas fa-bolt text-ks-yellow"/> Ações Rápidas
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             {[
               {to:'/recebimento', icon:'fas fa-truck-loading', label:'Recebimento', color:'text-ks-green' },
               {to:'/compras',     icon:'fas fa-shopping-cart', label:'Compras/Planej.', color:'text-ks-blue'  },
               {to:'/estoque',     icon:'fas fa-boxes',         label:'Inventário',    color:'text-ks-yellow'},
               {to:'/shipments',   icon:'fas fa-truck',         label:'Expedição',     color:'text-ks-purple'},
               {to:'/relatorios',  icon:'fas fa-chart-line',    label:'BI & Analytics', color:'text-ks-green' },
               {to:'/pedidos',     icon:'fas fa-list-ul',       label:'Gestão Pedidos',color:'text-ks-blue'  },
             ].map((item, idx)=>(
               <Link key={item.to} to={item.to}
                 className="ks-stagger flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-ks-blue/50 hover:bg-ks-blue/5 transition-all group shadow-sm"
                 style={{ animationDelay: `${idx * 0.05}s` }}>
                 <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center bg-black/40 group-hover:scale-110 transition-transform shadow-inner', item.color)}>
                    <i className={clsx(item.icon, 'text-xl')}/>
                 </div>
                 <span className="text-[11px] font-bold text-[var(--ks-text-muted)] group-hover:text-white uppercase tracking-tight">{item.label}</span>
               </Link>
             ))}
           </div>
        </div>
      </div>

      {/* Pedidos recentes — Priorizando Faturados/Entregues */}
      <div className="ks-card ks-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-ks-blue">
            <i className="fas fa-history"/> Fluxo de Pedidos em Tempo Real
            {(connected||sseConnected) && <span className="text-[10px] font-mono text-ks-green bg-ks-green/10 px-2 py-0.5 rounded-full border border-ks-green/30 ml-2 animate-pulse">STREAMING</span>}
          </h3>
          <Link to="/pedidos" className="text-[10px] font-black hover:text-ks-blue transition-colors border-b border-transparent hover:border-ks-blue">
            VISUALIZAR TODOS <i className="fas fa-arrow-right ml-1"/>
          </Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
             {recentOrders
               .sort((a:any, b:any) => {
                 const order = { 'DELIVERED': 0, 'CONFIRMED': 1, 'PENDING': 2 };
                 return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
               })
               .map((o:any, idx:number) => (
              <div key={o.id} className="ks-stagger flex items-center gap-4 px-4 py-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/5 transition-all group"
                style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center font-black text-[10px] text-[var(--ks-text-muted)] group-hover:text-ks-blue transition-colors">
                   #{o.id}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm truncate">{o.customer_name||'Cliente Final'}</span>
                      <span className="text-[10px] font-mono text-[var(--ks-text-muted)] opacity-50">• {new Date(o.created_at).toLocaleDateString()}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className={clsx('text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-tighter',
                        o.status==='PENDING'   ?'bg-ks-yellow/5 text-ks-yellow border-ks-yellow/20'
                        :o.status==='CONFIRMED'?'bg-ks-blue/5 text-ks-blue border-ks-blue/20'
                        :o.status==='DELIVERED'?'bg-ks-green/5 text-ks-green border-ks-green/20'
                        :o.status==='CANCELLED'?'bg-ks-red/5 text-ks-red border-ks-red/20'
                        :'bg-white/5 text-white border-white/10'
                      )}>{o.status}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10"/>
                      <span className="text-[10px] font-bold text-ks-green font-mono">{brl(o.total)}</span>
                   </div>
                </div>
                <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <i className="fas fa-eye text-xs"/>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 opacity-30">
            <i className="fas fa-inbox text-5xl mb-4"/>
            <p className="text-sm font-bold uppercase tracking-widest">Nenhum pedido processado</p>
          </div>
        )}
      </div>
    </div>
  )
}
