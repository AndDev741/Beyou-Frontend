import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [svgr(), react()],
  resolve: {
    alias: {
      '@beyou/types': fileURLToPath(new URL('../../packages/types/src', import.meta.url)),
      '@beyou/i18n': fileURLToPath(new URL('../../packages/i18n/src', import.meta.url)),
      '@beyou/theme': fileURLToPath(new URL('../../packages/theme/src', import.meta.url)),
      '@beyou/state': fileURLToPath(new URL('../../packages/state/src', import.meta.url)),
      '@beyou/api': fileURLToPath(new URL('../../packages/api/src', import.meta.url)),
      // Scaffolding: @beyou/contracts is wired here ahead of use. Phase 1 will
      // thread the generated backend types into @beyou/api repositories (to drop
      // the response-data casts). Until then the web app has no @beyou/contracts
      // import; spec/schema drift is enforced by `@beyou/contracts run check` in CI.
      '@beyou/contracts': fileURLToPath(new URL('../../packages/contracts/src', import.meta.url)),
    },
  },
  // With route-level lazy loading, heavy deps are only discovered when their
  // page chunk is first imported. In dev that triggers a mid-session
  // re-optimization + full reload ("new dependencies optimized"), which is
  // slow and breaks in-flight navigations. Pre-bundle them at server start.
  optimizeDeps: {
    include: [
      'react-icons/md',
      'react-icons/fa',
      'react-icons/ai',
      'framer-motion',
      'react-beautiful-dnd',
      'chart.js',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'date-fns',
      'lucide-react',
    ],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heavyweight, rarely-changing dependencies into their own
        // cacheable chunks. The icon system dominates the bundle: the registry
        // enumerates the full md/fa/ai react-icons packs plus the
        // emoji-datasource catalog, so each gets its own chunk — they load in
        // parallel when the first authenticated page mounts and stay cached
        // across deploys of app code.
        manualChunks(id: string) {
          if (id.includes('emoji-datasource')) return 'emoji-data';
          if (id.includes('react-icons/md')) return 'icons-md';
          if (id.includes('react-icons/fa')) return 'icons-fa';
          if (id.includes('react-icons/ai')) return 'icons-ai';
          if (id.includes('react-icons')) return 'icons-base';
          if (id.includes('framer-motion')) return 'motion';
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform') ||
            id.includes('zod')
          ) {
            return 'forms';
          }
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('react-router') ||
            id.includes('node_modules/redux') ||
            id.includes('@reduxjs') ||
            id.includes('react-redux') ||
            id.includes('redux-persist')
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.tsx',
    css: true,
    mockReset: true,
  },
});
