import requireTenantId from "./rules/require-tenant-id";

export const rules = {
  "require-tenant-id": requireTenantId,
};

export const configs = {
  recommended: {
    plugins: ["@ramcar/query-keys"],
    rules: {
      "@ramcar/query-keys/require-tenant-id": "warn",
    },
  },
};
