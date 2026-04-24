import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import requireTenantId from "../require-tenant-id";

// Wire vitest's describe/it into ESLint's RuleTester so tests are discovered
RuleTester.describe = describe as typeof RuleTester.describe;
RuleTester.it = it as typeof RuleTester.it;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, sourceType: "module" },
});

tester.run("require-tenant-id", requireTenantId, {
  valid: [
    // Has activeTenantId as second element
    `useQuery({ queryKey: ["users", activeTenantId, filters], queryFn: fetch })`,
    // Has tenantId as second element
    `useQuery({ queryKey: ["residents", tenantId, "list"], queryFn: fetch })`,
    // Bitacora — ignored key
    `useQuery({ queryKey: ["access-events", scopeKey, filters], queryFn: fetch })`,
    // Tenants selector — ignored
    `useQuery({ queryKey: ["tenants", "selector", role], queryFn: fetch })`,
    // Dynamic first element
    `useQuery({ queryKey: [dynamicKey, filters], queryFn: fetch })`,
    // Not a query hook
    `useMutation({ mutationFn: fetch })`,
  ],
  invalid: [
    {
      // Missing tenantId — first 3 elements are all strings/non-tenant-ids
      code: `useQuery({ queryKey: ["users", "list", filters], queryFn: fetch })`,
      errors: [{ messageId: "missingTenantId" }],
    },
    {
      // Dashboard missing tenantId
      code: `useQuery({ queryKey: ["dashboard", "metrics"], queryFn: fetch })`,
      errors: [{ messageId: "missingTenantId" }],
    },
    {
      // Visit-persons missing tenantId
      code: `useInfiniteQuery({ queryKey: ["visit-persons", filters], queryFn: fetch })`,
      errors: [{ messageId: "missingTenantId" }],
    },
  ],
});
