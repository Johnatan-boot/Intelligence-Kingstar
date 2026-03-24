import type { Config } from 'tailwindcss'

/**
 * KINGSTAR DESIGN SYSTEM — Tailwind Config
 * Todas as cores são mapeadas do design system original.
 * Use as classes ks-* para garantir consistência.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  /* dark: 'class' → alternado pelo ThemeStore (interruptor manual) */
  darkMode: 'class',
  theme: {
    extend: {
      /* ── PALETA KINGSTAR ─────────────────────────────────── */
      colors: {
        ks: {
          /* Modo escuro (padrão) */
          'bg-main':    '#0f0f0f',
          'bg-card':    '#1a1a1a',
          'bg-hover':   '#222222',
          'sidebar':    '#121212',
          'navbar':     '#161616',
          'border':     '#2a2a2a',
          'glass':      'rgba(255,255,255,0.03)',
          /* Modo claro */
          'light-bg':   '#f0f2f5',
          'light-card': '#ffffff',
          'light-sidebar': '#1a2744',
          'light-navbar':  '#1e3160',
          'light-border':  '#dde3ee',
          /* Accent */
          yellow:  '#fbbf24',
          blue:    '#38bdf8',
          green:   '#22c55e',
          red:     '#ef4444',
          purple:  '#a78bfa',
          orange:  '#f97316',
          /* Text */
          'text-main':  '#f1f5f9',
          'text-muted': '#94a3b8',
          'text-light': '#1e293b',
          'text-light-muted': '#64748b',
        },
      },
      /* ── TIPOGRAFIA ──────────────────────────────────────── */
      fontFamily: {
        /* Display: cabeçalhos e logo */
        display: ['"Syne"', 'sans-serif'],
        /* Body: textos corridos */
        body:    ['"DM Sans"', 'sans-serif'],
        /* Mono: SKUs, logs, códigos */
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      /* ── ANIMAÇÕES ───────────────────────────────────────── */
      keyframes: {
        'slide-in':    { from: { transform: 'translateX(100%)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        'fade-up':     { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'pulse-neon':  { '0%,100%': { boxShadow: '0 0 0 0 rgba(56,189,248,0.4)' }, '70%': { boxShadow: '0 0 0 10px rgba(56,189,248,0)' } },
        'ticker':      { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-100%)' } },
        'blink':       { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'slide-in':   'slide-in 0.3s ease-out',
        'fade-up':    'fade-up 0.4s ease-out',
        'pulse-neon': 'pulse-neon 2s infinite',
        'ticker':     'ticker 30s linear infinite',
        'blink':      'blink 1.5s ease-in-out infinite',
      },
      /* ── BOX SHADOW ──────────────────────────────────────── */
      boxShadow: {
        'card':   '0 4px 20px rgba(0,0,0,0.3)',
        'neon-blue':   '0 0 15px rgba(56,189,248,0.4)',
        'neon-yellow': '0 0 15px rgba(251,191,36,0.4)',
        'neon-green':  '0 0 15px rgba(34,197,94,0.4)',
        'neon-red':    '0 0 15px rgba(239,68,68,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
