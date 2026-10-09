import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server is explicitly bound to localhost only -- never exposed on the
// local network, even by accident.
export default defineConfig({
  plugins: [react()],
  build: {
    // Split the big libraries into their own files. They change rarely, so
    // the browser can keep them cached when only the app's own code changes.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
  },
})
