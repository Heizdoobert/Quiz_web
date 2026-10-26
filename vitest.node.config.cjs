const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup-env.ts'],
    pool: 'forks',

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['app/**', 'lib/**', 'hooks/**', 'components/**'],
      exclude: ['**/*.d.ts', '**/__tests__/**', '**/*.test.*'],
    },
    maxWorkers: 1,
  },
};
