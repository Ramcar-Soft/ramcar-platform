import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "@ramcar/config/vitest";

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    esbuild: {
      jsx: "automatic",
    },
    test: {
      environment: "jsdom",
      setupFiles: ["@ramcar/config/vitest-setup"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/coverage/**",
        "**/e2e/**",
      ],
    },
  })
);
