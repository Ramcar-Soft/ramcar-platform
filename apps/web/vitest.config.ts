import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "@ramcar/config/vitest";

export default mergeConfig(
  baseConfig,
  defineConfig({
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
