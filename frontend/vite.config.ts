// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),

      // 🔥 Fix Node modules used by simple-peer
      buffer: 'buffer',
      process: 'process/browser',
    },
  },

  define: {
    global: 'globalThis', 
  },

  optimizeDeps: {
    include: [
      'simple-peer',
      'buffer',
      'process',
    ],
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})