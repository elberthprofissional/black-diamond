/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

// Git commit SHA for Sentry releases
let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch {
  // not in a git repo or git not available
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      manifest: {
        name: 'Black Diamond Barbearia',
        short_name: 'Black Diamond',
        description: 'Painel administrativo da Black Diamond Barbearia.',
        lang: 'pt-BR',
        start_url: '/admin/login',
        scope: '/',
        display: 'standalone',
        background_color: '#050505',
        theme_color: '#D4AF37',
        orientation: 'portrait',
        categories: ['business'],
        icons: [
          { src: '/assets/logo.webp', sizes: '192x192', type: 'image/webp', purpose: 'any' },
          { src: '/assets/logo.webp', sizes: '512x512', type: 'image/webp', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: '/assets/hero-bg.webp',
            sizes: '1920x1080',
            type: 'image/webp',
            form_factor: 'wide',
            label: 'Painel administrativo',
          },
          {
            src: '/assets/hero-bg-mobile.webp',
            sizes: '750x1334',
            type: 'image/webp',
            form_factor: 'narrow',
            label: 'Painel administrativo mobile',
          },
        ],
        shortcuts: [
          {
            name: 'Painel Admin',
            short_name: 'Admin',
            url: '/admin',
            description: 'Painel administrativo da barbearia',
            icons: [{ src: '/assets/logo.webp', sizes: '192x192', type: 'image/webp' }],
          },
          {
            name: 'Agenda Semanal',
            short_name: 'Agenda',
            url: '/admin/weekly',
            description: 'Visualizar agenda da semana',
            icons: [{ src: '/assets/logo.webp', sizes: '192x192', type: 'image/webp' }],
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,webp,png,svg,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    __COMMIT_SHA__: JSON.stringify(commitHash),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) {
              return 'vendor-react-core';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide-react') || id.includes('lucide')) {
              return 'vendor-icons';
            }
            if (id.includes('@sentry')) {
              return 'vendor-sentry';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (
              id.includes('jspdf') ||
              id.includes('jspdf-autotable') ||
              id.includes('fflate') ||
              id.includes('fast-png')
            ) {
              return 'vendor-pdf';
            }
            if (id.includes('react-helmet-async')) {
              return 'vendor-helmet';
            }
            if (
              id.includes('@supabase/realtime-js') ||
              id.includes('@supabase/postgrest-js') ||
              id.includes('@supabase/storage-js') ||
              id.includes('@supabase/functions-js')
            ) {
              return 'vendor-supabase-core';
            }
            if (id.includes('ws') || id.includes('cross-fetch') || id.includes('node-fetch')) {
              return 'vendor-network';
            }
            return 'vendor-other';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', 'framer-motion', '@supabase/supabase-js'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    env: {
      VITE_VAPID_PUBLIC_KEY: 'test-vapid-public-key',
    },
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.mimocode/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
