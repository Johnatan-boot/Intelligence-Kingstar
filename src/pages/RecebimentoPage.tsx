/**
 * RecebimentoPage — Recebimento Inteligente (Logistics v2)
 * Fluxo guiado com 3 conferências e real-time sync via Socket.io.
 */
import { useState, useEffect, type ChangeEvent } from 'react'
import { clsx } from 'clsx'
import { socket } from '@/services/socket'
import { toast } from '@/store/notificationStore'
import { logisticsApi } from '@/services/api'

interface ProdutoConferencia {
  sku: string;
  nome: string;
  qtdNota: number;
  qtdConferida: number;
  gaiola: string;
}

export function RecebimentoPage() {
  // Identificação da Carga
  const [nf, setNf] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [placa, setPlaca] = useState('')
  const [isValidated, setIsValidated] = useState(false)
  const [purchaseOrderId, setPurchaseOrderId] = useState<number | null>(null)
  const [batchId, setBatchId] = useState<number | null>(null)
  const [evidenceBase64, setEvidenceBase64] = useState<string>('')
  
  // Status e Conferência
  const [status, setStatus] = useState<'Aguardando' | 'Em Conferência' | 'Liberado' | 'Divergente'>('Aguardando')
  const [tentativa, setTentativa] = useState(1)
  const [loading, setLoading] = useState(false)

  // Itens da Nota
  const [itens, setItens] = useState<ProdutoConferencia[]>([
    { sku: 'KS-1001', nome: 'Colchão King Star Lux', qtdNota: 10, qtdConferida: 0, gaiola: 'G1' },
    { sku: 'KS-1002', nome: 'Box Duo King', qtdNota: 5, qtdConferida: 0, gaiola: 'G2' }
  ])

  useEffect(() => {
    // Sincronismo automático com o Planejamento/Compras
    socket.on('truck_arrived', (data) => {
      toast.info(`🚚 Caminhão detectado: NF ${data.invoice_number}`);
      setNf(data.invoice_number || '');
      setFornecedor(data.provider || 'Fornecedor Identificado');
      setPlaca(data.license_plate || '');
      setPurchaseOrderId(data.purchase_order_id ? Number(data.purchase_order_id) : null);
      setBatchId(data.id ? Number(data.id) : null);
      // Feedback visual de recebimento de evento
      document.getElementById('card-id')?.classList.add('ks-pulse-neon');
      setTimeout(() => document.getElementById('card-id')?.classList.remove('ks-pulse-neon'), 2000);
    });

    socket.on('conference_divergence', (data) => {
      toast.warning(`⚠️ Divergência detectada no lote ${data.batchId}!`);
      setStatus('Divergente');
    });

    return () => {
      socket.off('truck_arrived');
      socket.off('conference_divergence');
    }
  }, []);

  const validarDados = async () => {
    if (!nf || !placa || !fornecedor) { toast.error('Preencha NF, Fornecedor e Placa'); return }
    if (!purchaseOrderId && !batchId) { toast.error('Sem pedido vinculado de Compras'); return }
    setLoading(true)
    try {
      if (!batchId && purchaseOrderId) {
        const batch = await logisticsApi.receiving.batches.create({
          purchase_order_id: purchaseOrderId,
          invoice_number: nf,
          license_plate: placa,
          provider_name: fornecedor
        })
        setBatchId(Number(batch.id))
      }
      setIsValidated(true)
      setStatus('Em Conferência')
      toast.success('Entrada autorizada! Iniciando conferência cega.')
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao iniciar recebimento')
    } finally {
      setLoading(false)
    }
  }

  const registrarContagem = (sku: string, qtd: number) => {
    setItens(prev => prev.map(item => 
      item.sku === sku ? { ...item, qtdConferida: qtd } : item
    ))
  }

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const onEvidenceSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await toBase64(file)
    setEvidenceBase64(b64)
    toast.success('Evidência anexada')
  }

  const finalizarRodada = async () => {
    if (!batchId) {
      toast.error('Lote de recebimento não iniciado')
      return
    }
    setLoading(true)
    const temDivergencia = itens.some(i => i.qtdConferida !== i.qtdNota)
    try {
      for (const item of itens) {
        await logisticsApi.receiving.conference(batchId, {
          product_id: Number(item.sku.replace(/\D/g, '')) || 1,
          round_number: tentativa,
          quantity_counted: item.qtdConferida,
          invoice_number: nf,
          provider_name: fornecedor,
          license_plate: placa,
          evidence_image_base64: tentativa === 3 ? evidenceBase64 : undefined
        })
      }

      if (tentativa < 3) {
        setTentativa(prev => prev + 1)
        setItens(prev => prev.map(i => ({ ...i, qtdConferida: 0 })))
        toast.info(`Rodada ${tentativa} registrada. Próxima conferência liberada.`)
      } else if (temDivergencia) {
        setStatus('Divergente')
        await logisticsApi.receiving.batches.updateStatus(batchId, 'DIVERGENT')
        toast.error('Divergência após 3 conferências. Lote bloqueado.')
      } else {
        if (!evidenceBase64) {
          toast.error('Anexe o print da conferência para liberar o lote.')
          return
        }
        setStatus('Liberado')
        await logisticsApi.receiving.batches.updateStatus(batchId, 'RELEASED')
        toast.success('3 conferências concluídas e lote liberado com evidência.')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao registrar conferência')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ks-container ks-fade-up">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="ks-stagger" style={{ animationDelay: '0.1s' }}>
          <h1 className="font-display text-3xl font-black text-ks-blue uppercase tracking-tighter flex items-center gap-3">
             <i className="fas fa-truck-loading text-ks-green"/>
             Recebimento Inteligente
          </h1>
          <p className="text-[var(--ks-text-muted)] text-[10px] uppercase font-mono tracking-[4px] mt-1 border-l-2 border-ks-green pl-3">
            LOGÍSTICA OPERACIONAL KINGSTAR v2.4
          </p>
        </div>
        
        <div className="flex gap-3 ks-stagger" style={{ animationDelay: '0.2s' }}>
           <div className={clsx(
            'px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest border transition-all duration-500 flex items-center gap-2',
            status === 'Aguardando' && 'bg-ks-blue/5 text-ks-blue border-ks-blue/30',
            status === 'Em Conferência' && 'bg-ks-yellow/5 text-ks-yellow border-ks-yellow/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]',
            status === 'Liberado' && 'bg-ks-green/5 text-ks-green border-ks-green/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
            status === 'Divergente' && 'bg-ks-red/5 text-ks-red border-ks-red/50 animate-pulse'
          )}>
            <span className={clsx('w-2 h-2 rounded-full', 
              status === 'Aguardando' ? 'bg-ks-blue' : status === 'Em Conferência' ? 'bg-ks-yellow' : status === 'Liberado' ? 'bg-ks-green' : 'bg-ks-red'
            )}/>
            {status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* IDENTIFICAÇÃO */}
        <div className="xl:col-span-1 space-y-6 ks-stagger" style={{ animationDelay: '0.3s' }}>
          <div id="card-id" className="ks-card ks-card-io overflow-hidden group transition-all duration-500 hover:border-ks-blue/40">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-[10px] uppercase text-[var(--ks-text-muted)] tracking-widest">
                 Identificação da Carga
               </h3>
               <i className="fas fa-shield-alt text-ks-blue opacity-50 group-hover:opacity-100 transition-opacity"/>
            </div>
            
            <div className="space-y-5">
              <div className="group/input">
                <label className="text-[10px] uppercase font-bold text-[var(--ks-text-muted)] mb-1.5 block group-hover/input:text-ks-blue transition-colors">Nota Fiscal (NF)</label>
                <div className="relative">
                   <i className="fas fa-file-invoice absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover/input:text-ks-blue transition-colors"/>
                   <input type="text" value={nf} onChange={e=>setNf(e.target.value)} disabled={isValidated}
                    className="w-full bg-black/40 border border-[var(--ks-border)] rounded-xl py-3.5 pl-11 pr-4 text-sm font-mono focus:border-ks-blue focus:ring-1 focus:ring-ks-blue/20 outline-none transition-all placeholder:text-white/10" 
                    placeholder="000.000.000"/>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--ks-text-muted)] mb-1.5 block">Fornecedor</label>
                <input type="text" value={fornecedor} onChange={e=>setFornecedor(e.target.value)} disabled={isValidated}
                  className="w-full bg-black/40 border border-[var(--ks-border)] rounded-xl py-3.5 px-4 text-sm focus:border-ks-blue outline-none transition-all" 
                  placeholder="Nome do Fornecedor"/>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--ks-text-muted)] mb-1.5 block">Placa do Veículo</label>
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <input type="text" value={placa} onChange={e=>setPlaca(e.target.value.toUpperCase())} 
                        disabled={isValidated} 
                        className="w-full bg-black/40 border-b-2 border-ks-green/40 border-x-0 border-t-0 py-3.5 px-0 text-lg font-black tracking-widest text-ks-green outline-none focus:border-ks-green transition-all placeholder:text-white/5" 
                        placeholder="ABC-1234"/>
                   </div>
                   {!isValidated && (
                     <button onClick={validarDados} disabled={loading} 
                       className="ks-btn ks-btn-primary rounded-xl px-5 h-[52px] group/btn shadow-lg shadow-ks-blue/20">
                        {loading ? <i className="fas fa-spinner ks-spin"/> : <i className="fas fa-barcode group-hover/btn:scale-110 transition-transform"/>}
                     </button>
                   )}
                </div>
              </div>
            </div>
          </div>

          <div className="ks-card bg-ks-bg-hover flex flex-col gap-3">
             <label className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group cursor-pointer">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-ks-blue/10 flex items-center justify-center text-ks-blue">
                      <i className="fas fa-camera text-xs"/>
                   </div>
                   <span className="text-xs font-bold text-[var(--ks-text-muted)] group-hover:text-white transition-colors">
                    {evidenceBase64 ? 'Evidência anexada' : 'Anexar print de evidência'}
                   </span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={onEvidenceSelected} />
                <i className="fas fa-chevron-right text-[10px] opacity-0 group-hover:opacity-50 group-hover:translate-x-1 transition-all"/>
             </label>
             <button className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group border border-dashed border-white/5">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-ks-green/10 flex items-center justify-center text-ks-green">
                      <i className="fas fa-file-excel text-xs"/>
                   </div>
                   <span className="text-xs font-bold text-[var(--ks-text-muted)] group-hover:text-white transition-colors">Relatório de Divergência</span>
                </div>
                <i className="fas fa-download text-[10px] opacity-50"/>
             </button>
          </div>
        </div>

        {/* CONFERÊNCIA */}
        <div className="xl:col-span-3 space-y-6 ks-stagger" style={{ animationDelay: '0.4s' }}>
          <div className="ks-card p-0 overflow-hidden border border-[var(--ks-border)] shadow-2xl">
             <div className="p-5 border-b border-[var(--ks-border)] flex items-center justify-between bg-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                   <h3 className="font-black text-sm uppercase tracking-widest">Checkout de Doca</h3>
                   <div className="flex gap-1.5 ml-4">
                      {[1, 2, 3].map(t => (
                         <div key={t} className="flex flex-col items-center">
                            <span className={clsx(
                              'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-500',
                              tentativa === t ? 'bg-ks-blue text-white border-ks-blue scale-110' : tentativa > t ? 'bg-ks-green/20 text-ks-green border-ks-green/20' : 'bg-transparent border-white/10 text-white/20'
                            )}>
                               {tentativa > t ? <i className="fas fa-check"/> : t}
                            </span>
                            <span className="text-[8px] mt-1 font-bold opacity-30">ROD{t}</span>
                         </div>
                      ))}
                   </div>
                </div>
                {status === 'Em Conferência' && (
                  <div className="text-[10px] font-mono text-ks-yellow animate-pulse bg-ks-yellow/5 px-3 py-1 rounded-full border border-ks-yellow/20">
                    STATUS: AGUARDANDO BI-PAGEM
                  </div>
                )}
             </div>
             
             <div className="overflow-x-auto">
                <table className="ks-table">
                   <thead>
                     <tr className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-[var(--ks-text-muted)]">
                       <th className="py-4 pl-6">SKU / DESCRIÇÃO</th>
                       <th className="text-center">PREVISTO</th>
                       <th className="text-center">CONFERIDO</th>
                       <th className="text-center">STATUS</th>
                       <th className="pr-6">GAIOLA</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {itens.map((item, idx) => {
                       const diff = item.qtdConferida - item.qtdNota;
                       return (
                         <tr key={item.sku} className="group hover:bg-white/[0.02] transition-colors">
                           <td className="py-5 pl-6">
                             <div className="font-mono text-ks-blue text-xs font-bold leading-none mb-1.5">{item.sku}</div>
                             <div className="text-sm font-semibold text-white/90">{item.nome}</div>
                           </td>
                           <td className="text-center">
                              <span className="text-lg font-display text-white/50">{item.qtdNota}</span>
                           </td>
                           <td className="text-center">
                              <input type="number" value={item.qtdConferida} onChange={e=>registrarContagem(item.sku, Number(e.target.value))}
                                className="w-20 bg-black/60 border border-white/10 rounded-xl text-center py-2.5 text-base font-display text-ks-blue focus:border-ks-blue outline-none transition-all" 
                                disabled={status!=='Em Conferência'}/>
                           </td>
                           <td className="text-center">
                              <div className={clsx(
                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border',
                                diff === 0 ? 'bg-ks-green/5 text-ks-green border-ks-green/20' : 'bg-ks-red/5 text-ks-red border-ks-red/20 animate-pulse'
                              )}>
                                {diff === 0 ? 'CONFERIDO' : `DIFERENÇA: ${diff}`}
                              </div>
                           </td>
                           <td className="pr-6">
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-ks-blue animate-pulse"/>
                                 <span className="text-xs font-mono font-bold text-ks-blue">{item.gaiola}</span>
                              </div>
                           </td>
                         </tr>
                       )
                     })}
                   </tbody>
                </table>
             </div>
             
             <div className="p-6 bg-black/20 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-4">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Total Itens</span>
                      <span className="text-xl font-display font-black">15 <span className="text-xs font-sans opacity-20">sku</span></span>
                   </div>
                   <div className="w-px h-8 bg-white/10 mx-2 self-center"/>
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Volume Estimado</span>
                      <span className="text-xl font-display font-black text-ks-green">1.2 <span className="text-xs font-sans opacity-20">ton</span></span>
                   </div>
                </div>

                <div className="flex items-center gap-3">
                   <button className="ks-btn border border-ks-red/30 text-ks-red hover:bg-ks-red/10 px-6 h-12 text-xs font-black uppercase" 
                     onClick={()=>setStatus('Divergente')}>
                      BLOQUEIO MANUAL
                   </button>
                   <button className="ks-btn ks-btn-primary px-8 h-12 text-xs font-black uppercase shadow-lg shadow-ks-blue/20 disabled:opacity-60" 
                     onClick={finalizarRodada} disabled={status!=='Em Conferência' || loading}>
                     {tentativa < 3 ? 'FINALIZAR RODADA' : 'FECHAR LOTE (3/3)'} 
                     <i className="fas fa-chevron-right ml-2 text-[10px]"/>
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Bot flutuante para avisos em tempo real */}
      <div className="fixed bottom-8 right-8 w-14 h-14 bg-ks-green rounded-2xl flex items-center justify-center shadow-2xl shadow-ks-green/40 ks-pulse-neon cursor-pointer group transition-transform hover:scale-110 hover:-rotate-6 active:scale-95">
         <i className="fas fa-robot text-black text-2xl group-hover:animate-bounce"/>
         <div className="absolute -top-1 -right-1 w-4 h-4 bg-ks-red border-2 border-ks-bg rounded-full animate-bounce"/>
      </div>
    </div>
  )
}
