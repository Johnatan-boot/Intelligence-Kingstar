/**
 * ToastContainer — notificações flutuantes (canto superior direito).
 * Lê do NotificationStore e renderiza cada toast com animação slide-in.
 */
import { clsx } from 'clsx'
import { useNotificationStore, type Toast } from '@/store/notificationStore'

const iconMap = {
  success: { icon: 'fas fa-check-circle', border: 'border-l-ks-green',  text: 'text-ks-green'  },
  error:   { icon: 'fas fa-times-circle', border: 'border-l-ks-red',    text: 'text-ks-red'    },
  info:    { icon: 'fas fa-info-circle',  border: 'border-l-ks-blue',   text: 'text-ks-blue'   },
  warning: { icon: 'fas fa-exclamation-triangle', border: 'border-l-ks-yellow', text: 'text-ks-yellow' },
}

function ToastItem({ toast }: { toast: Toast }) {
  const remove  = useNotificationStore(s => s.remove)
  const conf    = iconMap[toast.type]

  return (
    <div
      onClick={() => remove(toast.id)}
      className={clsx(
        'ks-slide-in flex items-center gap-3',
        'bg-[var(--ks-bg-card)] border border-[var(--ks-border)]',
        'border-l-4', conf.border,
        'rounded-lg px-4 py-3 shadow-card cursor-pointer',
        'hover:brightness-110 transition-all',
        'min-w-[280px] max-w-[360px]'
      )}
    >
      <i className={clsx(conf.icon, conf.text, 'text-base flex-shrink-0')} />
      <span className="text-sm text-[var(--ks-text-main)] flex-1">{toast.message}</span>
      <i className="fas fa-times text-[var(--ks-text-muted)] text-xs hover:text-white" />
    </div>
  )
}

export function ToastContainer() {
  const toasts = useNotificationStore(s => s.toasts)

  return (
    <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
