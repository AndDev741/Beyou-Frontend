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
      '@beyou/validation': fileURLToPath(new URL('../../packages/validation/src', import.meta.url)),
      '@beyou/icons': fileURLToPath(new URL('../../packages/icons/src', import.meta.url)),
    },
  },
  // With route-level lazy loading, heavy deps are only discovered when their
  // page chunk is first imported. In dev that triggers a mid-session
  // re-optimization + full reload ("new dependencies optimized"), which is
  // slow and breaks in-flight navigations. Pre-bundle them at server start.
  // Entity icons now resolve through @beyou/icons + lucide-react/dynamic; the
  // remaining react-icons usages are app "chrome" (nav/header/buttons) and are
  // discovered lazily per page, so they no longer need pre-bundling here.
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'framer-motion',
      'react-beautiful-dnd',
      'chart.js',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'date-fns',
      'lucide-react',
      'lucide-react/dynamic',
    ],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heavyweight, rarely-changing dependencies into their own
        // cacheable chunks. Entity icons now come from @beyou/icons (a tiny
        // name/emoji registry) + lucide-react/dynamic (per-icon code-split
        // imports), so the old md/fa/ai + emoji-datasource icon chunks are
        // gone. The remaining react-icons usages are app "chrome" — keep them
        // in one cacheable chunk.
        manualChunks(id: string) {
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
