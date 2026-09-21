import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server is explicitly bound to localhost only -- never exposed on the
// local network, even by accident.
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
  },
})
