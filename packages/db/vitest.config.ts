import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    globalSetup: [path.resolve(__dirname, '__tests__/helpers/global-setup.ts')],
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'threads',
    poolMatchGlobs: [
      ['**/*.test.ts', { threads: { singleThread: true } }],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@yigyaps/db': path.resolve(__dirname, './src'),
      '@yigyaps/types': path.resolve(__dirname, '../types/src'),
    },
  },
});
