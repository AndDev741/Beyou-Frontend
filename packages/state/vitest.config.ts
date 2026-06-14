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
  },
  resolve: {
    alias: {
      '@beyou/types': fileURLToPath(new URL('../types/src', import.meta.url)),
      '@beyou/theme': fileURLToPath(new URL('../theme/src', import.meta.url)),
    },
  },
});
