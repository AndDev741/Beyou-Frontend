import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    mockReset: true,
  },
  resolve: {
    alias: {
      '@beyou/types': fileURLToPath(new URL('../types/src', import.meta.url)),
    },
  },
});
