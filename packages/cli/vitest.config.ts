import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/__tests__/**", "src/index.ts"],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@yigyaps/cli": path.resolve(__dirname, "./src"),
    },
  },
});
