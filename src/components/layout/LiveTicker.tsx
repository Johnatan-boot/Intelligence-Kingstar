import { clsx } from 'clsx'
interface TickerProps { messages?: string[] }
const defaults = [
  'SISTEMA Inicializando protocolos de segurança...',
  'LOG Conexão com banco de dados estabelecida...',
  'REDE Monitoramento em tempo real ativo...',
  'KINGSTAR IO v3.0 — Inteligência Operacional Online',
]
export function LiveTicker({ messages = defaults }: TickerProps) {
  const content = [...messages, ...messages].join('   ●   ')
  return (
    <div className="flex h-8 items-center overflow-hidden border-b border-[var(--ks-border)] bg-[#0a0a0a] flex-shrink-0">
      <div className="flex items-center gap-2 bg-ks-blue text-black h-full px-4 font-mono text-[10px] font-black tracking-widest flex-shrink-0 whitespace-nowrap z-10">
        <i className="fas fa-broadcast-tower text-[10px]" /> LIVE FEED:
      </div>
      <div className="overflow-hidden flex-1">
        <div className="inline-block whitespace-nowrap pl-[100%] font-mono text-xs text-ks-blue font-semibold animate-ticker">
          {content}
        </div>
      </div>
    </div>
  )
}
