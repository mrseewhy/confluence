import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    // Bind to all interfaces so the dev server is reachable on both IPv4 and
    // IPv6. Without this it listens on ::1 only, and Firefox (which resolves
    // localhost to 127.0.0.1) cannot load the app — Chromium and WebKit happen
    // to fall back to IPv6, which hid the problem.
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
