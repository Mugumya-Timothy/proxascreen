import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  // VITE_API_TARGET is read by the Vite dev server only. It lets Docker-based
  // development point the proxy at a service name such as http://api:8081.
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8081'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      hmr: {
        host: 'localhost',
        port: 5173,
      },
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/webhooks': { target: apiTarget, changeOrigin: true },
        '/health': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
