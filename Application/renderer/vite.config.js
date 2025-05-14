import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron to find assets correctly
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173, // Default Vite port, ensure it matches wait-on in root package.json
  }
})
