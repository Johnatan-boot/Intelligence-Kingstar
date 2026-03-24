/**
 * IntelligencePanel — Painel do Motor de IA
 *
 * Exibe em tempo real:
 *  - Score operacional (0–100) com nível
 *  - Alertas de ruptura de estoque
 *  - Alertas de SLA em risco
 *  - Recomendações acionáveis
 *
 * Dados vêm de 2 fontes:
 *  1. SSE (useRealtime) — pushed pelo servidor a cada 5min
 *  2. /intelligence/status — polling inicial + botão de atualização manual
 */
import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { useRealtime } from '@/hooks/useRealtime'
import http from '@/services/api'

interface RupturaItem {
  product_id: number; sku: string; name: string
  disponivel: number; saidas_por_dia: number
  dias_restantes: number; status: 'OK'|'ALERTA'|'CRITICO'|'RUPTURA'
}

interface SLAItem {
  order_id: number; customer_name: string; status: string
  horas_abertas: number; horas_restantes: number
  risco: 'BAIXO'|'ALTO'|'CRITICO'|'VIOLADO'; recomendacao: string
}

interface Score { score: number; nivel: string; componentes: { otif: number; picking: number; estoque: number } }

const RISCO_COLOR: Record<string, string> = {
  VIOLADO: 'text-ks-red bg-ks-red/10 border-ks-red/30',
  CRITICO: 'text-ks-red bg-ks-red/10 border-ks-red/30',
  ALTO:    'text-ks-yellow bg-ks-yellow/10 border-ks-yellow/30',
  BAIXO:   'text-ks-green bg-ks-green/10 border-ks-green/30',
}

const STATUS_COLOR: Record<string, string> = {
  RUPTURA: 'text-ks-red',
  CRITICO: 'text-ks-red',
  ALERTA:  'text-ks-yellow',
  OK:      'text-ks-green',
}

export function IntelligencePanel() {
  const { alerts, score: sseScore } = useRealtime()
  const [data,    setData]    = useState<{ score: Score; alertas: { estoque: RupturaItem[]; sla: SLAItem[] }; previsao: RupturaItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'score'|'ruptura'|'sla'|'alertas'>('score')

  const load = useCallback(async () => {
    try {
      const res = await http.get('/intelligence/status')
      setData(res.data)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { 
    load(); 
    const id = setInterval(load, 2 * 60 * 1000); // Polling faster (2min) for more "real-time" feel
    return () => clearInterval(id) 
  }, [load])

  const scoreVal = sseScore ?? data?.score?.score ?? null
  const nivel    = data?.score?.nivel ?? '—'
  const scoreColor = scoreVal === null ? '#94a3b8'
    : scoreVal >= 90 ? '#22c55e'
    : scoreVal >= 75 ? '#38bdf8'
    : scoreVal >= 60 ? '#fbbf24'
    : '#ef4444'

  const totalAlertas = (data?.alertas?.estoque?.length ?? 0) + (data?.alertas?.sla?.length ?? 0)

  return (
    <div className="ks-card overflow-hidden border-ks-purple/20 shadow-2xl shadow-ks-purple/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="font-black flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/80">
          <div className="w-8 h-8 rounded-xl bg-ks-purple/10 flex items-center justify-center text-ks-purple shadow-inner">
             <i className="fas fa-brain" />
          </div>
          Motor de IA Preditiva
          {totalAlertas > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-ks-red text-white text-[9px] font-black border border-ks-red/20 ks-blink">
              {totalAlertas} ALERTA{totalAlertas > 1 ? 'S' : ''}
            </span>
          )}
        </h3>
        <button onClick={load} disabled={loading} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-ks-purple/20 hover:text-ks-purple transition-all">
          <i className={clsx('fas fa-sync-alt text-xs', loading && 'ks-spin')} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-black/40 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
        {[
          { id:'score',  label:'Eficiência',   icon:'fas fa-tachometer-alt' },
          { id:'ruptura',label:'Rupturas',      icon:'fas fa-radiation' },
          { id:'sla',    label:'Riscos SLA',   icon:'fas fa-hourglass-half' },
          { id:'alertas',label:'Eventos Live',  icon:'fas fa-bolt' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all whitespace-nowrap',
              tab === t.id ? 'bg-ks-purple text-white shadow-lg shadow-ks-purple/20' : 'text-white/30 hover:text-white/60 hover:bg-white/5'
            )}>
            <i className={clsx(t.icon, 'text-xs')} /> {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[220px]">
        {/* TAB: SCORE */}
        {tab === 'score' && (
          <div className="ks-fade-up">
            <div className="flex flex-col md:flex-row items-center gap-8 px-4">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="8"
                    strokeDasharray={`${(scoreVal ?? 0) * 2.64} 264`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 5px ${scoreColor}40)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                  <span className="text-3xl font-black font-display leading-none" style={{ color: scoreColor }}>
                    {loading ? <i className="fas fa-spinner ks-spin text-sm"/> : scoreVal ?? '—'}
                  </span>
                  <span className="text-[8px] text-[var(--ks-text-muted)] font-black uppercase tracking-[0.2em] mt-1">PERCENTIL</span>
                </div>
              </div>
              <div className="flex-1 w-full text-center md:text-left">
                <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-3">
                   <p className="font-black text-[10px] tracking-widest uppercase" style={{ color: scoreColor }}>
                      <i className="fas fa-medal mr-2"/>
                      Performance: {nivel}
                   </p>
                </div>
                <p className="text-xs text-white/50 leading-relaxed max-w-[200px] mx-auto md:mx-0">
                   Indicador dinâmico de produtividade baseado no fluxo de pedidos e docas.
                </p>
              </div>
            </div>
            
            {data?.score?.componentes && (
              <div className="grid grid-cols-3 gap-3 mt-8">
                 {[
                   { label:'OTIF',    val: data.score.componentes.otif,    color: 'ks-blue' },
                   { label:'ESTOQUE', val: data.score.componentes.estoque, color: 'ks-green' },
                   { label:'PICKING', val: data.score.componentes.picking, color: 'ks-yellow' },
                 ].map(c => (
                   <div key={c.label} className="bg-black/20 p-3 rounded-2xl border border-white/5 text-center">
                      <div className="text-[8px] font-black text-white/20 uppercase mb-1">{c.label}</div>
                      <div className="text-sm font-black text-white/80">{c.val}%</div>
                      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className={clsx('h-full', `bg-${c.color}`)} style={{ width: `${c.val}%` }}/>
                      </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: RUPTURA */}
        {tab === 'ruptura' && (
          <div className="space-y-3 ks-fade-up">
            {loading ? (
              Array.from({length:3}).map((_,i) => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)
            ) : (data?.previsao ?? []).length === 0 ? (
              <div className="text-center py-12 bg-ks-green/5 border border-dashed border-ks-green/20 rounded-2xl">
                <i className="fas fa-check-double text-ks-green text-3xl mb-3 opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest text-ks-green">Inventário Saudável</p>
              </div>
            ) : (data?.previsao ?? []).map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-ks-red/30 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-ks-red/10 flex items-center justify-center text-ks-red">
                      <i className="fas fa-box-open text-sm"/>
                   </div>
                   <div className="min-w-0">
                     <p className="font-mono text-ks-blue text-[10px] font-black leading-none mb-1">{p.sku}</p>
                     <p className="text-xs font-bold truncate text-white/80">{p.name}</p>
                   </div>
                </div>
                <div className="text-right">
                  <p className={clsx('font-black text-sm', STATUS_COLOR[p.status])}>{p.disponivel} <span className="text-[10px] font-sans opacity-40">un</span></p>
                  <p className="text-[9px] font-black uppercase opacity-30 mt-0.5">
                    ESGOTAR EM: <span className="text-white/60">{p.dias_restantes >= 999 ? '∞' : p.dias_restantes} d</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: SLA */}
        {tab === 'sla' && (
          <div className="space-y-3 ks-fade-up">
            {loading ? (
              Array.from({length:3}).map((_,i) => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)
            ) : (data?.alertas?.sla ?? []).length === 0 ? (
              <div className="text-center py-12 bg-ks-blue/5 border border-dashed border-ks-blue/20 rounded-2xl">
                <i className="fas fa-clock text-ks-blue text-3xl mb-3 opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest text-ks-blue">Pedidos dentro do Prazo</p>
              </div>
            ) : (data?.alertas?.sla ?? []).map((s, i) => (
              <div key={i} className={clsx('p-4 rounded-2xl border transition-all hover:bg-white/5', RISCO_COLOR[s.risco])}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-[10px] uppercase tracking-tighter">ORDEM #{s.order_id}</span>
                  <span className={clsx('text-[8px] font-black px-2 py-0.5 rounded-full border bg-black/20', RISCO_COLOR[s.risco])}>{s.risco}</span>
                </div>
                <p className="text-xs font-bold text-white/80 mb-1">{s.customer_name}</p>
                <p className="text-[10px] opacity-60 italic">"{s.recomendacao}"</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB: ALERTAS SSE */}
        {tab === 'alertas' && (
          <div className="space-y-3 ks-fade-up">
            {alerts.length === 0 ? (
              <div className="text-center py-12 opacity-30">
                <i className="fas fa-stream text-4xl mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Aguardando Eventos...</p>
              </div>
            ) : alerts.map(a => (
              <div key={a.id} className={clsx('p-4 rounded-2xl border flex gap-4 items-start',
                a.severity === 'critical' ? 'bg-ks-red/5 border-ks-red/20 text-ks-red'
                : 'bg-ks-blue/5 border-ks-blue/20 text-ks-blue'
              )}>
                <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center flex-shrink-0">
                   <i className={clsx('fas', a.severity === 'critical' ? 'fa-bolt' : 'fa-info-circle')}/>
                </div>
                <div className="min-w-0">
                   <p className="font-black text-[10px] uppercase tracking-widest mb-1">{a.title}</p>
                   <p className="text-xs text-white/80 mb-2">{a.message}</p>
                   <span className="text-[9px] font-mono opacity-50">{new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
