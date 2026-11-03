import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { staticShellPwa } from './pwa/plugin.mjs'
import { phoneProxy, tunnelHostname } from './pwa/phoneProxy.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const phone = mode === 'phone'
  const env = loadEnv(mode, '.', '')
  const hostname = phone ? tunnelHostname(env.PHONE_TUNNEL_HOST) : null
  const connection = phone ? {
    host: 'localhost', port: 5173, strictPort: true,
    allowedHosts: hostname ? [hostname] : [], proxy: phoneProxy(),
  } : {}
  return {
    plugins: [react(), staticShellPwa()],
    server: connection,
    preview: connection,
  }
})
