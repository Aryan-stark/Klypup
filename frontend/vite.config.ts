import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allows: import { Button } from '@/components/ui/button'
      // instead of: import { Button } from '../../components/ui/button'
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,             // needed for Docker
    proxy: {
      // Proxies /api/* to the backend — avoids CORS issues in dev
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
