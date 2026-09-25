import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,   // necessario per l'anteprima in GitHub Codespaces
    hmr: {
      clientPort: 443,   // il proxy di Codespaces espone tutto su 443 (https/wss):
                          // senza questo il websocket di hot-reload prova a
                          // connettersi sulla porta interna (5173), fallisce,
                          // e Vite ricarica l'intera app in loop continuo —
                          // smontando/rimontando anche le sottoscrizioni realtime
    },
  },
})
