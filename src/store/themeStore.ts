/**
 * KINGSTAR · IO — Theme Store (Zustand)
 * Controla alternância Dark ↔ Light.
 * Aplica classe 'light' no <html> para ativar o modo claro.
 *
 * Design: sidebar/navbar mantêm tom escuro (azul marinho)
 * em ambos os modos. Apenas o conteúdo principal clareia.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

/* Aplica/remove classe no <html> */
function applyTheme(t: Theme) {
  const html = document.documentElement
  if (t === 'light') {
    html.classList.add('light')
    html.classList.remove('dark')
  } else {
    html.classList.add('dark')
    html.classList.remove('light')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',

      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },

      setTheme: (t) => {
        applyTheme(t)
        set({ theme: t })
      },
    }),
    { name: 'ks-theme' }
  )
)

/* Aplica tema salvo assim que o módulo carrega */
applyTheme(
  (localStorage.getItem('ks-theme')
    ? JSON.parse(localStorage.getItem('ks-theme')!).state?.theme
    : 'dark') ?? 'dark'
)
