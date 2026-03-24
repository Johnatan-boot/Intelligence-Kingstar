/**
 * Sidebar — PROJETO C
 *
 * Comportamento por breakpoint:
 *  < 1024px  → drawer overlay (hamburger abre/fecha)
 *  ≥ 1024px  → estática 240px, botão para colapsar (72px)
 *
 * Implementação:
 *  - CSS classes .open / .collapsed controladas por props
 *  - Backdrop (overlay escuro) clicável fecha o drawer
 *  - NavLink do React Router aplica .active automaticamente
 */
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'

interface NavItem { to: string; icon: string; label: string }

const NAV: NavItem[] = [
  { to: '/core',        icon: 'fas fa-microchip',      label: 'Core'         },
  { to: '/estoque',     icon: 'fas fa-boxes',          label: 'Estoque'      },
  { to: '/pedidos',     icon: 'fas fa-shopping-cart',  label: 'Pedidos'      },
  { to: '/compras',     icon: 'fas fa-shopping-bag',   label: 'Compras'      },
  { to: '/picking',     icon: 'fas fa-hand-paper',     label: 'Picking'      },
  { to: '/shipments',   icon: 'fas fa-truck',          label: 'Expedição'    },
  { to: '/inventario',  icon: 'fas fa-clipboard-list', label: 'Inventário'   },
  { to: '/recebimento', icon: 'fas fa-truck-loading',  label: 'Recebimento'  },
  { to: '/relatorios',  icon: 'fas fa-chart-bar',      label: 'Relatórios'   },
]

const BOTTOM: NavItem[] = [
  { to: '/configuracoes', icon: 'fas fa-cog', label: 'Configurações' },
]

export interface SidebarProps {
  open:        boolean   /* drawer aberto (mobile/tablet) */
  collapsed:   boolean   /* colapso desktop */
  onClose:     () => void
  onCollapse:  () => void
}

export function Sidebar({ open, collapsed, onClose, onCollapse }: SidebarProps) {
  const { user, logout } = useAuthStore()

  return (
    <>
      {/* Backdrop — visível em mobile/tablet quando open=true */}
      <div
        onClick={onClose}
        className={clsx('ks-sidebar-backdrop', open && 'open')}
      />

      {/* Sidebar */}
      <aside className={clsx(
        'ks-sidebar',
        open      && 'open',
        collapsed && 'collapsed'
      )}>

        {/* LOGO */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--ks-border)] flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-ks-yellow flex items-center justify-center text-black font-black text-sm flex-shrink-0 ks-pulse-neon">
            <i className="fas fa-crown" />
          </div>
          <div className="ks-logo-text min-w-0">
            <p className="font-display font-black text-ks-yellow tracking-[3px] text-base leading-none">KINGSTAR</p>
            <p className="text-[9px] font-mono text-[var(--ks-text-muted)] tracking-widest mt-0.5">I.O OPERATIONAL</p>
          </div>
          {/* Botão fechar — apenas mobile/tablet */}
          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-[var(--ks-text-muted)] hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => clsx(
                'ks-menu-link',
                isActive && 'active',
                collapsed && 'justify-center px-0 py-3.5'
              )}
            >
              <i className={clsx(item.icon, 'text-base flex-shrink-0', collapsed ? '' : 'w-5 text-center')} />
              <span className="ks-menu-text truncate">{item.label}</span>
            </NavLink>
          ))}

          <div className="my-3 border-t border-[var(--ks-border)]" />

          {BOTTOM.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => clsx(
                'ks-menu-link',
                isActive && 'active',
                collapsed && 'justify-center px-0 py-3.5'
              )}
            >
              <i className={clsx(item.icon, 'text-base flex-shrink-0', collapsed ? '' : 'w-5 text-center')} />
              <span className="ks-menu-text truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* COLAPSO — só desktop */}
        <div className={clsx(
          'hidden lg:flex border-t border-[var(--ks-border)] p-3',
          collapsed ? 'justify-center' : 'justify-end'
        )}>
          <button
            onClick={onCollapse}
            title={collapsed ? 'Expandir' : 'Recolher'}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--ks-text-muted)] hover:text-white transition-all"
          >
            <i className={clsx('fas text-sm transition-transform duration-300', collapsed ? 'fa-chevron-right' : 'fa-chevron-left')} />
          </button>
        </div>

        {/* PERFIL */}
        <div className={clsx(
          'border-t border-[var(--ks-border)] p-3 flex-shrink-0',
          collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2'
        )}>
          <div className="w-8 h-8 rounded-lg bg-ks-blue flex-shrink-0 flex items-center justify-center text-black text-xs font-black">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name ?? 'Usuário'}</p>
              <p className="text-[10px] text-[var(--ks-text-muted)] uppercase tracking-wide">{user?.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            title="Sair"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--ks-text-muted)] hover:text-ks-red hover:bg-ks-red/10 transition-all flex-shrink-0"
          >
            <i className="fas fa-power-off text-sm" />
          </button>
        </div>
      </aside>
    </>
  )
}
