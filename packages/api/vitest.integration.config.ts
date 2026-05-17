import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const apiRoot = path.dirname(fileURLToPath(import.meta.url));
const toGlobPath = (value: string) => value.replace(/\\/g, "/");

export default defineConfig({
  root: apiRoot,
  test: {
    globals: true,
    environment: "node",
    dir: path.resolve(apiRoot, "__tests__/integration"),
    include: ["**/*.test.ts"],
    globalSetup: [
      path.resolve(apiRoot, "__tests__/integration/helpers/global-setup.ts"),
    ],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      KMS_KEK:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
    pool: "threads",
    poolMatchGlobs: [["**/*.test.ts", { threads: { singleThread: true } }]],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [toGlobPath(path.join(apiRoot, "src/**/*.ts"))],
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
      "@yigyaps/api": path.resolve(apiRoot, "./src"),
      "@yigyaps/db": path.resolve(apiRoot, "../db/src"),
      "@yigyaps/types": path.resolve(apiRoot, "../types/src"),
    },
  },
});
