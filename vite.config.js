import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
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
        // Lazy page chunklarini precache qilmaymiz. Brauzer ularni kerak bo'lganda
        // oladi va nginx content-hash sabab xavfsiz immutable cache qiladi.
        globPatterns: [],
        // index.html hech qachon service worker cache'iga kirmaydi.
        globIgnores: ['**/index.html'],
        // SPA navigatsiya fallback'i serverdagi try_files orqali ishlaydi.
        navigateFallback: null,
        // Yangi service worker darhol aktiv bo'ladi va ochiq oynani yangilaydi.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Same-origin API: offline fallback yo'q, faqat yangi server javobi.
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              fetchOptions: { cache: 'no-store' },
            },
          },
          {
            // HTML/navigatsiya hech qachon eski cache'dan ko'rsatilmaydi.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
            options: {
              fetchOptions: { cache: 'no-store' },
            },
          },
          {
            // Eski alohida API domeni qayta ishlatilsa ham cache qilinmaydi.
            urlPattern: /^https:\/\/api\.yukbor\.uz\/.*$/,
            handler: 'NetworkOnly',
            options: {
              fetchOptions: { cache: 'no-store' },
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
