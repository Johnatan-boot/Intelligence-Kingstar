/**
 * ComprasPage — Planejamento e Compras (Logistics v2)
 * Monitoramento de demanda e criação de Pedidos de Compra com real-time sync.
 */
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { socket } from '@/services/socket'
import { toast } from '@/store/notificationStore'

interface PedidoCompra {
  id: string;
  fornecedor: string;
  dataEntrega: string;
  status: 'Agendado' | 'Em Trânsito' | 'No Pátio' | 'Descarregando' | 'Divergente' | 'Finalizado';
  progresso: number;
}

export function ComprasPage() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([
    { id: 'PC-2024-001', fornecedor: 'Colchões Top Flex', dataEntrega: '2025-04-10', status: 'Em Trânsito', progresso: 0 },
    { id: 'PC-2024-002', fornecedor: 'King Star Factory', dataEntrega: '2025-04-12', status: 'Agendado', progresso: 0 },
    { id: 'PC-2024-003', fornecedor: 'Box & Cia', dataEntrega: '2025-04-09', status: 'Descarregando', progresso: 45 },
  ])
  
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newOrder, setNewOrder] = useState({ nf: '', provider: '', plate: '' })

  useEffect(() => {
    socket.on('truck_arrived', (data) => {
      toast.info(`🚚 Caminhão NF ${data.invoice_number} chegou ao CD!`);
      setPedidos(prev => prev.map(p => 
        p.id === 'PC-2024-002' ? { ...p, status: 'No Pátio' } : p
      ))
    })

    socket.on('conference_update', (data) => {
      setPedidos(prev => prev.map(p => 
        p.status === 'Descarregando' ? { ...p, progresso: Math.min(p.progresso + 10, 100) } : p
      ))
    })

    return () => {
      socket.off('truck_arrived')
      socket.off('conference_update')
    }
  }, [])

  const handleCreateOrder = () => {
    // Simular disparo de evento para o Recebimento
    socket.emit('truck_arrived', { 
      invoice_number: newOrder.nf, 
      provider: newOrder.provider, 
      license_plate: newOrder.plate 
    });
    toast.success('Pedido de Compra criado e enviado para o Recebimento!');
    setIsModalOpen(false);
    setNewOrder({ nf: '', provider: '', plate: '' });
  }

  return (
    <div className="ks-container ks-fade-up">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-ks-blue uppercase tracking-tighter">
            Central de Suprimentos
          </h1>
          <p className="text-[var(--ks-text-muted)] text-[10px] uppercase font-mono tracking-[4px] mt-1 border-l-2 border-ks-blue pl-3">
            PLANEJAMENTO OPERACIONAL & DEMANDA
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="ks-btn ks-btn-primary px-8 h-12 text-xs font-black uppercase shadow-lg shadow-ks-blue/20">
           <i className="fas fa-plus mr-2"/> NOVO PEDIDO DE COMPRA
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
         
         <div className="xl:col-span-1 space-y-6">
            <div className="ks-card ks-card-io bg-ks-blue/5 border-ks-blue/20">
               <div className="text-[10px] text-ks-blue uppercase font-black tracking-widest mb-2">OTIF do Fornecedor</div>
               <div className="text-4xl font-display font-black">94.8<span className="text-sm font-sans opacity-40 ml-1">%</span></div>
               <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-ks-blue w-[94%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"/>
               </div>
            </div>
            
            <div className="ks-card border border-white/5 bg-white/[0.02]">
               <h3 className="font-black text-[10px] uppercase mb-5 text-[var(--ks-text-muted)] tracking-widest">Inteligência de Reposição</h3>
               <div className="space-y-4">
                  <div className="p-4 bg-black/40 rounded-2xl border border-ks-red/20 group hover:border-ks-red/40 transition-all cursor-pointer">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-ks-red bg-ks-red/10 px-2 py-0.5 rounded">CRÍTICO</span>
                        <i className="fas fa-exclamation-triangle text-ks-red text-[10px] animate-pulse"/>
                     </div>
                     <div className="text-xs font-bold mb-1">Colchão King Star Lux</div>
                     <div className="text-[10px] text-[var(--ks-text-muted)]">Ruptura em 2 dias. Sugestão: 15 un.</div>
                  </div>
               </div>
            </div>
         </div>

         <div className="xl:col-span-3">
            <div className="ks-card p-0 overflow-hidden border border-white/5 shadow-2xl">
               <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
                  <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-3">
                    <span className="w-2.5 h-2.5 bg-ks-green rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"/> 
                    Monitor de Carga (Live CD)
                  </h3>
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-tighter opacity-60">
                     <span>Previstos: 08</span>
                     <span className="text-ks-green">Doca: 02</span>
                     <span className="text-ks-red">Atrasados: 01</span>
                  </div>
               </div>
               
               <div className="divide-y divide-white/5">
                  {pedidos.map(p => (
                     <div key={p.id}>
                        <div className={clsx(
                           'p-5 transition-all flex flex-wrap items-center justify-between gap-6 group cursor-pointer',
                           expandedId === p.id ? 'bg-ks-blue/5' : 'hover:bg-white/[0.02]'
                        )} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                           <div className="min-w-[180px]">
                              <div className="text-[10px] font-black text-ks-blue mb-1 uppercase tracking-widest">{p.id}</div>
                              <div className="font-black text-sm text-white/90">{p.fornecedor}</div>
                              <div className="text-[10px] text-[var(--ks-text-muted)] font-bold mt-1 uppercase tracking-tighter">ETA: {p.dataEntrega}</div>
                           </div>
                           
                           <div className="flex-1 min-w-[200px]">
                              <div className="flex justify-between text-[9px] font-black mb-1.5 uppercase tracking-widest opacity-40">
                                 <span>Status do Recebimento</span>
                                 <span>{p.progresso}%</span>
                              </div>
                              <div className="h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/5 p-[2px]">
                                 <div className={clsx(
                                   'h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(34,197,94,0.3)]',
                                   p.status === 'Divergente' ? 'bg-ks-red' : 'bg-ks-green'
                                 )} style={{ width: `${p.progresso}%` }}/>
                              </div>
                           </div>

                           <div className="flex items-center gap-5">
                              <div className={clsx(
                                'text-[9px] font-black px-4 py-1.5 rounded-xl border-2 uppercase tracking-widest transition-all',
                                p.status === 'Agendado' && 'bg-ks-blue/5 text-ks-blue border-ks-blue/20',
                                p.status === 'Descarregando' && 'bg-ks-yellow/5 text-ks-yellow border-ks-yellow/30 animate-pulse',
                                p.status === 'Divergente' && 'bg-ks-red/10 text-ks-red border-ks-red/40',
                                p.status === 'No Pátio' && 'bg-ks-green/5 text-ks-green border-ks-green/20'
                              )}>
                                {p.status}
                              </div>
                              <button className={clsx(
                                 'w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-all hover:bg-ks-blue/20 hover:text-ks-blue',
                                 expandedId === p.id && 'bg-ks-blue text-white'
                              )}>
                                 <i className={clsx('fas', expandedId === p.id ? 'fa-eye-slash' : 'fa-eye')}/>
                              </button>
                           </div>
                        </div>
                        
                        {/* DETAILS SECTION */}
                        {expandedId === p.id && (
                           <div className="p-6 bg-black/40 border-t border-white/5 ks-fade-up">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                 <div className="space-y-1">
                                    <div className="text-[10px] font-black text-white/30 uppercase">Motorista</div>
                                    <div className="text-sm font-bold">Ricardo Oliveira</div>
                                 </div>
                                 <div className="space-y-1">
                                    <div className="text-[10px] font-black text-white/30 uppercase">Placa</div>
                                    <div className="text-sm font-mono font-black text-ks-green">KSB-2026</div>
                                 </div>
                                 <div className="space-y-1">
                                    <div className="text-[10px] font-black text-white/30 uppercase">Lacre/Doc</div>
                                    <div className="text-sm font-mono font-bold">#NF-88122-00</div>
                                 </div>
                                 <div className="space-y-1">
                                    <div className="text-[10px] font-black text-white/30 uppercase">Doca Alocada</div>
                                    <div className="text-sm font-black text-ks-blue">DOCA 04</div>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* MODAL: NOVO PEDIDO */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <div className="ks-card max-w-md w-full border-ks-blue/30 shadow-[0_0_50px_rgba(59,130,246,0.2)] ks-bounce-in">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Novo Pedido de Compra</h3>
                  <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-ks-red/20 hover:text-ks-red transition-all">
                     <i className="fas fa-times"/>
                  </button>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className="text-[10px] uppercase font-black text-white/40 mb-2 block">Fornecedor</label>
                     <input type="text" value={newOrder.provider} onChange={e=>setNewOrder({...newOrder, provider: e.target.value})}
                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm focus:border-ks-blue outline-none transition-all" placeholder="Ex: King Star CD"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] uppercase font-black text-white/40 mb-2 block">Nota Fiscal (NF)</label>
                        <input type="text" value={newOrder.nf} onChange={e=>setNewOrder({...newOrder, nf: e.target.value})}
                           className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm focus:border-ks-blue outline-none transition-all font-mono" placeholder="000.000"/>
                     </div>
                     <div>
                        <label className="text-[10px] uppercase font-black text-white/40 mb-2 block">Placa</label>
                        <input type="text" value={newOrder.plate} onChange={e=>setNewOrder({...newOrder, plate: e.target.value})}
                           className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm focus:border-ks-blue outline-none transition-all font-mono uppercase" placeholder="ABC-1234"/>
                     </div>
                  </div>
                  
                  <div className="pt-4 flex gap-4">
                     <button onClick={() => setIsModalOpen(false)} className="flex-1 ks-btn border border-white/10 text-white/50 hover:bg-white/5 font-black uppercase text-xs h-14 rounded-2xl">DESCARTAR</button>
                     <button onClick={handleCreateOrder} className="flex-1 ks-btn ks-btn-primary font-black uppercase text-xs h-14 rounded-2xl shadow-xl shadow-ks-blue/20">CRIAR PEDIDO</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
