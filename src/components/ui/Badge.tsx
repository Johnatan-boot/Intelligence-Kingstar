/**
 * Badge — CORRIGIDO: tamanho e largura padronizados.
 * min-w garante que todos os badges tenham largura mínima consistente.
 */
import { clsx } from 'clsx'

type Variant = 'ok' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

const variants: Record<Variant, string> = {
  ok:      'ks-badge-ok',
  warning: 'ks-badge-warning',
  danger:  'ks-badge-danger',
  info:    'ks-badge-info',
  neutral: 'bg-white/5 text-[var(--ks-text-muted)] border border-[var(--ks-border)]',
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'ks-badge',
      /* Tamanho padronizado: min-w garante largura consistente na tabela */
      'min-w-[72px] justify-center',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}

/* Status de pedido → variante de cor */
export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    PENDING:   'warning',
    CONFIRMED: 'info',
    SHIPPED:   'info',
    DELIVERED: 'ok',
    CANCELLED: 'danger',
  }
  return <Badge variant={map[status] ?? 'neutral'}>{status}</Badge>
}

/* Status de estoque → variante de cor */
export function StockStatusBadge({ available, minimum = 5 }: { available: number; minimum?: number }) {
  if (available <= 0)      return <Badge variant="danger">RUPTURA</Badge>
  if (available < minimum) return <Badge variant="warning">BAIXO</Badge>
  return <Badge variant="ok">OK</Badge>
}

/* Status de picking */
export function PickingStatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    PENDING:     'warning',
    IN_PROGRESS: 'info',
    COMPLETED:   'ok',
    CANCELLED:   'danger',
    PARTIAL:     'warning',
    PICKED:      'ok',
  }
  return <Badge variant={map[status] ?? 'neutral'}>{status.replace('_', ' ')}</Badge>
}

/* Status de shipment */
export function ShipmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    PREPARING:  'warning',
    SHIPPED:    'info',
    IN_TRANSIT: 'info',
    DELIVERED:  'ok',
    FAILED:     'danger',
  }
  return <Badge variant={map[status] ?? 'neutral'}>{status.replace('_', ' ')}</Badge>
}
