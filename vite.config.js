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
        // Raise the per-file limit to 6 MiB to cover the Plotly chunk
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'signallab-navigation',
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              /\.(js|css|woff2?|svg|png|ico)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'signallab-assets',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
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
  build: {
    // Silence the chunk size warning in Vite's own output
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Plotly gets its own chunk (~4.5 MB) — isolated from the app shell
          'vendor-plotly': ['plotly.js-dist'],
          // React runtime in its own small chunk — cached separately and almost never changes
          'vendor-react': ['react', 'react-dom'],
          // PDF export isolated — only loaded when user generates a report
          'vendor-jspdf': ['jspdf'],
        },
      },
    },
  },
})
