import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    pool: 'threads',
    poolMatchGlobs: [
      ['**/*.test.ts', { threads: { singleThread: true } }],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/server.ts',
        'src/types/**',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@yigyaps/api': path.resolve(__dirname, './src'),
      '@yigyaps/db': path.resolve(__dirname, '../db/src'),
      '@yigyaps/types': path.resolve(__dirname, '../types/src'),
    },
  },
});
