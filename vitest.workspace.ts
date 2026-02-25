import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: '@yigyaps/db',
      include: ['packages/db/__tests__/**/*.test.ts'],
      environment: 'node',
      testTimeout: 30000,
      hookTimeout: 60000,
    },
  },
  {
    test: {
      name: '@yigyaps/api',
      include: ['packages/api/__tests__/**/*.test.ts'],
      environment: 'node',
      testTimeout: 15000,
    },
  },
]);
