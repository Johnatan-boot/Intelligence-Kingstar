/**
 * RelatoriosPage — Central de Relatórios e Business Intelligence.
 */
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'
import { coreApi } from '@/services/api'
import { toast } from '@/store/notificationStore'
import type { OrderSummaryItem, TopProduct, CriticalStockItem } from '@/types'

const COLORS = ['#38bdf8','#22c55e','#fbbf24','#ef4444','#a78bfa','#f97316']
const brl = (v: number) => v?.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) ?? 'R$ 0,00'

const mockWeeklyRevenue = [
  { dia:'Seg', valor:4200 },{ dia:'Ter', valor:6800 },{ dia:'Qua', valor:3100 },
  { dia:'Qui', valor:7200 },{ dia:'Sex', valor:9400 },{ dia:'Sáb', valor:5600 },{ dia:'Dom', valor:2100 },
]

export function RelatoriosPage() {
  const [period,   setPeriod]   = useState<'daily'|'monthly'>('daily')
  const [revenue,  setRevenue]  = useState<any>(null)
  const [summary,  setSummary]  = useState<OrderSummaryItem[]>([])
  const [topProds, setTopProds] = useState<TopProduct[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [rev, sum, top] = await Promise.allSettled([
          coreApi.revenue(period),
          coreApi.orderSummary(),
          coreApi.topProducts(8),
        ])
        if (rev.status==='fulfilled')  setRevenue(rev.value)
        if (sum.status==='fulfilled')  setSummary(sum.value)
        if (top.status==='fulfilled' && top.value?.length>0) setTopProds(top.value)
      } catch { toast.error('Erro ao carregar relatórios') }
      finally { setLoading(false) }
    }
    load()
  }, [period])

  const exportReport = () => {
    toast.success('Exportando relatório em PDF... (em breve)')
  }

  return (
    <div className="ks-container">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ks-yellow flex items-center gap-3">
            <i className="fas fa-chart-bar"/> Relatórios & BI
          </h1>
          <p className="text-sm text-[var(--ks-text-muted)] mt-1">Inteligência de negócios em tempo real</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-[var(--ks-bg-card)] border border-[var(--ks-border)] rounded-lg overflow-hidden">
            {(['daily','monthly'] as const).map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} className={clsx('px-4 py-2 text-xs font-bold transition-all', period===p?'bg-ks-yellow text-black':'text-[var(--ks-text-muted)] hover:text-white')}>
                {p==='daily'?'HOJE':'MÊS'}
              </button>
            ))}
          </div>
          <button onClick={exportReport} className="ks-btn ks-btn-primary text-xs py-2 px-4"><i className="fas fa-file-pdf"/> EXPORTAR</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="ks-card border-l-4 border-ks-green">
          <p className="text-xs text-[var(--ks-text-muted)] uppercase tracking-widest mb-2">Faturamento {period==='daily'?'Hoje':'do Mês'}</p>
          <p className="font-display text-2xl font-bold text-ks-green">{loading?'...' : brl(revenue?.revenue??0)}</p>
        </div>
        <div className="ks-card border-l-4 border-ks-blue">
          <p className="text-xs text-[var(--ks-text-muted)] uppercase tracking-widest mb-2">Pedidos no Período</p>
          <p className="font-display text-2xl font-bold text-ks-blue">{loading?'...' : revenue?.order_count??0}</p>
        </div>
        <div className="ks-card border-l-4 border-ks-yellow">
          <p className="text-xs text-[var(--ks-text-muted)] uppercase tracking-widest mb-2">Ticket Médio</p>
          <p className="font-display text-2xl font-bold text-ks-yellow">
            {loading?'...' : brl((revenue?.revenue??0) / Math.max(revenue?.order_count??1,1))}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Faturamento semanal */}
        <div className="ks-card">
          <h3 className="text-sm font-semibold mb-5 flex items-center gap-2"><i className="fas fa-chart-area text-ks-blue"/>Faturamento Semanal</h3>
          <div style={{width:'100%',height:220}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockWeeklyRevenue} margin={{top:5,right:10,left:-10,bottom:0}}>
                <defs>
                  <linearGradient id="gradG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="dia" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false} width={50} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #333',borderRadius:8,fontSize:12}} formatter={(v:number)=>[brl(v),'Faturamento']}/>
                <Area type="monotone" dataKey="valor" stroke="#22c55e" strokeWidth={2} fill="url(#gradG)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status dos pedidos */}
        <div className="ks-card">
          <h3 className="text-sm font-semibold mb-5 flex items-center gap-2"><i className="fas fa-chart-pie text-ks-purple"/>Distribuição de Pedidos</h3>
          {summary.length>0 ? (
            <div style={{width:'100%',height:220}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                    {summary.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #333',borderRadius:8,fontSize:12}}/>
                  <Legend iconSize={8} wrapperStyle={{fontSize:11,color:'#94a3b8'}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[var(--ks-text-muted)] text-sm">
              {loading?<i className="fas fa-circle-notch ks-spin text-2xl"/>:<><i className="fas fa-chart-pie mr-2 opacity-30"/>Sem dados</>}
            </div>
          )}
        </div>
      </div>

      {/* Top produtos */}
      {topProds.length>0 && (
        <div className="ks-card mb-6">
          <h3 className="text-sm font-semibold mb-5 flex items-center gap-2"><i className="fas fa-trophy text-ks-yellow"/>Top Produtos — Curva ABC</h3>
          <div style={{width:'100%',height:250}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProds} layout="vertical" margin={{top:0,right:20,left:10,bottom:0}}>
                <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" width={100} tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v:string)=>v.length>14?v.slice(0,14)+'…':v}/>
                <Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #333',borderRadius:8,fontSize:11}} formatter={(v:number,n:string)=>[v,n==='units_sold'?'Unidades':'Receita']}/>
                <Bar dataKey="units_sold" name="Unidades" fill="#fbbf24" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela resumo de pedidos */}
      {summary.length>0 && (
        <div className="ks-card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--ks-border)]">
            <h3 className="text-sm font-semibold flex items-center gap-2"><i className="fas fa-table text-ks-blue"/>Resumo por Status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="ks-table">
              <thead><tr><th>Status</th><th>Quantidade</th><th>Valor Total</th><th>% do Total</th></tr></thead>
              <tbody>
                {summary.map(s=>{
                  const totalCount = summary.reduce((a,b)=>a+b.count,0)
                  return (
                    <tr key={s.status}>
                      <td><span className={clsx('text-[10px] font-bold px-2 py-1 rounded-lg border', COLORS.length&&'border-ks-blue/30 bg-ks-blue/10 text-ks-blue')}>{s.status}</span></td>
                      <td className="font-mono font-bold">{s.count}</td>
                      <td className="font-mono text-ks-green">{brl(s.total_value)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[var(--ks-bg-hover)] rounded-full h-1.5 max-w-[100px]">
                            <div className="h-1.5 rounded-full bg-ks-blue" style={{width:`${(s.count/totalCount*100).toFixed(0)}%`}}/>
                          </div>
                          <span className="text-xs text-[var(--ks-text-muted)]">{(s.count/totalCount*100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
