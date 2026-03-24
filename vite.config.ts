import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'kingstar_core',
      filename: 'remoteEntry.js',
      remotes: {
        logistics: 'http://localhost:5173/assets/remoteEntry.js', // Exemplo de auto-referência para MFE local
      },
      exposes: {
        './Recebimento': './src/pages/RecebimentoPage.tsx',
        './Compras': './src/pages/ComprasPage.tsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios'],
    }),
  ],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  /*
   * optimizeDeps.include: lista explícita de dependências para
   * pré-bundling. Elimina o aviso:
   * "Could not auto-determine entry point... Skipping dependency pre-bundling"
   */
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'recharts',
      'axios',
      'clsx',
    ],
  },

  server: {
    port: 5173,
    /* Proxy: /api → backend Fastify (porta 3000) */
    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  build: {
    /* Entry point explícito para build de produção */
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
    /* Dividir chunks grandes em arquivos menores */
    chunkSizeWarningLimit: 600,
  },
})
