import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'YukBor - Yuk va Transport Platformasi',
        short_name: 'YukBor',
        description: 'O\'zbekistondagi yuk va transport platformasi',
        theme_color: '#08142c',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg}'],
        // index.html'ni precache'ga qo'shmaymiz — har navigatsiyada NetworkFirst
        // orqali yangi index.html olinadi va u yangi hashlangan asset nomlariga ishora qiladi.
        globIgnores: ['**/index.html'],
        // vite-plugin-pwa default'i `navigateFallback: 'index.html'` —
        // bu precache-cache-first NavigationRoute generatsiya qilib,
        // pastdagi NetworkFirst runtime route'ni soya qilib qo'yadi.
        // Default'ni bekor qilamiz, runtime NetworkFirst navigatsiyani boshqaradi.
        navigateFallback: null,
        // Yangi service worker darhol chiqariladi va ochiq tab'larni egallaydi
        // — oddiy refresh'da ham yangi asset'lar ko'rinadi.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.yukbor\.uz\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // target: 'http://167.172.68.133:8080',
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['react-hot-toast', 'react-helmet-async'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
