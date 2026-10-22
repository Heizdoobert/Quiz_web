module.exports = {
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup-env.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['app/**', 'lib/**', 'hooks/**', 'components/**'],
      exclude: ['**/*.d.ts', '**/__tests__/**', '**/*.test.*'],
    },
    maxWorkers: 1,
  },
};
