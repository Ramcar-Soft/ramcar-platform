# Visit-Person Default `flagged` + Guard Read-Only Status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default new visit-person records to `status = "flagged"`, render the status select disabled for guards, silently coerce guard creates to `"flagged"` server-side, and reject guard PATCH attempts that include `status` with `403 Forbidden`.

**Architecture:** Three layers change — (1) Zod default flips in `@ramcar/shared`, (2) shared feature components (`VisitPersonStatusSelect`, `VisitPersonForm`, `VisitPersonEditForm`) accept role-based `disabled`, (3) `VisitPersonsService` enforces guard rules using the existing `@CurrentUserRole()` decorator. The `RolePort` adapter and `@CurrentUserRole()` decorator already exist on this branch — no adapter shape changes needed.

**Tech Stack:** TypeScript 5.x, React 18, NestJS v11, Zod, Vitest (frontend + shared), Jest (api), Playwright (web e2e), `@ramcar/ui` Radix-backed `Select`, shared `@ramcar/features` package, `@ramcar/i18n`.

**Important constants discovered during planning:**
- The frontend `RolePort.role` uses **PascalCase** values: `"SuperAdmin" | "Admin" | "Guard" | "Resident"` (from `packages/features/src/adapters/role.tsx`). Use `role === "Guard"` in client code.
- The backend `Role` type in `@ramcar/shared` is **lowercase**: `"super_admin" | "admin" | "guard" | "resident"`. Use `role === "guard"` in API code.
- `@CurrentUserRole()` decorator already exists at `apps/api/src/common/decorators/current-user-role.decorator.ts` and returns the lowercase `Role | undefined`.
- The API service file is `apps/api/src/modules/visit-persons/visit-persons.service.ts`.
- Existing API service spec lives in `apps/api/src/modules/visit-persons/__tests__/visit-persons.tenant-scope.spec.ts` — new tests will go in a new sibling file `visit-persons.role-rules.spec.ts` to keep concerns separated.

---

## File Structure

**Modify:**
- `packages/shared/src/validators/visit-person.ts` — flip default
- `packages/shared/src/validators/visit-person.test.ts` — add default-coverage test
- `packages/features/src/shared/visit-person-status-select/index.tsx` — add `disabled` prop
- `packages/features/src/visitors/components/visit-person-form.tsx` — initial `"flagged"` + `disabled` for guards
- `packages/features/src/visitors/components/visit-person-edit-form.tsx` — `disabled` for guards
- `packages/features/src/visitors/__tests__/visit-person-form.test.tsx` — add role-based render tests
- `apps/api/src/modules/visit-persons/visit-persons.service.ts` — accept `role`, guard rules in `create`/`update`
- `apps/api/src/modules/visit-persons/visit-persons.controller.ts` — wire `@CurrentUserRole()` into `create` & `update`
- `apps/api/src/modules/visit-persons/__tests__/visit-persons.tenant-scope.spec.ts` — pass a `role` in existing service calls
- `packages/i18n/src/messages/en.json` and `packages/i18n/src/messages/es.json` — add `visitPersons.messages.forbidden`
- `packages/features/src/visitors/components/visitors-view.tsx` — show forbidden toast on 403

**Create:**
- `packages/features/src/shared/visit-person-status-select/__tests__/visit-person-status-select.test.tsx` — new component test file
- `packages/features/src/visitors/__tests__/visit-person-edit-form.test.tsx` — new edit-form test file (none exists today)
- `apps/api/src/modules/visit-persons/__tests__/visit-persons.role-rules.spec.ts` — new role-rule service tests
- `apps/web/e2e/visit-person-guard-status.spec.ts` — new Playwright spec

---

## Task 1 — Flip Zod default to `"flagged"`

**Files:**
- Modify: `packages/shared/src/validators/visit-person.ts`
- Modify: `packages/shared/src/validators/visit-person.test.ts`

- [ ] **Step 1: Add a failing test for the new default**

Add this `describe` block to `packages/shared/src/validators/visit-person.test.ts` (append after the existing `createVisitPersonSchema` block, before `describe("updateVisitPersonSchema", ...)`):

```ts
describe("createVisitPersonSchema status default", () => {
  it("defaults status to 'flagged' when omitted", () => {
    const result = createVisitPersonSchema.safeParse({
      type: "visitor",
      fullName: "Anonymous Visitor",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("flagged");
  });

  it("still accepts an explicit status: 'allowed'", () => {
    const result = createVisitPersonSchema.safeParse({
      type: "visitor",
      fullName: "Anonymous Visitor",
      status: "allowed",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("allowed");
  });
});
```

- [ ] **Step 2: Run the new tests; confirm the default test fails**

Run:
```bash
pnpm --filter @ramcar/shared test -- visit-person.test
```
Expected: the "defaults status to 'flagged'" test FAILS with `expected 'allowed' to be 'flagged'`. The "accepts an explicit status" test PASSES.

- [ ] **Step 3: Flip the default in the Zod schema**

In `packages/shared/src/validators/visit-person.ts`, change line 12 from:

```ts
  status: visitPersonStatusEnum.default("allowed"),
```

to:

```ts
  status: visitPersonStatusEnum.default("flagged"),
```

- [ ] **Step 4: Re-run the schema tests; confirm all pass**

Run:
```bash
pnpm --filter @ramcar/shared test -- visit-person.test
```
Expected: all `visit-person.test` tests PASS, including both new ones.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/validators/visit-person.ts packages/shared/src/validators/visit-person.test.ts
git commit -m "feat(shared): default visit-person status to flagged"
```

---

## Task 2 — Add `disabled` prop to `VisitPersonStatusSelect`

**Files:**
- Modify: `packages/features/src/shared/visit-person-status-select/index.tsx`
- Create: `packages/features/src/shared/visit-person-status-select/__tests__/visit-person-status-select.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `packages/features/src/shared/visit-person-status-select/__tests__/visit-person-status-select.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithHarness } from "../../../test/harness";
import { VisitPersonStatusSelect } from "../index";

describe("VisitPersonStatusSelect", () => {
  it("renders enabled by default and opens the menu on click", () => {
    renderWithHarness(
      <VisitPersonStatusSelect value="flagged" onValueChange={vi.fn()} />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).not.toBeDisabled();
    fireEvent.click(trigger);
    // Radix renders SelectItem options as role=option once opened.
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("renders disabled when disabled=true and does not open on click", () => {
    renderWithHarness(
      <VisitPersonStatusSelect
        value="flagged"
        onValueChange={vi.fn()}
        disabled
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("still shows the current label when disabled", () => {
    renderWithHarness(
      <VisitPersonStatusSelect
        value="flagged"
        onValueChange={vi.fn()}
        disabled
      />,
    );
    expect(
      screen.getByText("visitPersons.status.flagged"),
    ).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the new test; confirm the disabled tests fail**

Run:
```bash
pnpm --filter @ramcar/features test -- visit-person-status-select.test
```
Expected: the two "disabled" tests FAIL because the component does not yet accept a `disabled` prop.

- [ ] **Step 3: Add the `disabled` prop to the component**

Replace the contents of `packages/features/src/shared/visit-person-status-select/index.tsx`:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import type { VisitPersonStatus } from "@ramcar/shared";
import { useI18n } from "../../adapters";

const STATUSES: VisitPersonStatus[] = ["allowed", "flagged", "denied"];

const dotClass: Record<VisitPersonStatus, string> = {
  allowed: "bg-primary",
  flagged: "bg-warning",
  denied: "bg-destructive",
};

function StatusDot({ status }: { status: VisitPersonStatus }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 rounded-full ${dotClass[status]}`}
    />
  );
}

interface VisitPersonStatusSelectProps {
  value: VisitPersonStatus;
  onValueChange: (value: VisitPersonStatus) => void;
  id?: string;
  disabled?: boolean;
}

export function VisitPersonStatusSelect({
  value,
  onValueChange,
  id,
  disabled,
}: VisitPersonStatusSelectProps) {
  const { t } = useI18n();

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as VisitPersonStatus)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <span className="flex items-center gap-2">
          <StatusDot status={value} />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="flex items-center gap-2">
              <StatusDot status={s} />
              {t(`visitPersons.status.${s}`)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: Re-run the test; confirm all pass**

Run:
```bash
pnpm --filter @ramcar/features test -- visit-person-status-select.test
```
Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/shared/visit-person-status-select/
git commit -m "feat(features): add disabled prop to VisitPersonStatusSelect"
```

---

## Task 3 — Wire `disabled` + `"flagged"` initial into `VisitPersonForm`

**Files:**
- Modify: `packages/features/src/visitors/components/visit-person-form.tsx`
- Modify: `packages/features/src/visitors/__tests__/visit-person-form.test.tsx`

- [ ] **Step 1: Add failing tests for role-based rendering**

Append the following two tests to `packages/features/src/visitors/__tests__/visit-person-form.test.tsx` inside the `describe("VisitPersonForm", ...)` block (before its closing `});`):

```tsx
  it("renders the status select disabled when role is Guard", () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />, {
      role: { role: "Guard" },
    });
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
  });

  it("renders the status select enabled when role is Admin", () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />, {
      role: { role: "Admin" },
    });
    const trigger = screen.getByRole("combobox");
    expect(trigger).not.toBeDisabled();
  });

  it("uses 'flagged' as the initial status when no initialDraft is provided", () => {
    const onSave = vi.fn();
    renderWithHarness(
      <VisitPersonForm {...defaultProps} onSave={onSave} />,
      { role: { role: "Admin" } },
    );

    const inputs = screen.getAllByPlaceholderText("visitPersons.form.fullName");
    fireEvent.change(inputs[0], { target: { value: "Test Name" } });

    const saveButton = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("type") === "submit");
    fireEvent.click(saveButton!);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].status).toBe("flagged");
  });
```

- [ ] **Step 2: Run the form tests; confirm three new tests fail**

Run:
```bash
pnpm --filter @ramcar/features test -- visit-person-form.test
```
Expected: the three new tests FAIL — guard's combobox is enabled, admin's is enabled (passes by accident), default `status` is `"allowed"` not `"flagged"`.

- [ ] **Step 3: Wire `useRole()` and update initial status + disabled prop in the form**

In `packages/features/src/visitors/components/visit-person-form.tsx`:

(a) Update the import on line 11 from:
```ts
import { useI18n } from "../../adapters/i18n";
```
to:
```ts
import { useI18n, useRole } from "../../adapters";
```

(b) Inside the `VisitPersonForm` function body, immediately after `const { t } = useI18n();` (line 51), add:
```ts
  const { role } = useRole();
```

(c) Change the `useState` initial for `status` (line 56-58) from:
```ts
  const [status, setStatus] = useState<VisitPersonStatus>(
    initialDraft?.status ?? "allowed",
  );
```
to:
```ts
  const [status, setStatus] = useState<VisitPersonStatus>(
    initialDraft?.status ?? "flagged",
  );
```

(d) Change the `VisitPersonStatusSelect` usage (line 169) from:
```tsx
        <VisitPersonStatusSelect value={status} onValueChange={setStatus} />
```
to:
```tsx
        <VisitPersonStatusSelect
          value={status}
          onValueChange={setStatus}
          disabled={role === "Guard"}
        />
```

- [ ] **Step 4: Re-run the form tests; confirm all pass**

Run:
```bash
pnpm --filter @ramcar/features test -- visit-person-form.test
```
Expected: all tests PASS, including the three new ones.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/visitors/components/visit-person-form.tsx packages/features/src/visitors/__tests__/visit-person-form.test.tsx
git commit -m "feat(features): visit-person form defaults to flagged and disables status for guards"
```

---

## Task 4 — Wire `disabled` into `VisitPersonEditForm`

**Files:**
- Modify: `packages/features/src/visitors/components/visit-person-edit-form.tsx`
- Create: `packages/features/src/visitors/__tests__/visit-person-edit-form.test.tsx`

- [ ] **Step 1: Write a failing test for the edit-form's disabled status select**

Create `packages/features/src/visitors/__tests__/visit-person-edit-form.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithHarness } from "../../test/harness";
import { VisitPersonEditForm } from "../components/visit-person-edit-form";
import type { VisitPerson } from "../types";

const fixture: VisitPerson = {
  id: "vp-1",
  tenantId: "t-1",
  code: "VP-001",
  type: "visitor",
  status: "allowed",
  fullName: "Existing Visitor",
  phone: null,
  company: null,
  residentId: null,
  notes: null,
  registeredBy: "u-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const defaultProps = {
  person: fixture,
  onSave: vi.fn(),
  onCancel: vi.fn(),
  isSaving: false,
};

describe("VisitPersonEditForm", () => {
  it("renders the status select disabled when role is Guard, but still shows the current value", () => {
    renderWithHarness(<VisitPersonEditForm {...defaultProps} />, {
      role: { role: "Guard" },
    });
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
    // Existing record's status label is still visible
    expect(screen.getByText("visitPersons.status.allowed")).toBeDefined();
  });

  it("renders the status select enabled when role is Admin", () => {
    renderWithHarness(<VisitPersonEditForm {...defaultProps} />, {
      role: { role: "Admin" },
    });
    const trigger = screen.getByRole("combobox");
    expect(trigger).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the new test file; confirm the disabled test fails**

Run:
```bash
pnpm --filter @ramcar/features test -- visit-person-edit-form.test
```
Expected: the "disabled when role is Guard" test FAILS.

- [ ] **Step 3: Wire `useRole()` and pass `disabled` in the edit form**

In `packages/features/src/visitors/components/visit-person-edit-form.tsx`:

(a) Update the `useI18n` import on line 16 from:
```ts
import { useI18n } from "../../adapters/i18n";
```
to:
```ts
import { useI18n, useRole } from "../../adapters";
```

(b) Inside the `VisitPersonEditForm` function body, immediately after `const { t } = useI18n();` (line 67), add:
```ts
  const { role } = useRole();
```

(c) Change the `VisitPersonStatusSelect` usage (lines 155-158) from:
```tsx
          <VisitPersonStatusSelect
            value={state.status}
            onValueChange={(v) => setState((s) => ({ ...s, status: v }))}
          />
```
to:
```tsx
          <VisitPersonStatusSelect
            value={state.status}
            onValueChange={(v) => setState((s) => ({ ...s, status: v }))}
            disabled={role === "Guard"}
          />
```

- [ ] **Step 4: Re-run; confirm all pass**

Run:
```bash
pnpm --filter @ramcar/features test -- visit-person-edit-form.test
```
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/visitors/components/visit-person-edit-form.tsx packages/features/src/visitors/__tests__/visit-person-edit-form.test.tsx
git commit -m "feat(features): disable visit-person edit-form status for guards"
```

---

## Task 5 — Add i18n key `visitPersons.messages.forbidden`

**Files:**
- Modify: `packages/i18n/src/messages/en.json`
- Modify: `packages/i18n/src/messages/es.json`

- [ ] **Step 1: Add the English key**

In `packages/i18n/src/messages/en.json`, locate the `visitPersons.messages` block. The current shape is:

```json
    "messages": {
      "created": "Visitor registered successfully",
      "updated": "Visit person updated successfully",
      "eventCreated": "Access event logged successfully",
      "errorCreating": "Error registering visitor",
      "errorUpdating": "Error updating record",
      "imageUploadFailed": "{count} image(s) failed to upload. You can retry from the edit view."
    }
```

Replace with:

```json
    "messages": {
      "created": "Visitor registered successfully",
      "updated": "Visit person updated successfully",
      "eventCreated": "Access event logged successfully",
      "errorCreating": "Error registering visitor",
      "errorUpdating": "Error updating record",
      "forbidden": "You don't have permission to change visitor status",
      "imageUploadFailed": "{count} image(s) failed to upload. You can retry from the edit view."
    }
```

- [ ] **Step 2: Add the Spanish key**

In `packages/i18n/src/messages/es.json`, locate the matching `visitPersons.messages` block (it mirrors the English one). Add a `"forbidden"` line in the same position with value:

```json
      "forbidden": "No tienes permiso para cambiar el estatus del visitante",
```

- [ ] **Step 3: Validate JSON parses**

Run:
```bash
pnpm --filter @ramcar/i18n typecheck
```
Expected: no errors. (If the package has no `typecheck` target, run `node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/en.json'))"` and the same for `es.json` — both should exit cleanly.)

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/messages/en.json packages/i18n/src/messages/es.json
git commit -m "feat(i18n): add visitPersons.messages.forbidden"
```

---

## Task 6 — API: thread `role` through `VisitPersonsService.create` and `update`

**Files:**
- Modify: `apps/api/src/modules/visit-persons/visit-persons.service.ts`
- Modify: `apps/api/src/modules/visit-persons/__tests__/visit-persons.tenant-scope.spec.ts`
- Create: `apps/api/src/modules/visit-persons/__tests__/visit-persons.role-rules.spec.ts`

- [ ] **Step 1: Write failing role-rule tests**

Create `apps/api/src/modules/visit-persons/__tests__/visit-persons.role-rules.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { VisitPersonsService } from "../visit-persons.service";
import { VisitPersonsRepository } from "../visit-persons.repository";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { TenantScope } from "../../../common/utils/tenant-scope";

const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";
const TENANT_B = "3d8b2fbc-0000-0000-0000-000000000002";

const scopeA: TenantScope = {
  role: "admin",
  scope: "list",
  tenantId: TENANT_A,
  tenantIds: [TENANT_A, TENANT_B],
};

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "vp-1",
    tenant_id: TENANT_A,
    code: "VP-001",
    type: "visitor",
    status: "flagged",
    full_name: "Test",
    phone: null,
    company: null,
    resident_id: null,
    notes: null,
    registered_by: "u-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
};

const mockSupabase = {
  getClient: () => ({
    from: () => ({
      select: () => ({
        in: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
};

describe("VisitPersonsService — role rules", () => {
  let service: VisitPersonsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitPersonsService,
        { provide: VisitPersonsRepository, useValue: mockRepository },
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();
    service = module.get(VisitPersonsService);
  });

  describe("create", () => {
    it("guard sending status='allowed' is silently coerced to 'flagged'", async () => {
      mockRepository.create.mockResolvedValue(makeRow({ status: "flagged" }));

      await service.create(
        { type: "visitor", fullName: "Jane", status: "allowed" },
        scopeA,
        "guard-profile-1",
        "guard",
      );

      const dtoArg = mockRepository.create.mock.calls[0][0];
      expect(dtoArg.status).toBe("flagged");
    });

    it("admin sending status='allowed' is preserved", async () => {
      mockRepository.create.mockResolvedValue(makeRow({ status: "allowed" }));

      await service.create(
        { type: "visitor", fullName: "Jane", status: "allowed" },
        scopeA,
        "admin-profile-1",
        "admin",
      );

      const dtoArg = mockRepository.create.mock.calls[0][0];
      expect(dtoArg.status).toBe("allowed");
    });

    it("super_admin sending status='allowed' is preserved", async () => {
      mockRepository.create.mockResolvedValue(makeRow({ status: "allowed" }));

      await service.create(
        { type: "visitor", fullName: "Jane", status: "allowed" },
        scopeA,
        "sa-profile-1",
        "super_admin",
      );

      const dtoArg = mockRepository.create.mock.calls[0][0];
      expect(dtoArg.status).toBe("allowed");
    });
  });

  describe("update", () => {
    it("guard sending status throws ForbiddenException and does NOT call repository.update", async () => {
      await expect(
        service.update(
          "vp-1",
          { status: "allowed" },
          scopeA,
          "guard",
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("guard sending only phone (no status) succeeds", async () => {
      mockRepository.update.mockResolvedValue(makeRow());

      await service.update(
        "vp-1",
        { phone: "+525551234567" },
        scopeA,
        "guard",
      );

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it("admin sending status succeeds", async () => {
      mockRepository.update.mockResolvedValue(makeRow({ status: "allowed" }));

      await service.update(
        "vp-1",
        { status: "allowed" },
        scopeA,
        "admin",
      );

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run the new spec; confirm all role-rule tests fail**

Run:
```bash
pnpm --filter @ramcar/api test -- visit-persons.role-rules
```
Expected: every test FAILS — the service signature does not yet accept a `role` argument, so calls with 4 args either drop the role or TypeScript errors out. (If TS strict-mode rejects the test, the failure is the desired signal — proceed to Step 3 to add the parameter.)

- [ ] **Step 3: Add the `role` parameter and the rules in `VisitPersonsService`**

In `apps/api/src/modules/visit-persons/visit-persons.service.ts`:

(a) Update the imports on line 1 from:
```ts
import { Injectable, NotFoundException } from "@nestjs/common";
```
to:
```ts
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
```

(b) Add the `Role` type import alongside the existing `VisitPerson` import (line 2):
```ts
import type { Role, VisitPerson } from "@ramcar/shared";
```

(c) Replace the `create` method (lines 21-29) with:
```ts
  async create(
    dto: CreateVisitPersonDto,
    scope: TenantScope,
    registeredBy: string,
    role: Role,
  ): Promise<VisitPerson> {
    const tenantId = scopeToTenantId(scope);
    const safeDto: CreateVisitPersonDto =
      role === "guard" ? { ...dto, status: "flagged" } : dto;
    const row = await this.repository.create(safeDto, tenantId, registeredBy);
    return this.enrichWithResidentName(this.mapRow(row));
  }
```

(d) Replace the `update` method (lines 71-79) with:
```ts
  async update(
    id: string,
    dto: UpdateVisitPersonDto,
    scope: TenantScope,
    role: Role,
  ): Promise<VisitPerson> {
    if (role === "guard" && dto.status !== undefined) {
      throw new ForbiddenException("Guards cannot change visit-person status");
    }
    const row = await this.repository.update(id, dto, scope);
    if (!row) throw new NotFoundException("Visit person not found");
    return this.enrichWithResidentName(this.mapRow(row));
  }
```

- [ ] **Step 4: Update the existing tenant-scope spec to pass a role argument**

In `apps/api/src/modules/visit-persons/__tests__/visit-persons.tenant-scope.spec.ts`:

(a) Replace both `await service.create(createDto, scopeA, "guard-profile-1");` and `await service.create(createDto, scopeB, "guard-profile-2");` (lines 159 and 171) so they pass `"admin"` as the fourth argument:
```ts
      await service.create(createDto, scopeA, "guard-profile-1", "admin");
```
```ts
      await service.create(createDto, scopeB, "guard-profile-2", "admin");
```
(Using `"admin"` keeps the assertion that `createDto` flows through unchanged — a guard would have triggered the silent coerce and broken the existing assertion.)

(b) Replace both `service.update` calls in the PATCH block (lines 186 and 195) so they pass `"admin"` as the fourth argument:
```ts
      await service.update("vp-1", patch, scopeA, "admin");
```
```ts
        service.update("vp-1", { status: "flagged" as const }, scopeA, "admin"),
```

- [ ] **Step 5: Run both API spec files; confirm all pass**

Run:
```bash
pnpm --filter @ramcar/api test -- visit-persons
```
Expected: all `visit-persons.tenant-scope.spec.ts` and `visit-persons.role-rules.spec.ts` tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/visit-persons/visit-persons.service.ts apps/api/src/modules/visit-persons/__tests__/visit-persons.tenant-scope.spec.ts apps/api/src/modules/visit-persons/__tests__/visit-persons.role-rules.spec.ts
git commit -m "feat(api): enforce guard rules in visit-persons service"
```

---

## Task 7 — Wire `@CurrentUserRole()` into the controller

**Files:**
- Modify: `apps/api/src/modules/visit-persons/visit-persons.controller.ts`

- [ ] **Step 1: Inject the role into both handlers**

In `apps/api/src/modules/visit-persons/visit-persons.controller.ts`:

(a) Add the imports. Update line 15:
```ts
import { CurrentUser } from "../../common/decorators/current-user.decorator";
```
followed by an additional import line:
```ts
import { CurrentUserRole } from "../../common/decorators/current-user-role.decorator";
```
Also add the `Role` type to the existing `@ramcar/shared` types — append below the existing TenantScope import a new line:
```ts
import type { Role } from "@ramcar/shared";
```

(b) Replace the `create` handler (lines 50-59) with:
```ts
  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: { id: string },
    @CurrentTenant() scope: TenantScope,
    @CurrentUserRole() role: Role,
  ) {
    const dto = createVisitPersonSchema.parse(body);
    const profileId = await this.usersService.getProfileIdByAuthUserId(user.id);
    return this.visitPersonsService.create(dto, scope, profileId, role);
  }
```

(c) Replace the `update` handler (lines 61-69) with:
```ts
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentTenant() scope: TenantScope,
    @CurrentUserRole() role: Role,
  ) {
    const dto = updateVisitPersonSchema.parse(body);
    return this.visitPersonsService.update(id, dto, scope, role);
  }
```

- [ ] **Step 2: Type-check the API package**

Run:
```bash
pnpm --filter @ramcar/api typecheck
```
Expected: no type errors.

- [ ] **Step 3: Re-run the API test suite**

Run:
```bash
pnpm --filter @ramcar/api test -- visit-persons
```
Expected: all visit-persons tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/visit-persons/visit-persons.controller.ts
git commit -m "feat(api): inject role into visit-persons controller"
```

---

## Task 8 — Show forbidden toast on 403 in `visitors-view.tsx`

**Files:**
- Modify: `packages/features/src/visitors/components/visitors-view.tsx`

- [ ] **Step 1: Update `onError` for the update mutation to handle 403**

In `packages/features/src/visitors/components/visitors-view.tsx`, replace the existing `onError` (lines 210-212) inside `handleSaveEdit`:

```tsx
          onError: () => {
            toast.error(t("visitPersons.messages.errorUpdating"));
          },
```

with:

```tsx
          onError: (err: unknown) => {
            const status = (err as { status?: number })?.status;
            if (status === 403) {
              toast.error(t("visitPersons.messages.forbidden"));
            } else {
              toast.error(t("visitPersons.messages.errorUpdating"));
            }
          },
```

- [ ] **Step 2: Run the visitors-view-related tests; confirm all pass**

Run:
```bash
pnpm --filter @ramcar/features test -- visitors-view
```
Expected: all visitors-view tests PASS (no behavior change for the success path or the existing generic-error path).

- [ ] **Step 3: Commit**

```bash
git add packages/features/src/visitors/components/visitors-view.tsx
git commit -m "feat(features): show forbidden toast when guard PATCHes status"
```

---

## Task 9 — Playwright E2E: guard sees disabled status; admin can choose

**Files:**
- Create: `apps/web/e2e/visit-person-guard-status.spec.ts`

This spec mirrors the structure of `apps/web/e2e/residents-vehicle-permissions.spec.ts` and assumes the same seeded-environment pre-conditions (guard-a@example.com, admin-a@example.com, password "password", local API on :3001, web on :3000).

- [ ] **Step 1: Write the new E2E spec**

Create `apps/web/e2e/visit-person-guard-status.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

/**
 * Visit-person guard status E2E — requires a seeded local environment:
 *  - Guard user:  guard-a@example.com / password
 *  - Admin user:  admin-a@example.com / password
 *  - Tenant A with at least one resident
 *  - Local API running on :3001, web on :3000
 *
 * Run: pnpm --filter @ramcar/web test:e2e -- visit-person-guard-status.spec.ts
 */

async function signIn(page: Page, email: string) {
  await page.goto("/en/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/en\//);
}

async function openRegisterVisitorSidebar(page: Page) {
  await page.goto("/en/visitors");
  await page.getByRole("button", { name: /register new/i }).click();
}

test.describe("Visit-person status — guard read-only", () => {
  test("guard sees status select disabled and submitted record persists as flagged", async ({ page }) => {
    await signIn(page, "guard-a@example.com");
    await openRegisterVisitorSidebar(page);

    // The status combobox is rendered but disabled
    const statusCombobox = page.getByRole("combobox").first();
    await expect(statusCombobox).toBeDisabled();

    // Fill name, submit
    const fullName = `E2E Guard ${Date.now()}`;
    await page.getByPlaceholder(/full name/i).fill(fullName);
    await page.getByRole("button", { name: /^save$/i }).click();

    // Success toast
    await expect(page.getByText(/visitor registered successfully/i)).toBeVisible();

    // Find the new row in the table and verify the status column shows "Flagged"
    const row = page.getByRole("row", { name: new RegExp(fullName) });
    await expect(row).toContainText(/flagged/i);
  });

  test("admin can register a visitor and choose status='allowed'", async ({ page }) => {
    await signIn(page, "admin-a@example.com");
    await openRegisterVisitorSidebar(page);

    const statusCombobox = page.getByRole("combobox").first();
    await expect(statusCombobox).not.toBeDisabled();

    // Open dropdown and pick "Allowed"
    await statusCombobox.click();
    await page.getByRole("option", { name: /allowed/i }).click();

    const fullName = `E2E Admin ${Date.now()}`;
    await page.getByPlaceholder(/full name/i).fill(fullName);
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText(/visitor registered successfully/i)).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(fullName) });
    await expect(row).toContainText(/allowed/i);
  });
});
```

- [ ] **Step 2: Run the new spec against a seeded environment**

Run (only if a local seeded environment is available — the test is otherwise skipped in CI by virtue of the seed pre-condition):
```bash
pnpm --filter @ramcar/web test:e2e -- visit-person-guard-status.spec.ts
```
Expected: both tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/visit-person-guard-status.spec.ts
git commit -m "test(web): e2e for guard read-only visit-person status"
```

---

## Task 10 — Final verification across the monorepo

- [ ] **Step 1: Lint all workspaces**

Run:
```bash
pnpm lint
```
Expected: no errors.

- [ ] **Step 2: Typecheck all workspaces**

Run:
```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 3: Run unit tests across the monorepo**

Run:
```bash
pnpm test
```
Expected: all tests PASS — no regressions in unrelated packages.

- [ ] **Step 4: Manual smoke (defer to user — do not commit on this step)**

Manual checks the user should run before merging:
- Web portal as **admin** → register a visitor without changing status → record persists as `flagged` (new default).
- Web portal as **admin** → register a visitor and pick `allowed` → record persists as `allowed`.
- Web portal as **admin** → edit an existing visitor's status to `denied` → persists.
- Web portal as **guard** → register a visitor → status field disabled and value reads `Flagged` → record persists as `flagged`.
- Web portal as **guard** → edit an existing visitor's phone (no status change) → succeeds.
- Web portal as **guard** → attempt PATCH `{ status: "allowed" }` via devtools → expects `403` and forbidden toast.
- Desktop booth as **guard** → same flows as web → status field disabled, record persists as `flagged`.

This step has no commit.

---

## Self-Review Notes

- **Spec coverage:** Goal 1 → Tasks 1, 3 (initial state). Goal 2 → Tasks 2, 3, 4 (disabled prop wired in both forms). Goal 3 → Tasks 6, 7 (silent coerce + 403). Goal 4 → covered by passing `"admin"` / `"super_admin"` to the service (Task 6 tests).
- **Non-goals respected:** No `access_events` schema or repository changes; no data migration; no label changes; no filter or badge changes.
- **PascalCase vs lowercase Role:** consistently uses `"Guard"` in the renderer (RolePort) and `"guard"` in the API (`@ramcar/shared` Role). The plan calls this out at the top so the engineer doesn't conflate the two.
- **Test-touched files outside the spec:** `visit-persons.tenant-scope.spec.ts` is updated only because the service signature changed; the assertions remain semantically identical (same tenant/profile-id/dto checks), the role argument is just appended.
- **No placeholders:** every step lists concrete file paths, exact code, and exact commands; no "fill in details" or "similar to Task N" references.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-28-visit-person-default-flagged.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
