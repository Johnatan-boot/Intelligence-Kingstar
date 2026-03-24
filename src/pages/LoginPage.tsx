import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/notificationStore'
import { ToastContainer } from '@/components/ui/ToastContainer'

type Mode = 'login' | 'register'

/* COMPONENTE REUTILIZÁVEL */
interface InputProps {
  icon: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  type?: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'operator'|'manager'|'admin'>('operator')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setName('')
    setPassword('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const data = await authApi.login({ email, password })
        setAuth(data.token, data.user)
        toast.success(`Bem-vindo, ${data.user.name}!`)
        navigate('/core', { replace: true })
      } else {
        await authApi.register({ name, email, password, role })
        toast.success('Conta criada! Faça login.')
        switchMode('login')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
 <div className={clsx(
  " flex justify-center text-center" ,
  mode === "login" ? "mb-6" : "mb-4"
)}>
      <ToastContainer />

      {/* Glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-ks-blue/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md ks-fade-up">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-ks-yellow flex items-center justify-center mx-auto mb-4 text-black text-lg sm:text-xl shadow-neon-yellow ks-bounce-in">
            <i className="fas fa-crown" />
          </div>

         <h1 className={clsx(
  "font-display font-black text-white",
  mode === "login"
    ? "text-2xl sm:text-3xl tracking-[4px]"
    : "text-xl sm:text-2xl tracking-[2px]"
)}>
  KINGSTAR
</h1>

         <p className={clsx(
  "font-mono text-[var(--ks-text-muted)] mt-1",
  mode === "login"
    ? "text-[10px] tracking-[3px]"
    : "text-[8px] tracking-[2px]"
)}>
          INTELIGÊNCIA OPERACIONAL v4.0
        </p>
      </div>

        {/* Toggle */}
        <div className="flex bg-[#111] border border-[#222] rounded-xl p-1 mb-4">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={clsx(
                'flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200',
                mode === m
                  ? 'bg-ks-yellow text-black shadow-md'
                  : 'text-[var(--ks-text-muted)] hover:text-white'
              )}
            >
              {m === 'login'
                ? <>ENTRAR</>
                : <>CADASTRAR</>}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-5 sm:p-6 shadow-[0_0_60px_rgba(56,189,248,0.06)] backdrop-blur">

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Nome */}
            {mode === 'register' && (
              <Input icon="fa-user" placeholder="Nome completo" value={name} onChange={setName} />
            )}

            {/* Email */}
            <Input icon="fa-envelope" placeholder="Email" value={email} onChange={setEmail} type="email" />

            {/* Senha */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest">
                Senha
              </label>

              <div className="relative">
                <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ks-text-muted)] text-sm" />

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#000] border border-[#333] rounded-lg pl-9 pr-10 py-2.5 text-sm text-white outline-none focus:border-ks-blue focus:ring-1 focus:ring-ks-blue transition"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                >
                  {showPassword ? 'OCULTAR' : 'VER'}
                </button>
              </div>
            </div>

            {/* Perfil */}
            {mode === 'register' && (
              <div>
                <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest">
                  Perfil
                </label>

                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full bg-[#000] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:border-ks-blue transition"
                >
                  <option value="operator">Operador</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="text-xs text-ks-red bg-ks-red/10 border border-ks-red/30 rounded-lg px-3 py-2 animate-pulse">
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              disabled={loading}
              className="w-full h-11 rounded-lg bg-ks-yellow text-black font-bold text-sm hover:scale-[1.01] active:scale-[0.98] transition"
            >
              {loading
                ? 'Processando...'
                : mode === 'login'
                  ? 'ACESSAR'
                  : 'CRIAR CONTA'}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-[#2a2a2a] mt-4 font-mono">
          KINGSTAR IO v4
        </p>
      </div>
    </div>
  )
}



function Input({ icon, placeholder, value, onChange, type = 'text' }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-[var(--ks-text-muted)] uppercase tracking-widest">
        {placeholder}
      </label>

      <div className="relative">
        <i className={`fas ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ks-text-muted)] text-sm`} />

        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          className="w-full bg-[#000] border border-[#333] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-ks-blue focus:ring-1 focus:ring-ks-blue transition"
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}