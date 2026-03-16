import type { Config } from "tailwindcss";
import sharedPreset from "@ramcar/config/tailwind";

const config: Config = {
  presets: [sharedPreset as Config],
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
