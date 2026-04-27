import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-markdown") || id.includes("remark-gfm")) {
            return "markdown";
          }
          if (id.includes("react") || id.includes("scheduler")) return "react";
          if (id.includes("@yigyaps")) return "yigyaps";
          return "vendor";
        },
      },
    },
  },
  server: {
    proxy: {
      "/v1": {
        target: "http://127.0.0.1:3100",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:3100",
        changeOrigin: true,
      },
      "/.well-known": {
        target: "http://127.0.0.1:3100",
        changeOrigin: true,
      },
    },
  },
});
