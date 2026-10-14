import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'

// Read Vite version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const viteVersion = packageJson.devDependencies.vite.replace('^', '')

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const adminUrl = env.BINGO_ADMIN_URL

  if (command === 'serve' && !adminUrl) {
    throw new Error('BINGO_ADMIN_URL is required. Copy .env.example to .env before starting Vite.')
  }

  return {
    plugins: [vue()],
    define: {
      // Make version info available at build time
      'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(env.VITE_COMMIT_SHA || env.COMMIT_SHA || 'dev'),
      'import.meta.env.VITE_DOTNET_VERSION': JSON.stringify(env.VITE_DOTNET_VERSION || env.DOTNET_VERSION || '10'),
      'import.meta.env.VITE_ASPIRE_VERSION': JSON.stringify('not configured'),
      'import.meta.env.VITE_VERSION': JSON.stringify(viteVersion)
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/version-info': {
          target: adminUrl,
          changeOrigin: true,
          secure: false
        },
        // Proxy SignalR hub to the admin service
        '/bingohub': {
          target: adminUrl,
          changeOrigin: true,
          secure: false,
          ws: true // Enable WebSocket proxying for SignalR
        }
      }
    }
  }
})
