import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    maxWorkers: 2,
    setupFiles: ['./tests/setup-env.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/mocks/server-only.ts'),
    },
    exclude: [...configDefaults.exclude, '.claude/**', '.worktrees/**', '.agents/**', 'e2e/**', 'contracts/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 65.5,
      },
    },
  },
});
