import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

// Build-time app version. Feedback submissions and error reports carry it, so a
// report can be traced back to the build that produced it.
const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')
) as { version: string };

// ONE expression for the release identifier: it is injected into the bundle as
// `__SENTRY_RELEASE__` (what the SDK tags every event with) AND handed to the
// source-map upload below. Derived twice, they could drift by a version bump
// and the collector would hold maps it cannot match to any event — the exact
// failure R18 exists to prevent. `SENTRY_RELEASE` mirrors the backend's variable
// name so CI can tag both from the same commit sha.
const sentryRelease = process.env.SENTRY_RELEASE?.trim() || `beyou-web@${packageJson.version}`;

// Source-map upload is opt-in on credentials being present in the build
// environment. A developer build, a CI job without secrets, or a fork therefore
// builds normally and uploads nothing, rather than failing. The auth token is a
// real secret — it lives in the build environment only, never in a tracked file.
const sentryUploadEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
);

export default defineConfig({
  plugins: [
    svgr(),
    react(),
    // Must come last: it reads the finished bundle + maps.
    ...(sentryUploadEnabled
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            // Self-hosted GlitchTip, not sentry.io. Without this the upload
            // silently targets the wrong host.
            url: process.env.SENTRY_URL,
            release: { name: sentryRelease },
            sourcemaps: {
              // Third guard on "maps must not be served" (see `sourcemap:
              // 'hidden'` and the nginx rule): once uploaded, the artifact does
              // not exist in the image at all.
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
            // The plugin phones sentry.io with its own usage telemetry by
            // default. Pointless for a self-hosted collector, and off-posture.
            telemetry: false,
            // By default the plugin LOGS an upload failure and lets the build
            // exit 0 — so a release would ship with unresolvable minified traces
            // and a green CI run, which is precisely the silent gap R18 exists
            // to close (and the one the mobile app currently has). Upload only
            // runs when someone deliberately set all three credentials, so a
            // failure here means they asked for maps and did not get them. To
            // ship during a collector outage, unset SENTRY_AUTH_TOKEN.
            errorHandler: (error) => {
              throw error;
            },
          }),
        ]
      : []),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __SENTRY_RELEASE__: JSON.stringify(sentryRelease),
    // Sentry's documented tree-shaking flags. `tracesSampleRate: 0` disables
    // tracing at runtime; this removes the tracing and debug-logging code from
    // the bundle outright, which is what keeps the SDK's cost to the boot bundle
    // small on a project with a documented bundle budget.
    __SENTRY_TRACING__: false,
    __SENTRY_DEBUG__: false,
  },
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
    // 'hidden', not true: the .map files are emitted (so they can be uploaded
    // to the collector and resolve minified production frames — R18) but the
    // bundles carry NO `//# sourceMappingURL=` comment, so nothing points a
    // browser or a crawler at them. Serving them would publish this app's
    // entire source. Two further guards back this up: the upload step deletes
    // the maps from `dist/` once they are in the collector, and `nginx.conf`
    // refuses any `.map` request outright.
    sourcemap: 'hidden',
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
          // Must precede the `forms` rule: @sentry/core ships a
          // `zoderrors` integration whose path contains "zod", which would
          // otherwise scatter the SDK into the forms chunk. Its own chunk also
          // keeps the telemetry cost measurable instead of hidden inside an
          // unrelated one. Boot-critical (it initialises at entry), so it is
          // preloaded alongside vendor — but it disappears entirely from builds
          // with no DSN, because the short-circuit in initTelemetry() then makes
          // Sentry.init() unreachable and the whole client tree shakes out.
          if (id.includes('@sentry')) return 'telemetry';
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
