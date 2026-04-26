import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    globalSetup: [
      path.resolve(__dirname, "__tests__/integration/helpers/global-setup.ts"),
    ],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
    },
    pool: "threads",
    poolMatchGlobs: [["**/*.test.ts", { threads: { singleThread: true } }]],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/server.ts",
        "src/types/**",
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
      "@yigyaps/api": path.resolve(__dirname, "./src"),
      "@yigyaps/db": path.resolve(__dirname, "../db/src"),
      "@yigyaps/types": path.resolve(__dirname, "../types/src"),
    },
  },
});
