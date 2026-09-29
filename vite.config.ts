import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/aegis-h2s-dosimeter/',
  plugins: [react()],
})