import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/unit/**/*.test.ts"],
    testTimeout: 30000,
    env: {
      NODE_ENV: "test",
      KMS_KEK:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
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
