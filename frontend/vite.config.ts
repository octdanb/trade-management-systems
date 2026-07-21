import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In docker compose the backend is reachable at http://backend:8000; when
// running Vite directly on the host it's http://localhost:8000.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Everything server-side is proxied to Django so the browser only ever
    // talks to one origin — plain session-cookie auth, no CORS.
    proxy: {
      '/api': backendUrl,
      '/_allauth': backendUrl,
      '/accounts': backendUrl,
      '/admin': backendUrl,
      '/static': backendUrl,
    },
  },
})
