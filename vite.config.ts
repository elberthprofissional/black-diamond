import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Vercel Build Trigger: 15:25
export default defineConfig({
  plugins: [react()],
})
