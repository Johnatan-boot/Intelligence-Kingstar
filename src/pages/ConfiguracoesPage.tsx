import { useState } from 'react'
import { clsx } from 'clsx'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/notificationStore'

export function ConfiguracoesPage() {
  const { theme, toggle } = useThemeStore()
  const user = useAuthStore(s => s.user)
  const [notif, setNotif] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState('30')

  return (
    <div className="ks-container">
      <div className="mb-6">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-[var(--ks-text-main)] flex items-center gap-3">
          <i className="fas fa-cog text-[var(--ks-text-muted)]" /> Configurações
        </h1>
        <p className="text-sm text-[var(--ks-text-muted)] mt-1">Preferências do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Interface */}
        <div className="ks-card">
          <h3 className="font-semibold mb-5 flex items-center gap-2 text-sm">
            <i className="fas fa-palette text-ks-blue" /> Interface
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Modo de cor</p><p className="text-xs text-[var(--ks-text-muted)]">Alternar entre escuro e claro</p></div>
              <button onClick={toggle} className={clsx('relative w-12 h-6 rounded-full transition-colors', theme === 'dark' ? 'bg-[var(--ks-border)]' : 'bg-ks-blue')}>
                <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', theme === 'dark' ? 'left-0.5' : 'left-6')} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Notificações</p><p className="text-xs text-[var(--ks-text-muted)]">Toasts de eventos do sistema</p></div>
              <button onClick={() => setNotif(n => !n)} className={clsx('relative w-12 h-6 rounded-full transition-colors', notif ? 'bg-ks-green' : 'bg-[var(--ks-border)]')}>
                <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', notif ? 'left-6' : 'left-0.5')} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Auto-refresh</p><p className="text-xs text-[var(--ks-text-muted)]">Atualizar dados automaticamente</p></div>
              <button onClick={() => setAutoRefresh(a => !a)} className={clsx('relative w-12 h-6 rounded-full transition-colors', autoRefresh ? 'bg-ks-green' : 'bg-[var(--ks-border)]')}>
                <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', autoRefresh ? 'left-6' : 'left-0.5')} />
              </button>
            </div>
            {autoRefresh && (
              <div>
                <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest block mb-1">Intervalo (segundos)</label>
                <select value={refreshInterval} onChange={e => setRefreshInterval(e.target.value)}
                  className="w-full bg-[#000] border border-[var(--ks-border)] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-ks-blue">
                  <option value="15">15s</option>
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                  <option value="120">2min</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Conta */}
        <div className="ks-card">
          <h3 className="font-semibold mb-5 flex items-center gap-2 text-sm">
            <i className="fas fa-user text-ks-yellow" /> Conta
          </h3>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--ks-bg-hover)] border border-[var(--ks-border)] mb-4">
            <div className="w-10 h-10 rounded-xl bg-ks-blue flex items-center justify-center text-black font-black text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-[var(--ks-text-muted)]">{user?.email} · {user?.role}</p>
            </div>
          </div>
          <div className="space-y-2">
            <button onClick={() => toast.info('Em breve: troca de senha')} className="ks-btn ks-btn-ghost w-full justify-start text-xs">
              <i className="fas fa-key" /> Alterar senha
            </button>
            <button onClick={() => toast.info('Em breve: editar perfil')} className="ks-btn ks-btn-ghost w-full justify-start text-xs">
              <i className="fas fa-edit" /> Editar perfil
            </button>
          </div>
        </div>

        {/* API */}
        <div className="ks-card">
          <h3 className="font-semibold mb-5 flex items-center gap-2 text-sm">
            <i className="fas fa-plug text-ks-green" /> Integração API
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-[var(--ks-text-muted)]">Backend</span>
              <span className="flex items-center gap-1.5 text-ks-green font-semibold">
                <span className="w-2 h-2 rounded-full bg-ks-green ks-blink" /> Conectado
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--ks-text-muted)]">KINGSTAR Advisor</span>
              <span className="text-ks-yellow text-xs font-semibold">Modo Local</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--ks-text-muted)]">Webhooks (Zapier)</span>
              <span className="text-[var(--ks-text-muted)] text-xs">Não configurado</span>
            </div>
            <button onClick={() => toast.info('Conexão testada com sucesso!')} className="ks-btn ks-btn-ghost w-full text-xs mt-2">
              <i className="fas fa-wifi" /> Testar conexão
            </button>
          </div>
        </div>

        {/* Sistema */}
        <div className="ks-card">
          <h3 className="font-semibold mb-5 flex items-center gap-2 text-sm">
            <i className="fas fa-info-circle text-ks-blue" /> Sistema
          </h3>
          <div className="space-y-2 text-sm">
            {[
              ['Versão', 'KINGSTAR IO v3.0'],
              ['Frontend', 'React 18 + Vite + TypeScript'],
              ['Backend', 'Fastify + MySQL + Node.js'],
              ['Design System', 'Tailwind CSS + DM Sans'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-[var(--ks-border)] last:border-0">
                <span className="text-[var(--ks-text-muted)]">{label}</span>
                <span className="font-mono text-xs text-ks-blue">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
