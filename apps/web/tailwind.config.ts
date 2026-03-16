import type { Config } from "tailwindcss";
import sharedPreset from "@ramcar/config/tailwind";

const config: Config = {
  presets: [sharedPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
