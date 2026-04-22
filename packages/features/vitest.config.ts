import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "@ramcar/config/vitest";
import path from "node:path";

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        // Resolve @ramcar/ui's internal @/ alias so Vitest can process UI source files.
        "@": path.resolve(__dirname, "../ui/src"),
        react: path.resolve("node_modules/react"),
        "react-dom": path.resolve("node_modules/react-dom"),
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  })
);
