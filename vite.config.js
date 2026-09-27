import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Cache everything bundled by Vite (JS, CSS, fonts, icon)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            // App shell navigation — serve from cache, fall back to network
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'signallab-navigation',
              networkTimeoutSeconds: 5,
            },
          },
          {
            // All static assets: JS chunks, CSS, fonts
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              /\.(js|css|woff2?|svg|png|ico)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'signallab-assets',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'SignalLab — Signal Analysis Platform',
        short_name: 'SignalLab',
        description: 'Client-side audio and signal analysis platform',
        theme_color: '#08090d',
        background_color: '#08090d',
        display: 'standalone',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
})
