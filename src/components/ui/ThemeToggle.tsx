/**
 * ThemeToggle — interruptor dark/light mode.
 * Ícone de lua (dark) ou sol (light).
 * Aplica classe no <html> via ThemeStore.
 */
import { useThemeStore } from '@/store/themeStore'
import { clsx } from 'clsx'

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={clsx(
        'relative flex items-center gap-2 px-3 py-1.5 rounded-full',
        'border border-[var(--ks-border)] text-xs font-semibold',
        'transition-all duration-300 cursor-pointer',
        isDark
          ? 'bg-[#1a1a1a] text-ks-blue hover:border-ks-blue'
          : 'bg-[#1e3160] text-ks-yellow hover:border-ks-yellow'
      )}
    >
      {/* Sol (modo claro ativo) ou Lua (modo escuro ativo) */}
      <i className={clsx(
        'text-sm transition-transform duration-300',
        isDark ? 'fas fa-moon' : 'fas fa-sun rotate-180'
      )} />
      <span className="hidden sm:inline">
        {isDark ? 'DARK' : 'LIGHT'}
      </span>

      {/* Indicador de estado — bolinha animada */}
      <span className={clsx(
        'w-2 h-2 rounded-full transition-colors duration-300',
        isDark ? 'bg-ks-blue ks-pulse-neon' : 'bg-ks-yellow'
      )} />
    </button>
  )
}
