import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { alias: { '@': '/Users/amar/Codes/ak/simlab/src' } },
  server: { fs: { strict: false } },
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 120000 },
});
