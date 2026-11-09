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
  build: {
    // Split large third-party libraries into their own long-lived chunks so the
    // app bundle stays small and vendor code is cached across app deploys.
    // Vite 8 uses rolldown, where `manualChunks` is replaced by
    // `output.advancedChunks.groups`.
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'router', test: /node_modules[\\/](react-router|react-router-dom|@remix-run)[\\/]/, priority: 20 },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 20 },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
