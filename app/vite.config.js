import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Oraclu App',
        short_name: 'Oraclu',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        orientation: 'portrait'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/apioraclu\.dedalosbar\.com\/assets\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'oraclu-api-assets',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 2592000
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3040,
    host: true,
    strictPort: true,
    allowedHosts: [
      'oraclu.dedalosbar.com',
      'localhost'
    ],
    watch: {
      usePolling: true
    }
  }
})