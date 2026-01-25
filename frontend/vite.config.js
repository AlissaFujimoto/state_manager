import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    envPrefix: ['VITE_', 'DATABASE_', 'API_', 'MEASUREMENT_'],
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    preview: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
