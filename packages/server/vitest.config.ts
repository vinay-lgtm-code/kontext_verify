/// <reference path="../../node_modules/.pnpm/vitest@1.6.1_@types+node@20.19.32/node_modules/vitest/config.d.ts" />
export default {
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8' as const,
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
};
