/**
 * KpiCard — cartão de métrica do Core.
 * Props: label, value, accentColor, icon, trend
 */
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

type Accent = 'yellow' | 'blue' | 'green' | 'red' | 'purple'

interface KpiCardProps {
  label:    string
  value:    string | number
  icon?:    string          /* Classe Font Awesome: "fas fa-box" */
  accent?:  Accent
  trend?:   number          /* % de variação — positivo=alta, negativo=baixa */
  loading?: boolean
  className?: string
  children?: ReactNode
}

/* Mapa accent → cores Tailwind */
const accentMap: Record<Accent, { border: string; icon: string; glow: string }> = {
  yellow: { border: 'border-ks-yellow', icon: 'text-ks-yellow', glow: 'shadow-neon-yellow' },
  blue:   { border: 'border-ks-blue',   icon: 'text-ks-blue',   glow: 'shadow-neon-blue'   },
  green:  { border: 'border-ks-green',  icon: 'text-ks-green',  glow: 'shadow-neon-green'  },
  red:    { border: 'border-ks-red',    icon: 'text-ks-red',    glow: 'shadow-neon-red'    },
  purple: { border: 'border-ks-purple', icon: 'text-ks-purple', glow: ''                   },
}

export function KpiCard({ label, value, icon, accent = 'blue', trend, loading, className, children }: KpiCardProps) {
  const ac = accentMap[accent]

  return (
    /* Card com borda esquerda colorida — design pattern do original */
    <div className={clsx(
      'ks-card ks-fade-up relative overflow-hidden',
      'border-l-4',
      ac.border,
      className
    )}>
      {/* Cabeçalho: ícone + label */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[var(--ks-text-muted)] uppercase tracking-widest">
          {label}
        </p>
        {icon && (
          <i className={clsx(icon, ac.icon, 'text-lg opacity-70')} />
        )}
      </div>

      {/* Valor principal */}
      {loading ? (
        <div className="h-8 w-24 rounded bg-white/5 animate-pulse" />
      ) : (
        <p className="font-display text-2xl font-bold text-[var(--ks-text-main)] leading-none">
          {value}
        </p>
      )}

      {/* Trend indicator */}
      {trend !== undefined && !loading && (
        <div className={clsx(
          'flex items-center gap-1 mt-2 text-xs font-semibold',
          trend >= 0 ? 'text-ks-green' : 'text-ks-red'
        )}>
          <i className={`fas fa-arrow-${trend >= 0 ? 'up' : 'down'} text-[10px]`} />
          <span>{Math.abs(trend)}% vs ontem</span>
        </div>
      )}

      {children}
    </div>
  )
}
