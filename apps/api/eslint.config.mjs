import baseConfig from "@ramcar/config/eslint";

export default [
  ...baseConfig,
  {
    rules: {
      "@typescript-eslint/no-empty-function": "off",
    },
  },
];
