import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: {
    globals: true,
    // All three moved test files are pure reducer/logic tests — no DOM APIs
    // are referenced, so 'node' is correct and faster than 'jsdom'.
    environment: 'node',
    // Match the web app's vitest convention so future mock-based slice tests
    // get a clean mock state between cases.
    mockReset: true,
    // Date assertions here are written to hold in ANY timezone — `env.TZ` does
    // not reach the worker's `Date` (Node reads TZ at process start), so pinning
    // it in config buys nothing. The invariant is the guard instead: a date-only
    // string must keep its calendar day, which a UTC parse breaks west of UTC.
  },
  resolve: {
    alias: {
      '@beyou/api': fileURLToPath(new URL('../api/src', import.meta.url)),
      '@beyou/types': fileURLToPath(new URL('../types/src', import.meta.url)),
      '@beyou/theme': fileURLToPath(new URL('../theme/src', import.meta.url)),
    },
  },
});
