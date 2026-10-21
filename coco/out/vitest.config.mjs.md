# vitest.config.mjs
lines:35 exports:default
---
import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@heizdoobert/quickquiz-sdk/client': path.resolve(__dirname, './sdk/src/client/index.ts'),
      '@heizdoobert/quickquiz-sdk/server': path.resolve(__dirname, './sdk/src/server/index.ts'),
      '@heizdoobert/quickquiz-sdk': path.resolve(__dirname, './sdk/src/index.ts'),
      '@heizdoobert/quickquiz-ui': path.resolve(__dirname, './packages/ui/src/index.ts'),
      '@quizweb/sdk-core': path.resolve(__dirname, './sdk/shared_modules/src/index.ts'),
      'server-only': path.resolve(__dirname, './tests/mocks/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    maxWorkers: 2,
    setupFiles: ['./tests/setup-env.ts'],
    exclude: [...configDefaults.exclude, '.claude/**', '.agents/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['app/**', 'lib/**', 'hooks/**', 'components/**'],
      exclude: ['**/*.d.ts', '**/__tests__/**', '**/*.test.*'],
      thresholds: {
        lines: 53.8,
        functions: 50.7,
        branches: 49.4,
      },
    },
  },
});
