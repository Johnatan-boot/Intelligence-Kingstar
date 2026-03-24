/**
 * Navbar — com indicador SSE de conexão em tempo real
 */
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useRealtime } from '@/hooks/useRealtime'

interface NavbarProps { onMenuToggle: () => void }

export function Navbar({ onMenuToggle }: NavbarProps) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('pt-BR'))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('pt-BR')), 1000)
    return () => clearInterval(id)
  }, [])

  const user = useAuthStore(s => s.user)
  const { connected, alerts, score } = useRealtime()
  const hasAlerts = alerts.some(a => a.severity === 'critical')

  return (
    <header className={clsx(
      'flex items-center justify-between flex-shrink-0',
      'h-14 px-4 sm:px-6',
      'border-b border-[var(--ks-border)]',
      'bg-[var(--ks-navbar)] transition-colors duration-300'
    )}>
      {/* Esquerda */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-[var(--ks-text-muted)] hover:text-white transition-all"
        >
          <i className="fas fa-bars text-sm" />
        </button>
        <span className="text-ks-blue font-mono text-xs sm:text-sm font-bold tracking-widest hidden sm:block">
          OPERATIONAL CORE
        </span>
        <div className="hidden sm:block w-px h-4 bg-[var(--ks-border)]" />
        <span className="font-mono text-[var(--ks-text-muted)] text-xs tabular-nums">{time}</span>

        {/* Indicador SSE */}
        <div className="flex items-center gap-1.5">
          <span className={clsx('w-1.5 h-1.5 rounded-full', connected ? (hasAlerts ? 'bg-ks-red ks-blink' : 'bg-ks-green ks-blink') : 'bg-[var(--ks-text-muted)]')} />
          <span className={clsx('text-[9px] font-mono font-bold tracking-widest hidden sm:block',
            connected ? (hasAlerts ? 'text-ks-red' : 'text-ks-green') : 'text-[var(--ks-text-muted)]'
          )}>
            {connected ? (hasAlerts ? 'ALERTA' : 'LIVE') : 'OFFLINE'}
          </span>
        </div>

        {/* Score operacional mini */}
        {score !== null && (
          <div className={clsx('hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono font-bold border',
            score >= 90 ? 'bg-ks-green/10 text-ks-green border-ks-green/30'
            : score >= 75 ? 'bg-ks-blue/10 text-ks-blue border-ks-blue/30'
            : 'bg-ks-red/10 text-ks-red border-ks-red/30'
          )}>
            <i className="fas fa-tachometer-alt" />
            SCORE {score}
          </div>
        )}
      </div>

      {/* Direita */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Badge de alertas */}
        {alerts.length > 0 && (
          <div className="relative">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg text-ks-red hover:bg-ks-red/10 transition-colors cursor-pointer">
              <i className="fas fa-bell text-sm" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ks-red text-white text-[9px] font-black flex items-center justify-center">
                {alerts.length > 9 ? '9+' : alerts.length}
              </span>
            </div>
          </div>
        )}
        <ThemeToggle />
        <div className="hidden sm:block w-px h-4 bg-[var(--ks-border)]" />
        <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[var(--ks-border)]">
          <div className="w-6 h-6 bg-ks-blue rounded-md flex items-center justify-center text-black text-[10px] font-black flex-shrink-0">
            <i className="fas fa-user-tie" />
          </div>
          <div className="hidden sm:block">
            <p className="text-white text-xs font-semibold leading-none mb-0.5">{user?.name ?? 'Usuário'}</p>
            <p className="text-[9px] text-[var(--ks-text-muted)] uppercase">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
