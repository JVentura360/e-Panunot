import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { staticShellPwa } from './pwa/plugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), staticShellPwa()],
})
