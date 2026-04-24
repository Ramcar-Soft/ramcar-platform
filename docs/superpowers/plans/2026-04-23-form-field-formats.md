# Form Field Format Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a single authoritative set of Zod schemas for phone, email, and username, enforced by every relevant form and every API endpoint in the monorepo — with phone values normalized to E.164 on save.

**Architecture:** New shared validators live in `packages/shared/src/validators/{phone,email,username}.ts` and are consumed (1) by the existing aggregate schemas in `user.ts` + `visit-person.ts`, and (2) directly by every form. Forms validate format fields on blur and on submit; phone and email are transformed (E.164 for phone, `trim().toLowerCase()` for email) before the mutation runs. Username input is soft-filtered onChange. Rules are enforced at write time only — no backfill of existing data. Follows the spec at `docs/superpowers/specs/2026-04-23-form-field-formats-design.md`.

**Tech Stack:** TypeScript 5 (strict), Zod 3.23, `libphonenumber-js/min` (new), Vitest, React 18, `@ramcar/ui`, `@ramcar/shared`, `@ramcar/features`, next-intl v4 (web), react-i18next (desktop). Fully TDD: every shared schema and every form change ships with a failing test first, followed by the minimum code to make it pass.

---

## File Structure

**New files (shared validators):**

- `packages/shared/src/validators/phone.ts` — `phoneSchema`, `phoneOptionalSchema`, `normalizePhone(input)`.
- `packages/shared/src/validators/phone.test.ts` — table-driven valid/invalid + normalization round-trip.
- `packages/shared/src/validators/email.ts` — `emailSchema` (trim + lowercase + `.email()`).
- `packages/shared/src/validators/email.test.ts` — trim/lowercase round-trip + invalid cases.
- `packages/shared/src/validators/username.ts` — `usernameSchema`, `usernameOptionalSchema`, `stripUsernameChars(input)`.
- `packages/shared/src/validators/username.test.ts` — valid/invalid + soft-filter utility.

**New files (form tests):**

- `packages/shared/src/validators/visit-person.test.ts` — regression coverage so the refactor in user.ts/visit-person.ts does not break consumers.
- `apps/web/src/features/users/__tests__/user-form-validation.test.tsx` — covers phone blur/normalize, username soft-filter, email lowercase on submit, and regression-guards the `username = phone` bug.
- `apps/web/src/features/providers/__tests__/provider-form-validation.test.tsx` — phone blur/submit validation + E.164 normalization.
- `apps/desktop/src/features/providers/__tests__/provider-form-validation.test.tsx` — same shape, desktop host.

**Modified files:**

- `packages/shared/package.json` — add `libphonenumber-js ^1` to `dependencies`.
- `packages/shared/src/index.ts` — re-export `phoneSchema`, `phoneOptionalSchema`, `normalizePhone`, `emailSchema`, `usernameSchema`, `usernameOptionalSchema`, `stripUsernameChars`.
- `packages/shared/src/validators/user.ts` — replace inline `usernameWhenProvided`, inline email validator, and `z.string().max(20)` phone with imports; re-export types unchanged.
- `packages/shared/src/validators/visit-person.ts` — replace `z.string().max(30)` phone with `phoneOptionalSchema` on create + update schemas.
- `packages/shared/src/validators/user.test.ts` — extend with the new format-rule cases, keep existing assertions green.
- `packages/i18n/src/messages/en.json` — add `forms.*` and `users.form.usernameHelp` + `users.validation.username*` keys.
- `packages/i18n/src/messages/es.json` — same keys, Spanish copy.
- `apps/web/src/features/users/components/user-form.tsx` — swap inline regex for shared schemas, soft-filter username onChange, normalize phone + email on submit, **fix the `username = phone` bug**, add placeholders + helper text.
- `apps/web/src/features/providers/components/provider-form.tsx` — add phone blur/submit validation + E.164 normalization + placeholder + helper text.
- `apps/web/src/features/providers/components/provider-edit-form.tsx` — same.
- `apps/desktop/src/features/providers/components/provider-form.tsx` — same (per-app duplicate until migration).
- `apps/desktop/src/features/providers/components/provider-edit-form.tsx` — same.
- `packages/features/src/visitors/components/visit-person-form.tsx` — add `phone` field + validation + normalization.
- `packages/features/src/visitors/components/visit-person-edit-form.tsx` — add `phone` field + validation + normalization.
- `packages/features/src/visitors/__tests__/visit-person-form-validation.test.tsx` — add phone blur/submit coverage.

---

## Task 1: Add libphonenumber-js dependency + install

**Files:**
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Add dependency**

Edit `packages/shared/package.json` to add `libphonenumber-js` under `dependencies` (alphabetical, before `zod`):

```json
{
  "name": "@ramcar/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage"
  },
  "dependencies": {
    "libphonenumber-js": "^1.11.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@ramcar/config": "workspace:*",
    "@vitest/coverage-v8": "^2.1.9",
    "typescript": "^5.0.0",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Install the workspace**

Run from repo root:

```bash
pnpm install
```

Expected: `libphonenumber-js` is added to `packages/shared/node_modules` and appears in root `pnpm-lock.yaml`. No errors.

- [ ] **Step 3: Verify the `/min` entrypoint resolves**

```bash
node -e "console.log(require.resolve('libphonenumber-js/min', { paths: ['packages/shared'] }))"
```

Expected: prints an absolute path ending in `libphonenumber-js/min/index.cjs` (or `.js`), not an error. This confirms subsequent `import { parsePhoneNumber } from "libphonenumber-js/min"` will resolve.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/package.json pnpm-lock.yaml
git commit -m "feat(shared): add libphonenumber-js dep for phone validation"
```

---

## Task 2: Phone validator — write failing tests

**Files:**
- Test: `packages/shared/src/validators/phone.test.ts` (create)

- [ ] **Step 1: Write the failing test file**

Create `packages/shared/src/validators/phone.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { phoneSchema, phoneOptionalSchema, normalizePhone } from "./phone";

describe("phoneSchema", () => {
  const validMxCases: Array<[string, string]> = [
    ["5551234567", "+525551234567"],
    ["(555) 123-4567", "+525551234567"],
    ["555-123-4567", "+525551234567"],
    ["555 123 4567", "+525551234567"],
    ["  5551234567  ", "+525551234567"],
  ];

  it.each(validMxCases)("accepts MX %s → %s", (raw, expected) => {
    const result = phoneSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(expected);
  });

  const validIntlCases: Array<[string, string]> = [
    ["+14155551234", "+14155551234"],
    ["+525551234567", "+525551234567"],
    ["+1 415 555 1234", "+14155551234"],
  ];

  it.each(validIntlCases)("accepts international %s → %s", (raw, expected) => {
    const result = phoneSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(expected);
  });

  const invalidCases = [
    "",
    "123",
    "abc1234567",
    "555123456",       // 9 digits
    "55512345678",     // 11 digits no +
    "+1234",
  ];

  it.each(invalidCases)("rejects %s", (raw) => {
    const result = phoneSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});

describe("phoneOptionalSchema", () => {
  it("accepts empty string", () => {
    const result = phoneOptionalSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("");
  });

  it("accepts valid MX phone and normalizes", () => {
    const result = phoneOptionalSchema.safeParse("(555) 123-4567");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+525551234567");
  });

  it("rejects invalid phone", () => {
    const result = phoneOptionalSchema.safeParse("abc");
    expect(result.success).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("returns E.164 for valid MX input", () => {
    expect(normalizePhone("555 123 4567")).toBe("+525551234567");
  });

  it("returns E.164 for valid international input", () => {
    expect(normalizePhone("+14155551234")).toBe("+14155551234");
  });

  it("returns null for invalid input", () => {
    expect(normalizePhone("abc")).toBe(null);
    expect(normalizePhone("123")).toBe(null);
  });

  it("returns null for empty input", () => {
    expect(normalizePhone("")).toBe(null);
    expect(normalizePhone("   ")).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @ramcar/shared test -- phone.test.ts
```

Expected: FAIL with "Cannot find module './phone'" (the file does not exist yet).

---

## Task 3: Phone validator — minimal implementation

**Files:**
- Create: `packages/shared/src/validators/phone.ts`

- [ ] **Step 1: Implement the module**

Create `packages/shared/src/validators/phone.ts`:

```ts
import { z } from "zod";
import { parsePhoneNumber } from "libphonenumber-js/min";

/**
 * Attempts to parse `input` as a phone number (MX default, or international with `+`).
 * Returns the E.164 representation (e.g., `+525551234567`) when valid, otherwise `null`.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = parsePhoneNumber(trimmed, "MX");
    if (!parsed || !parsed.isValid()) return null;
    return parsed.number;
  } catch {
    return null;
  }
}

export const phoneSchema = z
  .string()
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (normalized === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "forms.phoneInvalid",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const phoneOptionalSchema = z.union([z.literal(""), phoneSchema]);
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
pnpm --filter @ramcar/shared test -- phone.test.ts
```

Expected: PASS. All cases green (MX valid, international valid, invalid rejected, optional empty accepted, `normalizePhone` returns `null` for bad input).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/validators/phone.ts packages/shared/src/validators/phone.test.ts
git commit -m "feat(shared): add phone validator with E.164 normalization"
```

---

## Task 4: Email validator — write failing tests

**Files:**
- Test: `packages/shared/src/validators/email.test.ts` (create)

- [ ] **Step 1: Write the failing test file**

Create `packages/shared/src/validators/email.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { emailSchema } from "./email";

describe("emailSchema", () => {
  it("accepts a valid address unchanged", () => {
    const result = emailSchema.safeParse("juan@example.com");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("juan@example.com");
  });

  it("trims leading/trailing whitespace", () => {
    const result = emailSchema.safeParse("  juan@example.com  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("juan@example.com");
  });

  it("lowercases mixed-case addresses", () => {
    const result = emailSchema.safeParse("Juan@Example.COM");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("juan@example.com");
  });

  it("rejects empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("rejects missing @", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects missing TLD", () => {
    expect(emailSchema.safeParse("juan@example").success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @ramcar/shared test -- email.test.ts
```

Expected: FAIL with "Cannot find module './email'".

---

## Task 5: Email validator — minimal implementation

**Files:**
- Create: `packages/shared/src/validators/email.ts`

- [ ] **Step 1: Implement the module**

Create `packages/shared/src/validators/email.ts`:

```ts
import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "forms.emailInvalid" });
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
pnpm --filter @ramcar/shared test -- email.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/validators/email.ts packages/shared/src/validators/email.test.ts
git commit -m "feat(shared): add email validator with trim + lowercase"
```

---

## Task 6: Username validator — write failing tests

**Files:**
- Test: `packages/shared/src/validators/username.test.ts` (create)

- [ ] **Step 1: Write the failing test file**

Create `packages/shared/src/validators/username.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  usernameSchema,
  usernameOptionalSchema,
  stripUsernameChars,
} from "./username";

describe("usernameSchema", () => {
  const valid = ["juan.perez", "maria-lopez", "admin_1", "a1b", "abc", "a1-2.3_4"];
  it.each(valid)("accepts %s", (v) => {
    expect(usernameSchema.safeParse(v).success).toBe(true);
  });

  const invalid: Array<[string, string]> = [
    [".juan", "starts with non-alphanumeric"],
    ["-juan", "starts with -"],
    ["_juan", "starts with _"],
    ["juan.", "ends with ."],
    ["juan_", "ends with _"],
    ["juan-", "ends with -"],
    ["ju", "under 3 chars"],
    ["a".repeat(31), "over 30 chars"],
    ["juan..perez", "consecutive ."],
    ["juan__perez", "consecutive _"],
    ["juan--perez", "consecutive -"],
    ["juan perez", "contains space"],
    ["juan@perez", "contains @"],
    ["juan/perez", "contains /"],
  ];

  it.each(invalid)("rejects %s (%s)", (v) => {
    expect(usernameSchema.safeParse(v).success).toBe(false);
  });
});

describe("usernameOptionalSchema", () => {
  it("accepts empty string", () => {
    expect(usernameOptionalSchema.safeParse("").success).toBe(true);
  });

  it("accepts a valid username", () => {
    expect(usernameOptionalSchema.safeParse("juan.perez").success).toBe(true);
  });

  it("rejects a too-short username", () => {
    expect(usernameOptionalSchema.safeParse("ab").success).toBe(false);
  });
});

describe("stripUsernameChars", () => {
  it("removes characters outside [a-zA-Z0-9._-]", () => {
    expect(stripUsernameChars("juan@perez!")).toBe("juanperez");
  });

  it("removes spaces", () => {
    expect(stripUsernameChars("juan perez")).toBe("juanperez");
  });

  it("preserves allowed separators", () => {
    expect(stripUsernameChars("a1.b2-c3_d4")).toBe("a1.b2-c3_d4");
  });

  it("returns empty string unchanged", () => {
    expect(stripUsernameChars("")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @ramcar/shared test -- username.test.ts
```

Expected: FAIL with "Cannot find module './username'".

---

## Task 7: Username validator — minimal implementation

**Files:**
- Create: `packages/shared/src/validators/username.ts`

- [ ] **Step 1: Implement the module**

Create `packages/shared/src/validators/username.ts`:

```ts
import { z } from "zod";

const USERNAME_CHARSET = /^[a-zA-Z0-9._-]+$/;
const USERNAME_START = /^[a-zA-Z0-9]/;
const USERNAME_END = /[a-zA-Z0-9]$/;
const USERNAME_CONSECUTIVE = /[._-]{2,}/;

export const usernameSchema = z
  .string()
  .min(3, { message: "users.validation.usernameTooShort" })
  .max(30, { message: "users.validation.usernameTooLong" })
  .regex(USERNAME_CHARSET, { message: "users.validation.usernameInvalid" })
  .refine((v) => USERNAME_START.test(v), {
    message: "users.validation.usernameInvalid",
  })
  .refine((v) => USERNAME_END.test(v), {
    message: "users.validation.usernameInvalid",
  })
  .refine((v) => !USERNAME_CONSECUTIVE.test(v), {
    message: "users.validation.usernameInvalid",
  });

export const usernameOptionalSchema = z.union([z.literal(""), usernameSchema]);

/** Drops characters outside `[a-zA-Z0-9._-]`. Used by form onChange handlers. */
export function stripUsernameChars(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "");
}
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
pnpm --filter @ramcar/shared test -- username.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/validators/username.ts packages/shared/src/validators/username.test.ts
git commit -m "feat(shared): add username validator and soft-filter helper"
```

---

## Task 8: Export new validators from `@ramcar/shared`

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add re-exports**

Append these exports to `packages/shared/src/index.ts` (after the `visit-person-image` block, before the `navigation` block — alphabetical among validator exports isn't enforced in this file):

```ts
export {
  phoneSchema,
  phoneOptionalSchema,
  normalizePhone,
} from "./validators/phone";
export { emailSchema } from "./validators/email";
export {
  usernameSchema,
  usernameOptionalSchema,
  stripUsernameChars,
} from "./validators/username";
```

- [ ] **Step 2: Verify TypeScript consumers can resolve the exports**

```bash
pnpm --filter @ramcar/shared typecheck
```

Expected: PASS — no errors.

- [ ] **Step 3: Verify all shared tests still pass**

```bash
pnpm --filter @ramcar/shared test
```

Expected: PASS — existing suites unaffected, new phone/email/username suites green.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): export phone/email/username validators"
```

---

## Task 9: Refactor `user.ts` schema — write failing tests first

**Files:**
- Modify: `packages/shared/src/validators/user.test.ts`

- [ ] **Step 1: Extend the existing test file with the new format-rule cases**

Append the following `describe` blocks to the bottom of `packages/shared/src/validators/user.test.ts`:

```ts
describe("createUserSchema — format rules (new)", () => {
  const tenantUuid = "a0000000-0000-0000-0000-000000000001";
  const base = {
    fullName: "John Doe",
    email: "john@example.com",
    role: "guard" as const,
    tenant_ids: [tenantUuid],
    primary_tenant_id: tenantUuid,
    address: "123 Main",
    userGroupIds: [],
  };

  it("normalizes a MX phone to E.164 on parse", () => {
    const result = createUserSchema.safeParse({
      ...base,
      phone: "(555) 123-4567",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // @ts-expect-error — union shape; the branch carries `phone`
      expect(result.data.phone).toBe("+525551234567");
    }
  });

  it("rejects an invalid phone (letters)", () => {
    expect(
      createUserSchema.safeParse({ ...base, phone: "abc1234567" }).success,
    ).toBe(false);
  });

  it("rejects a 9-digit phone", () => {
    expect(
      createUserSchema.safeParse({ ...base, phone: "555123456" }).success,
    ).toBe(false);
  });

  it("lowercases and trims email on parse", () => {
    const result = createUserSchema.safeParse({
      ...base,
      email: "  John@Example.COM  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // @ts-expect-error — union shape; the branch carries `email`
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("rejects username with consecutive separators", () => {
    expect(
      createUserSchema.safeParse({ ...base, username: "juan..perez" }).success,
    ).toBe(false);
  });

  it("accepts username with valid separators", () => {
    expect(
      createUserSchema.safeParse({ ...base, username: "juan.perez-1" }).success,
    ).toBe(true);
  });

  it("rejects username ending in separator", () => {
    expect(
      createUserSchema.safeParse({ ...base, username: "juan." }).success,
    ).toBe(false);
  });
});

describe("updateUserSchema — format rules (new)", () => {
  it("normalizes phone on update", () => {
    const result = updateUserSchema.safeParse({ phone: "555 123 4567" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+525551234567");
  });

  it("rejects invalid phone on update", () => {
    expect(updateUserSchema.safeParse({ phone: "abc" }).success).toBe(false);
  });

  it("lowercases email on update", () => {
    const result = updateUserSchema.safeParse({ email: "Foo@Bar.COM" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("foo@bar.com");
  });
});
```

Also update the existing test at line ~78 that expects `john@doe` to fail — it already fails on `@` in username. No change needed there. Update the test at line ~72 that uses `username: "ab"` — still valid (too short). No change.

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
pnpm --filter @ramcar/shared test -- user.test.ts
```

Expected: FAIL on the new cases — e.g., "expected `+525551234567`, received `(555) 123-4567`" (phone not normalized yet), "expected `john@example.com`, received `  John@Example.COM  `" (email not lowercased yet), and "expected false, received true" for `juan..perez` (current regex `^[a-zA-Z0-9_]+$` already rejects `.` so this specific case passes as-is — but `juan.perez` was _not_ previously accepted either, so the accept-with-separators case will fail).

---

## Task 10: Refactor `user.ts` schema — implement using shared validators

**Files:**
- Modify: `packages/shared/src/validators/user.ts`

- [ ] **Step 1: Replace inline format rules with shared-validator imports**

Rewrite `packages/shared/src/validators/user.ts` to use the new modules. Replace the entire file contents:

```ts
import { z } from "zod";
import { emailSchema } from "./email";
import { phoneOptionalSchema } from "./phone";
import { usernameOptionalSchema } from "./username";

const phoneTypeEnum = z.enum(["house", "cellphone", "work", "primary"]);
const userStatusEnum = z.enum(["active", "inactive"]);
const roleEnum = z.enum(["super_admin", "admin", "guard", "resident"]);
const sortByEnum = z.enum([
  "full_name",
  "email",
  "role",
  "status",
  "created_at",
]);
const sortOrderEnum = z.enum(["asc", "desc"]);

const tenantIdsArray = z
  .array(z.string().uuid())
  .min(1, "users.validation.atLeastOneTenant")
  .max(50, "users.validation.tooManyTenants");

const adminGuardTenantObj = z.object({
  tenant_ids: tenantIdsArray,
  primary_tenant_id: z.string().uuid(),
});

const baseCreateUserObj = z.object({
  fullName: z.string().min(1, "Full name is required").max(255),
  email: emailSchema,
  address: z.string().max(500).optional().or(z.literal("")),
  username: usernameOptionalSchema.optional(),
  phone: phoneOptionalSchema.optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
  phoneType: phoneTypeEnum.optional(),
  userGroupIds: z.array(z.string().uuid()).default([]),
  observations: z.string().max(1000).optional().or(z.literal("")),
});

function passwordRefine<T extends { password?: string | null; confirmPassword?: string | null }>(
  data: T,
): boolean {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}

const residentCreateBranch = baseCreateUserObj.extend({
  role: z.literal("resident"),
  tenantId: z.string().uuid("Invalid tenant ID"),
  address: z.string().min(1, "Address is required").max(500),
});

const adminCreateBranch = baseCreateUserObj
  .extend({ role: z.literal("admin") })
  .merge(adminGuardTenantObj)
  .refine((v) => v.tenant_ids.includes(v.primary_tenant_id), {
    message: "users.validation.primaryMustBeSelected",
    path: ["primary_tenant_id"],
  });

const guardCreateBranch = baseCreateUserObj
  .extend({ role: z.literal("guard") })
  .merge(adminGuardTenantObj)
  .refine((v) => v.tenant_ids.includes(v.primary_tenant_id), {
    message: "users.validation.primaryMustBeSelected",
    path: ["primary_tenant_id"],
  });

const superAdminCreateBranch = baseCreateUserObj.extend({ role: z.literal("super_admin") });

export const createUserSchema = z
  .union([residentCreateBranch, adminCreateBranch, guardCreateBranch, superAdminCreateBranch])
  .refine(passwordRefine, { message: "Passwords do not match", path: ["confirmPassword"] });

export type CreateUserInput = z.input<typeof createUserSchema>;

const updateUserObj = z.object({
  fullName: z.string().min(1, "Full name is required").max(255).optional(),
  email: emailSchema.optional(),
  address: z.string().max(500).optional().or(z.literal("")),
  username: usernameOptionalSchema.optional(),
  phone: phoneOptionalSchema.optional(),
  phoneType: phoneTypeEnum.optional().nullable(),
  userGroupIds: z.array(z.string().uuid()).optional(),
  observations: z.string().max(1000).optional().nullable(),
  role: roleEnum.optional(),
  tenantId: z.string().uuid().optional(),
  tenant_ids: tenantIdsArray.optional(),
  primary_tenant_id: z.string().uuid().optional(),
});

export const updateUserSchema = updateUserObj.superRefine((data, ctx) => {
  if (data.role === "resident" && data.address !== undefined && data.address.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 1,
      type: "string",
      inclusive: true,
      message: "Address is required",
      path: ["address"],
    });
  }

  if (
    (data.role === "admin" || data.role === "guard") &&
    data.tenant_ids !== undefined &&
    data.primary_tenant_id !== undefined &&
    !data.tenant_ids.includes(data.primary_tenant_id)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "users.validation.primaryMustBeSelected",
      path: ["primary_tenant_id"],
    });
  }
});

export type UpdateUserInput = z.input<typeof updateUserSchema>;

export const userFiltersSchema = z.object({
  search: z.string().optional(),
  tenantId: z.string().uuid().optional(),
  role: roleEnum.optional(),
  status: userStatusEnum.optional(),
  sortBy: sortByEnum.default("full_name"),
  sortOrder: sortOrderEnum.default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserFiltersInput = z.infer<typeof userFiltersSchema>;

export const toggleStatusSchema = z.object({
  status: userStatusEnum,
});

export type ToggleStatusInput = z.infer<typeof toggleStatusSchema>;
```

- [ ] **Step 2: Run all user tests to verify they pass**

```bash
pnpm --filter @ramcar/shared test -- user.test.ts
```

Expected: PASS. The existing `rejects username with special characters` (`john@doe`) still fails parse as before; the new normalize/lowercase/separator cases all pass.

- [ ] **Step 3: Update legacy fixtures in `user.test.ts` to carry valid E.164 phones**

The pre-existing fixtures at the top of `user.test.ts` use `phone: "+1234567890"` (9 digits after `+1` — invalid) and `phone: "+9876543210"` (`+987` is not a country code). With the new validator these would fail, breaking a dozen downstream tests that share the fixture.

In `packages/shared/src/validators/user.test.ts` line 19, change:

```ts
    phone: "+1234567890",
```

to:

```ts
    phone: "+14155551234",
```

And on line 199, change:

```ts
    phone: "+9876543210",
```

to:

```ts
    phone: "+14155551234",
```

Both are valid US numbers in E.164 and will parse+normalize to themselves — the existing assertions only check `.success === true`, so no further updates are required.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/validators/user.ts packages/shared/src/validators/user.test.ts
git commit -m "refactor(shared): user schema uses shared phone/email/username validators"
```

---

## Task 11: Refactor `visit-person.ts` schema — write failing tests

**Files:**
- Create: `packages/shared/src/validators/visit-person.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect } from "vitest";
import {
  createVisitPersonSchema,
  updateVisitPersonSchema,
  visitPersonFiltersSchema,
} from "./visit-person";

describe("createVisitPersonSchema", () => {
  const base = {
    type: "visitor" as const,
    fullName: "Jane Visitor",
    status: "allowed" as const,
  };

  it("accepts the minimal input (type + fullName)", () => {
    expect(createVisitPersonSchema.safeParse(base).success).toBe(true);
  });

  it("accepts empty phone", () => {
    expect(
      createVisitPersonSchema.safeParse({ ...base, phone: "" }).success,
    ).toBe(true);
  });

  it("normalizes a valid MX phone to E.164", () => {
    const result = createVisitPersonSchema.safeParse({
      ...base,
      phone: "555 123 4567",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+525551234567");
  });

  it("accepts international phone with + prefix", () => {
    const result = createVisitPersonSchema.safeParse({
      ...base,
      phone: "+14155551234",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+14155551234");
  });

  it("rejects invalid phone (letters)", () => {
    expect(
      createVisitPersonSchema.safeParse({ ...base, phone: "not-a-phone" })
        .success,
    ).toBe(false);
  });

  it("rejects phone with 9 digits", () => {
    expect(
      createVisitPersonSchema.safeParse({ ...base, phone: "123456789" }).success,
    ).toBe(false);
  });
});

describe("updateVisitPersonSchema", () => {
  it("accepts an empty update", () => {
    expect(updateVisitPersonSchema.safeParse({}).success).toBe(true);
  });

  it("normalizes phone on update", () => {
    const result = updateVisitPersonSchema.safeParse({ phone: "(555) 123-4567" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+525551234567");
  });

  it("rejects an invalid phone on update", () => {
    expect(
      updateVisitPersonSchema.safeParse({ phone: "abc" }).success,
    ).toBe(false);
  });
});

describe("visitPersonFiltersSchema", () => {
  it("applies defaults", () => {
    const result = visitPersonFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.sortBy).toBe("full_name");
      expect(result.data.sortOrder).toBe("asc");
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @ramcar/shared test -- visit-person.test.ts
```

Expected: FAIL — phone normalization cases fail because `z.string().max(30)` currently leaves raw strings as-is, and the invalid-phone cases also fail because the current schema accepts any short string.

---

## Task 12: Refactor `visit-person.ts` schema — implement

**Files:**
- Modify: `packages/shared/src/validators/visit-person.ts`

- [ ] **Step 1: Replace raw phone strings with `phoneOptionalSchema`**

Rewrite `packages/shared/src/validators/visit-person.ts`:

```ts
import { z } from "zod";
import { phoneOptionalSchema } from "./phone";

const visitPersonTypeEnum = z.enum(["visitor", "service_provider"]);
const visitPersonStatusEnum = z.enum(["allowed", "flagged", "denied"]);
const sortByEnum = z.enum(["full_name", "code", "created_at"]);
const sortOrderEnum = z.enum(["asc", "desc"]);

export const createVisitPersonSchema = z.object({
  type: visitPersonTypeEnum,
  fullName: z.string().min(1).max(255),
  status: visitPersonStatusEnum.default("allowed"),
  phone: phoneOptionalSchema.optional(),
  company: z.string().max(255).optional().or(z.literal("")),
  residentId: z.string().uuid().optional(),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateVisitPersonInput = z.infer<typeof createVisitPersonSchema>;

export const updateVisitPersonSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  status: visitPersonStatusEnum.optional(),
  phone: phoneOptionalSchema.optional(),
  company: z.string().max(255).optional().or(z.literal("")),
  residentId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
});

export type UpdateVisitPersonInput = z.infer<typeof updateVisitPersonSchema>;

export const visitPersonFiltersSchema = z.object({
  type: visitPersonTypeEnum.optional(),
  search: z.string().optional(),
  status: visitPersonStatusEnum.optional(),
  sortBy: sortByEnum.default("full_name"),
  sortOrder: sortOrderEnum.default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type VisitPersonFiltersInput = z.infer<typeof visitPersonFiltersSchema>;
```

- [ ] **Step 2: Run visit-person tests to verify they pass**

```bash
pnpm --filter @ramcar/shared test -- visit-person.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run the full shared test suite to confirm no regressions**

```bash
pnpm --filter @ramcar/shared test
```

Expected: PASS — all of phone, email, username, user, visit-person, access-event, auth, vehicle suites green.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/validators/visit-person.ts packages/shared/src/validators/visit-person.test.ts
git commit -m "refactor(shared): visit-person schema uses shared phone validator"
```

---

## Task 13: Add i18n message keys — English

**Files:**
- Modify: `packages/i18n/src/messages/en.json`

- [ ] **Step 1: Add a top-level `forms` block**

At the top level of `packages/i18n/src/messages/en.json`, after the `common` block (around line 12), insert:

```json
  "forms": {
    "phoneHelp": "Mexican 10-digit number or international with + prefix",
    "phoneInvalid": "Invalid phone number",
    "phonePlaceholder": "(555) 123-4567",
    "emailInvalid": "Invalid email address"
  },
```

- [ ] **Step 2: Add the username keys to the `users` block**

Inside the `users.form` object (around line 97) add `usernameHelp`:

```json
      "username": "Username",
      "usernameHelp": "3–30 characters. Letters, numbers, and . _ -. Must start with a letter or number.",
      "usernamePlaceholder": "juan.perez",
```

Inside the `users.validation` object (around line 181) add the three new keys:

```json
    "validation": {
      "atLeastOneTenant": "Select at least one tenant",
      "primaryMustBeSelected": "The primary tenant must be one of the assigned tenants",
      "tooManyTenants": "A user cannot be assigned to more than 50 tenants",
      "usernameInvalid": "Invalid username format",
      "usernameTooShort": "Username must be at least 3 characters",
      "usernameTooLong": "Username must be at most 30 characters"
    },
```

- [ ] **Step 3: Validate the JSON parses**

```bash
node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/en.json', 'utf8')); console.log('ok')"
```

Expected: prints `ok`. (If you see `SyntaxError`, fix the trailing-comma / brace issue.)

---

## Task 14: Add i18n message keys — Spanish

**Files:**
- Modify: `packages/i18n/src/messages/es.json`

- [ ] **Step 1: Mirror the new keys in Spanish**

At the same insertion points as Task 13 (after the Spanish `common` block):

```json
  "forms": {
    "phoneHelp": "Número mexicano de 10 dígitos o internacional con prefijo +",
    "phoneInvalid": "Número de teléfono inválido",
    "phonePlaceholder": "(555) 123-4567",
    "emailInvalid": "Correo electrónico inválido"
  },
```

Inside `users.form`:

```json
      "username": "Usuario",
      "usernameHelp": "3–30 caracteres. Letras, números y . _ -. Debe comenzar con letra o número.",
      "usernamePlaceholder": "juan.perez",
```

Inside `users.validation`:

```json
      "usernameInvalid": "Formato de usuario inválido",
      "usernameTooShort": "El usuario debe tener al menos 3 caracteres",
      "usernameTooLong": "El usuario debe tener a lo sumo 30 caracteres"
```

- [ ] **Step 2: Validate the JSON parses**

```bash
node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/es.json', 'utf8')); console.log('ok')"
```

Expected: prints `ok`.

- [ ] **Step 3: Typecheck the i18n package**

```bash
pnpm --filter @ramcar/i18n typecheck
```

Expected: PASS. `Messages = typeof es` is still structurally valid; `en.json` and `es.json` must have the same shape — if typecheck fails, double-check that every key added to `en.json` exists in `es.json` with the same nesting.

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/messages/en.json packages/i18n/src/messages/es.json
git commit -m "feat(i18n): add form format validation messages (en + es)"
```

---

## Task 15: User form — write failing test first

**Files:**
- Test: `apps/web/src/features/users/__tests__/user-form-validation.test.tsx` (create)

- [ ] **Step 1: Create the failing test**

Create `apps/web/src/features/users/__tests__/user-form-validation.test.tsx`:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { ExtendedUserProfile } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  // Echo the namespace + key so `tForms("phoneInvalid")` renders as "forms.phoneInvalid".
  useTranslations: (ns?: string) => (key: string) =>
    ns ? `${ns}.${key}` : key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({
    wasRestored: false,
    discardDraft: () => {},
    clearDraft: () => {},
  }),
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({
      user: { userId: "u1", role: "super_admin", tenantId: "t1" },
      tenantIds: ["t1"],
    }),
}));

import { UserForm } from "../components/user-form";

function makeUser(overrides: Partial<ExtendedUserProfile> = {}): ExtendedUserProfile {
  return {
    id: "p1",
    userId: "u1",
    tenantId: "t1",
    tenantName: "T",
    tenantIds: ["t1"],
    fullName: "John",
    email: "john@example.com",
    role: "guard",
    address: "addr",
    username: "johndoe",
    phone: "",
    phoneType: null,
    status: "active",
    userGroupIds: [],
    userGroups: [],
    observations: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    canEdit: true,
    canDeactivate: false,
    ...overrides,
  };
}

// All format-validation tests run in edit mode with a super_admin profile so the
// role dropdown does not need to be driven through the Radix combobox.
const baseProfile = makeUser({
  userId: "u1",
  role: "super_admin",
  username: "",
  phone: "",
});

describe("UserForm — format validation", () => {
  it("soft-filters disallowed characters from username input", () => {
    render(
      <UserForm
        mode="edit"
        initialData={baseProfile}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByLabelText(/form\.username/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "juan@perez!" } });
    expect(input.value).toBe("juanperez");
  });

  it("shows an invalid-phone error on blur", () => {
    render(
      <UserForm
        mode="edit"
        initialData={baseProfile}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByLabelText(/form\.phone(?!Type)/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);
    expect(screen.getByText("forms.phoneInvalid")).toBeInTheDocument();
  });

  it("normalizes phone to E.164 on submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={baseProfile}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/form\.email/i), {
      target: { value: "Jane@Example.COM" },
    });
    fireEvent.change(screen.getByLabelText(/form\.phone(?!Type)/i), {
      target: { value: "(555) 123-4567" },
    });
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.phone).toBe("+525551234567");
    expect(payload.email).toBe("jane@example.com");
  });

  it("does NOT overwrite username with phone on submit (regression guard)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={baseProfile}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/form\.phone(?!Type)/i), {
      target: { value: "5551234567" },
    });
    fireEvent.change(screen.getByLabelText(/form\.username/i), {
      target: { value: "janedoe" },
    });
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.username).toBe("janedoe");
    expect(payload.username).not.toBe(payload.phone);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @ramcar/web test -- user-form-validation.test.tsx
```

Expected: FAIL. The soft-filter test fails (disallowed chars remain in the input), the blur test fails (no error is rendered), normalization test fails (phone stays `(555) 123-4567`), and the regression guard fails (`payload.username` equals the phone value due to the bug at `user-form.tsx:176`).

---

## Task 16: User form — implement shared-schema validation + fix bug

**Files:**
- Modify: `apps/web/src/features/users/components/user-form.tsx`

- [ ] **Step 1: Update imports**

At the top of `apps/web/src/features/users/components/user-form.tsx`, replace the current `@ramcar/shared` import line with:

```tsx
import {
  getAssignableRoles,
  normalizePhone,
  phoneOptionalSchema,
  stripUsernameChars,
  usernameOptionalSchema,
  emailSchema,
} from "@ramcar/shared";
import type { Role } from "@ramcar/shared";
```

- [ ] **Step 2: Replace the `validate` function body**

At `apps/web/src/features/users/components/user-form.tsx` around line 130, replace the entire `const validate = (): boolean => { … }` with:

```tsx
  const validateField = (name: keyof UserFormData, value: string): string | null => {
    if (name === "email") {
      if (!value.trim()) return null;
      const parsed = emailSchema.safeParse(value);
      return parsed.success ? null : "forms.emailInvalid";
    }
    if (name === "phone") {
      if (!value.trim()) return null;
      const parsed = phoneOptionalSchema.safeParse(value);
      return parsed.success ? null : "forms.phoneInvalid";
    }
    if (name === "username") {
      if (!value) return null;
      const parsed = usernameOptionalSchema.safeParse(value);
      if (parsed.success) return null;
      const first = parsed.error.issues[0]?.message;
      return first ?? "users.validation.usernameInvalid";
    }
    return null;
  };

  const handleBlurField = (name: keyof UserFormData) => () => {
    const value = (formData[name] ?? "") as string;
    const err = validateField(name, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[name] = err;
      else delete next[name];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = "Required";
    const emailErr = validateField("email", formData.email);
    if (!formData.email.trim() || emailErr) errs.email = emailErr ?? "Required";
    if (!formData.role) errs.role = "Required";

    const role = formData.role;
    if (role === "resident") {
      if (!formData.tenantId) errs.tenantId = "Required";
    } else if (role === "admin" || role === "guard") {
      if (formData.tenantIds.length === 0) {
        errs.tenantIds = t("validation.atLeastOneTenant");
      } else if (!formData.primaryTenantId) {
        errs.primaryTenantId = t("validation.primaryMustBeSelected");
      } else if (!formData.tenantIds.includes(formData.primaryTenantId)) {
        errs.primaryTenantId = t("validation.primaryMustBeSelected");
      }
    }

    if (role === "resident" && !formData.address.trim()) {
      errs.address = "Required";
    }

    const phoneErr = validateField("phone", formData.phone);
    if (phoneErr) errs.phone = phoneErr;

    const usernameErr = validateField("username", formData.username);
    if (usernameErr) errs.username = usernameErr;

    if (!isEdit && formData.password && formData.password.length > 0) {
      if (formData.password.length < 8) errs.password = "Min 8 characters";
      if (formData.password !== formData.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
```

- [ ] **Step 3: Replace the `handleSubmit` transformation block (fix the bug)**

At the same file, replace the object-spread block at `user-form.tsx:173-177` (the one building `submitData`) with:

```tsx
    const normalizedPhone = formData.phone.trim()
      ? normalizePhone(formData.phone)
      : "";
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedUsername = formData.username.trim();

    const submitData: Record<string, unknown> = {
      ...formData,
      email: trimmedEmail,
      phone: normalizedPhone ? normalizedPhone : undefined,
      username: trimmedUsername.length > 0 ? trimmedUsername : undefined,
    };
```

- [ ] **Step 4: Hoist a second translator for the `forms.*` namespace**

Near the top of the component, just after `const t = useTranslations("users");` (line 61), add:

```tsx
  const tForms = useTranslations("forms");
```

- [ ] **Step 5: Wire blur handlers, placeholders, and helper text onto the inputs**

In the email input block (around line 232), change:

```tsx
            onChange={(e) => updateField("email", e.target.value)}
```

to:

```tsx
            onChange={(e) => updateField("email", e.target.value)}
            onBlur={handleBlurField("email")}
```

In the phone input block (around line 330), change:

```tsx
              onChange={(e) => updateField("phone", e.target.value)}
```

to:

```tsx
              onChange={(e) => updateField("phone", e.target.value)}
              onBlur={handleBlurField("phone")}
              placeholder={tForms("phonePlaceholder")}
```

Under the phone `{errors.phone && …}` line, add a helper paragraph:

```tsx
            {!errors.phone && (
              <p className="text-xs text-muted-foreground">
                {tForms("phoneHelp")}
              </p>
            )}
```

In the username input block (around line 364), change:

```tsx
            onChange={(e) => updateField("username", e.target.value)}
```

to:

```tsx
            onChange={(e) =>
              updateField("username", stripUsernameChars(e.target.value))
            }
            onBlur={handleBlurField("username")}
            placeholder={t("form.usernamePlaceholder")}
```

Under the username `{errors.username && …}` line, add a helper paragraph:

```tsx
            {!errors.username && (
              <p className="text-xs text-muted-foreground">
                {t("form.usernameHelp")}
              </p>
            )}
```

- [ ] **Step 6: Update existing user-form test fixtures that carry invalid phones**

Two existing tests seed `makeUser` fixtures with `phone: "5551"`, which is now an invalid 4-digit phone and would cause `validate()` to fail. These tests submit the form and assert `onSubmit` was called, so they'll regress unless the phones are updated.

In `apps/web/src/features/users/__tests__/user-form-role-lock.test.tsx` line 38, change:

```tsx
    username: "self", phone: "5551", phoneType: null, status: "active",
```

to:

```tsx
    username: "self", phone: "+525551234567", phoneType: null, status: "active",
```

In `apps/web/src/features/users/__tests__/user-form-user-group.test.tsx` line 33, change:

```tsx
    username: "target", phone: "5551", phoneType: null, status: "active",
```

to:

```tsx
    username: "target", phone: "+525551234567", phoneType: null, status: "active",
```

(`user-sidebar.test.tsx` and `users-table-columns.test.tsx` don't submit through `validate()`, so their `phone: "5551"` / `phone: "555-1"` fixtures can stay.)

- [ ] **Step 7: Run the test to verify it passes**

```bash
pnpm --filter @ramcar/web test -- user-form-validation.test.tsx
```

Expected: PASS on all four cases (soft-filter, blur error, phone normalized, username not overwritten).

- [ ] **Step 8: Run the broader user-form test file**

```bash
pnpm --filter @ramcar/web test -- user-form
```

Expected: PASS — `user-form-role-lock`, `user-form-user-group`, `user-form-validation` all green.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/users/components/user-form.tsx apps/web/src/features/users/__tests__/user-form-validation.test.tsx apps/web/src/features/users/__tests__/user-form-role-lock.test.tsx apps/web/src/features/users/__tests__/user-form-user-group.test.tsx
git commit -m "fix(web/users): apply shared format validators and fix username=phone bug"
```

---

## Task 17: Provider form (web) — write failing test

**Files:**
- Test: `apps/web/src/features/providers/__tests__/provider-form-validation.test.tsx` (create)

- [ ] **Step 1: Create the failing test**

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) =>
    ns ? `${ns}.${key}` : key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({
    wasRestored: false,
    discardDraft: () => {},
    clearDraft: () => {},
  }),
}));

vi.mock("@ramcar/features/shared/resident-select", () => ({
  ResidentSelect: () => null,
}));

vi.mock("@ramcar/features/shared/visit-person-status-select", () => ({
  VisitPersonStatusSelect: () => null,
}));

vi.mock("@ramcar/features/visitors", () => ({
  ImageSection: () => null,
}));

import { ProviderForm } from "../components/provider-form";

describe("ProviderForm (web) — phone validation", () => {
  it("shows an invalid-phone error on blur", () => {
    render(
      <ProviderForm
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );
    const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: "abc" } });
    fireEvent.blur(phoneInput);
    expect(screen.getByText("forms.phoneInvalid")).toBeInTheDocument();
  });

  it("normalizes phone to E.164 on submit", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProviderForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />,
    );
    fireEvent.change(screen.getByLabelText(/fullName/i), {
      target: { value: "Juan Provider" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "(555) 123-4567" },
    });
    const form = container.querySelector("form")!;
    form.requestSubmit();
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.phone).toBe("+525551234567");
  });

  it("does NOT submit when phone is invalid", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProviderForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />,
    );
    fireEvent.change(screen.getByLabelText(/fullName/i), {
      target: { value: "Juan" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "123" },
    });
    const form = container.querySelector("form")!;
    form.requestSubmit();
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @ramcar/web test -- provider-form-validation.test.tsx
```

Expected: FAIL — no error rendered on blur, phone not normalized, invalid phone is submitted.

---

## Task 18: Provider form (web) — implement phone validation + normalization

**Files:**
- Modify: `apps/web/src/features/providers/components/provider-form.tsx`

- [ ] **Step 1: Add imports + blur/submit logic**

At the top of `apps/web/src/features/providers/components/provider-form.tsx`, add:

```tsx
import { normalizePhone, phoneOptionalSchema } from "@ramcar/shared";
```

Inside the `ProviderForm` component, just after `const tCommon = useTranslations("common");`, hoist a translator for the `forms.*` namespace:

```tsx
  const tForms = useTranslations("forms");
```

After `const [notes, setNotes] = useState("");`, add phone-error state + blur handler:

```tsx
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneBlur = () => {
    if (!phone.trim()) {
      setPhoneError(null);
      return;
    }
    const parsed = phoneOptionalSchema.safeParse(phone);
    setPhoneError(parsed.success ? null : "forms.phoneInvalid");
  };
```

- [ ] **Step 2: Replace `handleSubmit` body**

Replace the existing `handleSubmit` body with:

```tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";
    if (phone.trim() && normalizedPhone === null) {
      setPhoneError("forms.phoneInvalid");
      return;
    }
    clearDraft();
    const filesByType = new Map<ImageType, File>();
    stagedImages.forEach(({ file }, type) => filesByType.set(type, file));
    onSave({
      fullName: fullName.trim(),
      phone: normalizedPhone ?? "",
      company,
      status,
      residentId,
      notes,
      stagedImages: filesByType,
    });
  };
```

- [ ] **Step 3: Wire the blur handler + helper text onto the phone input**

Replace the phone field block (around line 137):

```tsx
      <div className="space-y-2">
        <Label htmlFor="provider-phone">{t("phone")}</Label>
        <Input
          id="provider-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={handlePhoneBlur}
          placeholder={tForms("phonePlaceholder")}
          aria-invalid={!!phoneError}
        />
        {phoneError ? (
          <p className="text-sm text-destructive">{tForms("phoneInvalid")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{tForms("phoneHelp")}</p>
        )}
      </div>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter @ramcar/web test -- provider-form-validation.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/providers/components/provider-form.tsx apps/web/src/features/providers/__tests__/provider-form-validation.test.tsx
git commit -m "feat(web/providers): validate and normalize phone on create"
```

---

## Task 19: Provider edit form (web) — apply same validation

**Files:**
- Modify: `apps/web/src/features/providers/components/provider-edit-form.tsx`

- [ ] **Step 1: Add imports + blur/submit logic**

At the top, add:

```tsx
import { normalizePhone, phoneOptionalSchema } from "@ramcar/shared";
```

Inside `ProviderEditForm`, just after `const tCommon = useTranslations("common");`, hoist the forms translator:

```tsx
  const tForms = useTranslations("forms");
```

After `const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);`, add:

```tsx
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneBlur = () => {
    if (!state.phone.trim()) {
      setPhoneError(null);
      return;
    }
    const parsed = phoneOptionalSchema.safeParse(state.phone);
    setPhoneError(parsed.success ? null : "forms.phoneInvalid");
  };
```

- [ ] **Step 2: Update `handleSubmit`**

Replace the existing `handleSubmit`:

```tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.fullName.trim()) return;
    const normalizedPhone = state.phone.trim() ? normalizePhone(state.phone) : "";
    if (state.phone.trim() && normalizedPhone === null) {
      setPhoneError("forms.phoneInvalid");
      return;
    }
    clearDraft();
    onSave({
      fullName: state.fullName.trim(),
      phone: normalizedPhone ?? "",
      company: state.company,
      status: state.status,
      residentId: state.residentId || null,
      notes: state.notes,
    });
  };
```

- [ ] **Step 3: Wire the blur + helper/error onto the phone input**

Replace the phone field block (around line 143):

```tsx
        <div className="space-y-2">
          <Label htmlFor="provider-edit-phone">{t("phone")}</Label>
          <Input
            id="provider-edit-phone"
            value={state.phone}
            onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
            onBlur={handlePhoneBlur}
            placeholder={tForms("phonePlaceholder")}
            aria-invalid={!!phoneError}
          />
          {phoneError ? (
            <p className="text-sm text-destructive">{tForms("phoneInvalid")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{tForms("phoneHelp")}</p>
          )}
        </div>
```

- [ ] **Step 4: Typecheck + run the provider form suite**

```bash
pnpm --filter @ramcar/web typecheck
pnpm --filter @ramcar/web test -- provider
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/providers/components/provider-edit-form.tsx
git commit -m "feat(web/providers): validate and normalize phone on edit"
```

---

## Task 20: Provider form (desktop) — write failing test

**Files:**
- Test: `apps/desktop/src/features/providers/__tests__/provider-form-validation.test.tsx` (create)

- [ ] **Step 1: Create the failing test**

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(() => cleanup());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@ramcar/features/shared/visit-person-status-select", () => ({
  VisitPersonStatusSelect: () => null,
}));

vi.mock("@ramcar/features/visitors", () => ({
  ImageSection: () => null,
}));

import { ProviderForm } from "../components/provider-form";

describe("ProviderForm (desktop) — phone validation", () => {
  it("shows invalid-phone error on blur", () => {
    render(
      <ProviderForm onSave={vi.fn()} onCancel={vi.fn()} isSaving={false} />,
    );
    const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: "abc" } });
    fireEvent.blur(phoneInput);
    expect(screen.getByText("forms.phoneInvalid")).toBeInTheDocument();
  });

  it("normalizes phone on submit", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProviderForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />,
    );
    fireEvent.change(screen.getByLabelText(/fullName/i), { target: { value: "Juan" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "(555) 123-4567" } });
    container.querySelector("form")!.requestSubmit();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0][0] as Record<string, unknown>).phone).toBe("+525551234567");
  });

  it("blocks submit with invalid phone", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProviderForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />,
    );
    fireEvent.change(screen.getByLabelText(/fullName/i), { target: { value: "Juan" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "123" } });
    container.querySelector("form")!.requestSubmit();
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @ramcar/desktop test -- provider-form-validation.test.tsx
```

Expected: FAIL.

---

## Task 21: Provider form (desktop) — implement

**Files:**
- Modify: `apps/desktop/src/features/providers/components/provider-form.tsx`
- Modify: `apps/desktop/src/features/providers/components/provider-edit-form.tsx`

- [ ] **Step 1: Mirror Task 18 changes into `apps/desktop/src/features/providers/components/provider-form.tsx`**

Apply the same three edits as Task 18 Steps 1–3 (imports, `phoneError` state + blur handler, `handleSubmit` replacement, phone input block with `onBlur`/`aria-invalid`/error/helper). The file structure is identical — just swap `useTranslations` usage for `useTranslation().t` that's already in scope.

- [ ] **Step 2: Mirror Task 19 changes into `apps/desktop/src/features/providers/components/provider-edit-form.tsx`**

Apply the same edits as Task 19 Steps 1–3.

- [ ] **Step 3: Run the desktop provider tests**

```bash
pnpm --filter @ramcar/desktop test -- provider
```

Expected: PASS — the new `provider-form-validation.test.tsx` is green and existing tests unaffected.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/providers/components/provider-form.tsx apps/desktop/src/features/providers/components/provider-edit-form.tsx apps/desktop/src/features/providers/__tests__/provider-form-validation.test.tsx
git commit -m "feat(desktop/providers): validate and normalize phone on create and edit"
```

---

## Task 22: Visit person form (shared) — update failing test

**Files:**
- Modify: `packages/features/src/visitors/__tests__/visit-person-form-validation.test.tsx`

- [ ] **Step 1: Append phone coverage**

Append the following `describe` block to `packages/features/src/visitors/__tests__/visit-person-form-validation.test.tsx`:

```tsx
describe("VisitPersonForm — phone validation", () => {
  it("shows invalid-phone error on blur", async () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />);
    const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: "abc" } });
    fireEvent.blur(phoneInput);
    await waitFor(() => {
      expect(screen.getByText("forms.phoneInvalid")).toBeInTheDocument();
    });
  });

  it("normalizes phone to E.164 on submit", async () => {
    const onSave = vi.fn();
    renderWithHarness(
      <VisitPersonForm {...defaultProps} onSave={onSave} />,
    );
    fireEvent.change(
      screen.getAllByPlaceholderText("visitPersons.form.fullName")[0],
      { target: { value: "Jane" } },
    );
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "(555) 123-4567" },
    });
    const form = document.querySelector("form")!;
    form.requestSubmit();
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    const payload = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.phone).toBe("+525551234567");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @ramcar/features test -- visit-person-form-validation
```

Expected: FAIL — phone input does not exist yet on `VisitPersonForm`, so `getByLabelText(/phone/i)` throws "Unable to find a label with the text of".

---

## Task 23: Visit person form (shared) — add phone field + normalize

**Files:**
- Modify: `packages/features/src/visitors/components/visit-person-form.tsx`

- [ ] **Step 1: Add imports + phone state**

At the top of `packages/features/src/visitors/components/visit-person-form.tsx`, add:

```tsx
import { normalizePhone, phoneOptionalSchema } from "@ramcar/shared";
```

Update the `VisitPersonFormData` and `VisitPersonFormDraft` interfaces to include `phone: string`:

```tsx
interface VisitPersonFormData {
  fullName: string;
  phone: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
  stagedImages: Map<ImageType, File>;
}

interface VisitPersonFormDraft {
  fullName: string;
  phone: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
}
```

Inside the component, add state + blur handler after `const [notes, setNotes] = …`:

```tsx
  const [phone, setPhone] = useState(initialDraft?.phone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneBlur = () => {
    if (!phone.trim()) {
      setPhoneError(null);
      return;
    }
    const parsed = phoneOptionalSchema.safeParse(phone);
    setPhoneError(parsed.success ? null : "forms.phoneInvalid");
  };
```

- [ ] **Step 2: Include phone in `composedData`**

Change the `composedData` useMemo:

```tsx
  const composedData = useMemo(
    () => ({ fullName, phone, status, residentId, notes }),
    [fullName, phone, status, residentId, notes],
  );
```

- [ ] **Step 3: Normalize on submit**

Replace the `handleSubmit` body:

```tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";
    if (phone.trim() && normalizedPhone === null) {
      setPhoneError("forms.phoneInvalid");
      return;
    }
    const filesByType = new Map<ImageType, File>();
    stagedImages.forEach(({ file }, type) => filesByType.set(type, file));
    onSave({
      fullName: fullName.trim(),
      phone: normalizedPhone ?? "",
      status,
      residentId,
      notes,
      stagedImages: filesByType,
    });
  };
```

- [ ] **Step 4: Render the phone field**

Insert a phone field between the `fullName` block and the `status` block:

```tsx
      <div className="space-y-2">
        <Label htmlFor="visit-person-phone">{t("visitPersons.form.phone")}</Label>
        <Input
          id="visit-person-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={handlePhoneBlur}
          placeholder="(555) 123-4567"
          aria-invalid={!!phoneError}
        />
        {phoneError ? (
          <p className="text-sm text-destructive">{t(phoneError)}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("forms.phoneHelp")}</p>
        )}
      </div>
```

- [ ] **Step 5: Run the test**

```bash
pnpm --filter @ramcar/features test -- visit-person-form-validation
```

Expected: PASS. `VisitPersonForm` renders the phone field, the blur test finds the error, and submit normalizes.

- [ ] **Step 6: Commit**

```bash
git add packages/features/src/visitors/components/visit-person-form.tsx packages/features/src/visitors/__tests__/visit-person-form-validation.test.tsx
git commit -m "feat(features/visitors): add phone field with validation + E.164 normalization"
```

---

## Task 24: Visit person edit form (shared) — add phone field

**Files:**
- Modify: `packages/features/src/visitors/components/visit-person-edit-form.tsx`

- [ ] **Step 1: Update imports and `EditFormState`**

At the top, add:

```tsx
import { normalizePhone, phoneOptionalSchema } from "@ramcar/shared";
```

Change `EditFormState` to include phone:

```tsx
interface EditFormState {
  fullName: string;
  phone: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
  [key: string]: unknown;
}
```

Update `initialFromPerson`:

```tsx
function initialFromPerson(person: VisitPerson): EditFormState {
  return {
    fullName: person.fullName,
    phone: person.phone ?? "",
    status: person.status,
    residentId: person.residentId ?? "",
    notes: person.notes ?? "",
  };
}
```

Update `hasChanges`:

```tsx
function hasChanges(initial: EditFormState, current: EditFormState): boolean {
  return (
    initial.fullName !== current.fullName ||
    initial.phone !== current.phone ||
    initial.status !== current.status ||
    initial.residentId !== current.residentId ||
    initial.notes !== current.notes
  );
}
```

- [ ] **Step 2: Add blur state + normalization in submit**

Inside the component, after `const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);`, add:

```tsx
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneBlur = () => {
    if (!state.phone.trim()) {
      setPhoneError(null);
      return;
    }
    const parsed = phoneOptionalSchema.safeParse(state.phone);
    setPhoneError(parsed.success ? null : "forms.phoneInvalid");
  };
```

Replace `handleSubmit`:

```tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.fullName.trim()) return;
    const normalizedPhone = state.phone.trim() ? normalizePhone(state.phone) : "";
    if (state.phone.trim() && normalizedPhone === null) {
      setPhoneError("forms.phoneInvalid");
      return;
    }
    onSave({
      fullName: state.fullName.trim(),
      phone: normalizedPhone ?? "",
      status: state.status,
      residentId: state.residentId || null,
      notes: state.notes,
    });
  };
```

- [ ] **Step 3: Render the phone field**

Insert between the `fullName` block and the `status` block:

```tsx
        <div className="space-y-2">
          <Label htmlFor="visit-person-edit-phone">{t("visitPersons.form.phone")}</Label>
          <Input
            id="visit-person-edit-phone"
            value={state.phone}
            onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
            onBlur={handlePhoneBlur}
            placeholder="(555) 123-4567"
            aria-invalid={!!phoneError}
          />
          {phoneError ? (
            <p className="text-sm text-destructive">{t(phoneError)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("forms.phoneHelp")}</p>
          )}
        </div>
```

- [ ] **Step 4: Run the features test suite**

```bash
pnpm --filter @ramcar/features test
```

Expected: PASS — the new phone rendering does not break the existing `VisitPersonForm` / edit tests.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/visitors/components/visit-person-edit-form.tsx
git commit -m "feat(features/visitors): add phone field to edit form with validation + normalization"
```

---

## Task 25: Cross-repo verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run typecheck across the monorepo**

```bash
pnpm typecheck
```

Expected: PASS across `apps/api`, `apps/web`, `apps/desktop`, `apps/www`, all packages.

- [ ] **Step 2: Run lint across the monorepo**

```bash
pnpm lint
```

Expected: PASS. If `@typescript-eslint/no-unused-vars` complains about an unused import, delete it and re-run.

- [ ] **Step 3: Run the full test suite**

```bash
pnpm test
```

Expected: PASS across all workspaces — new validator suites, form validation tests, and all pre-existing tests green.

- [ ] **Step 4: Commit if anything changed**

```bash
git status
```

If the verification steps produced no changes, skip the commit. Otherwise:

```bash
git add -A
git commit -m "chore: address lint/typecheck fallout from format-validation rollout"
```

- [ ] **Step 5: Announce completion**

Report back: "Form field format validation complete. All tests pass across the monorepo. Phone values are normalized to E.164 on submit; email lowercased + trimmed; username soft-filtered and validated. The `username = phone` bug at `user-form.tsx:176` is fixed and regression-guarded."

---

## Notes for the implementer

- **The plan uses TDD throughout.** Do not skip the "write failing test" steps — they exist so that the implementation step has a falsifiable target.
- **Keep per-step commits.** Each task ends with a commit because small commits make review and bisect easy. Never squash tasks together.
- **If a pre-existing assertion somewhere in the monorepo depends on the old non-normalized phone format**, update the assertion to the new E.164 expectation; do not loosen the new validator to accommodate it.
- **E.164 normalization changes DB content.** No migration is needed — the spec says "hard switch, validate on write only." Legacy unnormalized rows remain; next save normalizes them. If any existing unit test seeds a fake profile with a free-form phone and asserts the exact value round-trips, update the fixture to an E.164 value.
- **Desktop outbox already serializes the mutation payload as JSON.** Writing `+525551234567` instead of `(555) 123-4567` does not change the outbox shape.
