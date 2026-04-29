---

description: "Task list for Single-Tenant UI Scope for Admins and Guards (v1)"
---

# Tasks: Single-Tenant UI Scope for Admins and Guards (v1)

**Input**: Design documents from `/specs/024-non-superadmin-tenant-scope/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are explicitly required by the plan (Testing section enumerates Vitest unit/component, Vitest+JSDOM desktop, Playwright E2E, and Jest API regression). Test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a Turborepo monorepo. The feature touches:

- Shared module: `packages/features/src/tenant-selector/` (new `policy/` namespace + new `contact-support-dialog.tsx`)
- Shared i18n: `packages/i18n/src/messages/{en,es}.json`
- Web app: `apps/web/src/features/{tenants,users}/`
- Web E2E: `apps/web/e2e/`
- Desktop test: `apps/desktop/src/` (Vitest+JSDOM only; no source change)
- API (regression only): `apps/api/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch verification and seed data for E2E test fixtures (research.md R10).

- [X] T001 Verify branch `024-non-superadmin-tenant-scope` is checked out and run `pnpm install` from repo root to ensure dependencies are current
- [X] T002 [P] Add seed users `admin_with_zero_tenants@test.com` (admin role, `tenant_ids = []`) and `admin_with_one_tenant@test.com` (admin role, `tenant_ids = [t1]`) to `supabase/seed.sql` per research.md R10; run `pnpm db:reset` to apply

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the policy folder scaffolding and barrel exports that all three user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create directory `packages/features/src/tenant-selector/policy/` (file system only — no files yet)
- [X] T004 Create empty barrel `packages/features/src/tenant-selector/policy/index.ts` with placeholder exports comment (will be filled story-by-story)
- [X] T005 Create empty test shell `packages/features/src/tenant-selector/policy/policy.test.ts` with `import { describe } from "vitest"` and a top-level comment marking sections per policy function (each story appends its describe block)
- [X] T006 Update `packages/features/src/tenant-selector/index.ts` to add `export * from "./policy";` after the existing exports

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Selector visibility (Priority: P1) 🎯 MVP

**Goal**: The shared `<TenantSelector />` renders as a static, non-interactive display for Admin/Guard/Resident roles regardless of `tenant_ids` length, while preserving the SuperAdmin popover. Admin/Guard with multi-tenant legacy data converge to a deterministic single "current tenant" via the existing `useEffect` reconciliation step. Behavior is identical on web and desktop because both apps consume the same shared module.

**Independent Test**: Sign in as `admin_with_one_tenant@test.com` on web → confirm no `[role="combobox"]` in the top bar and only Tenant A's data renders. Sign in as `superadmin@test.com` → confirm the combobox renders and lists all tenants. Sign in as `guard@test.com` on desktop → confirm the same hide-selector rule applies.

### Implementation for User Story 1

- [X] T007 [US1] Implement `canShowTenantSelector(role)` in `packages/features/src/tenant-selector/policy/can-show-tenant-selector.ts` — returns `role === "SuperAdmin"` (per data-model.md §2.1)
- [X] T008 [US1] Add `export { canShowTenantSelector } from "./can-show-tenant-selector";` to `packages/features/src/tenant-selector/policy/index.ts`
- [X] T009 [US1] Append `describe("canShowTenantSelector", …)` block to `packages/features/src/tenant-selector/policy/policy.test.ts` covering the 4 role values: SuperAdmin → true; Admin/Guard/Resident → false
- [X] T010 [US1] Update `packages/features/src/tenant-selector/components/tenant-selector.tsx` to widen the existing static-branch condition (`tenantIds.length <= 1`) to also include `!canShowTenantSelector(role)` — using the `useRole()` adapter already imported in the file. The static span keeps its current shape (no `<button>`, no `role="combobox"`, no Popover/Command tree). The SuperAdmin path is unchanged.
- [X] T011 [US1] Add deterministic "current tenant" reconciliation to the existing `useEffect` in `packages/features/src/tenant-selector/components/tenant-selector.tsx` (the one that syncs `activeTenantName` from the fetched tenant list, around lines 39-45) per data-model.md §3 / contracts/tenant-selector-visibility.md "Deterministic current tenant reconciliation": no-op for SuperAdmin or empty tenants list; otherwise pick `activeTenantId` if valid, else `profilesTenantId` if valid, else lexicographically-first tenant by name; call `setActiveTenant(id, name)` only when the candidate differs to avoid render loops
- [X] T012 [P] [US1] Update `packages/features/src/tenant-selector/__tests__/tenant-selector.test.tsx` to add cases: (a) SuperAdmin renders the Popover combobox; (b) Admin/Guard/Resident render the static span (no `[role="combobox"]`); (c) Admin with `tenant_ids = [t1, t2]` and `profilesTenantId = t2` reconciles `activeTenantId` to `t2`; (d) Admin with no valid `profilesTenantId` reconciles to alpha-first by tenant name
- [X] T013 [P] [US1] Add E2E test `apps/web/e2e/tenant-selector-visibility.spec.ts` with three sign-in fixtures (Admin one-tenant, SuperAdmin, Guard one-tenant) asserting `document.querySelector('header [role="combobox"]')` is `null` for non-SuperAdmin and exactly one for SuperAdmin (per contracts/tenant-selector-visibility.md "Browser-level invariants")
- [X] T014 [P] [US1] Add desktop selector-hide test in `apps/desktop/src/shared/lib/features/__tests__/tenant-selector-visibility.test.tsx` (Vitest+JSDOM) verifying the static span renders for Guard role even when `tenantIds.length > 1`

**Checkpoint**: User Story 1 fully functional and independently testable. Sign-in flows on web + desktop verify the selector visibility policy.

---

## Phase 4: User Story 2 — Tenants-create gating (Priority: P1)

**Goal**: The Tenants-catalog Create button (web only) opens the spec-020 Sheet for SuperAdmin always, for Admin only when their tenant count is 0, and otherwise opens an info-only `<ContactSupportDialog />` that explains the v1 one-tenant limit. Re-evaluated on every click against the live `useTenants` data — no cached state. Strings live in `@ramcar/i18n` so the contact channel can change without a code release.

**Independent Test**: Sign in as `admin_with_zero_tenants@test.com` → click Create Tenant → Sheet opens → fill + save → click Create Tenant again → Dialog opens (no manual reload). Sign in as `superadmin@test.com` → Sheet opens every click. Sign in as `admin_with_one_tenant@test.com` → first click opens Dialog directly.

### Implementation for User Story 2

- [X] T015 [P] [US2] Implement `canCreateAnotherTenant(role, existingTenantsCount)` in `packages/features/src/tenant-selector/policy/can-create-another-tenant.ts` per data-model.md §2.2: SuperAdmin → always true; Admin → `existingTenantsCount === 0`; Guard/Resident → false
- [X] T016 [US2] Add `export { canCreateAnotherTenant } from "./can-create-another-tenant";` to `packages/features/src/tenant-selector/policy/index.ts`
- [X] T017 [US2] Append `describe("canCreateAnotherTenant", …)` block to `packages/features/src/tenant-selector/policy/policy.test.ts` covering 4 roles × {0, 1, 2, 50}
- [X] T018 [P] [US2] Add 4 keys under `tenants.contactSupport.{title,body,supportInstruction,close}` to `packages/i18n/src/messages/en.json` per contracts/tenant-create-gating.md "i18n keys" final-copy English table
- [X] T019 [P] [US2] Add the same 4 keys under `tenants.contactSupport.{title,body,supportInstruction,close}` to `packages/i18n/src/messages/es.json` per contracts/tenant-create-gating.md final-copy Spanish table
- [X] T020 [P] [US2] Implement `<ContactSupportDialog />` in `packages/features/src/tenant-selector/components/contact-support-dialog.tsx` using `Dialog` from `@ramcar/ui` and `useI18n()` from the shared module per contracts/tenant-create-gating.md "B. ContactSupportDialog" — props `{ open, onClose }`, renders title/body/supportInstruction/close button only, supports Escape and click-outside dismissal, contains no input fields or bypass links
- [X] T021 [P] [US2] Add component test `packages/features/src/tenant-selector/components/__tests__/contact-support-dialog.test.tsx` covering: renders all 4 strings; close button calls `onClose`; Escape key dismisses; click-outside dismisses; no input fields exist (negative assertion)
- [X] T022 [US2] Update `packages/features/src/tenant-selector/index.ts` to add `export { ContactSupportDialog } from "./components/contact-support-dialog";`
- [X] T023 [US2] Update `apps/web/src/features/tenants/components/tenants-table.tsx`: add `const [contactDialogOpen, setContactDialogOpen] = useState(false);`; modify `handleCreate` to branch on `canCreateAnotherTenant(role, data?.data.length ?? 0)` (Sheet on true, `setContactDialogOpen(true)` on false); render `<ContactSupportDialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} />` next to the existing `<TenantSidebar />`. Imports come from `@ramcar/features/tenant-selector` (per spec 014 shared module rules) and `useAppStore` for the role
- [X] T024 [P] [US2] Add component test `apps/web/src/features/tenants/__tests__/tenants-table.gating.test.tsx` covering: Admin + zero tenants → click Create → Sheet visible; Admin + one tenant → click Create → ContactSupportDialog visible (Sheet absent); SuperAdmin + N tenants → click Create → Sheet (no Dialog); after `queryClient.setQueryData(["tenants"], updatedList)` simulating post-create invalidation → next click switches branch (FR-012)
- [X] T025 [P] [US2] Add E2E test `apps/web/e2e/tenant-create-gating.spec.ts` with the full spec-2.1 → 2.4 quickstart walk: brand-new Admin Sheet → fill → save → second click Dialog; SuperAdmin Sheet always; Admin-with-existing-tenant Dialog on first click

**Checkpoint**: User Stories 1 AND 2 should both work independently. MVP scope reached.

---

## Phase 5: User Story 3 — User-form tenant field (Priority: P2)

**Goal**: The Users-catalog form renders a single-select `<Select>` for the tenant field for every role. SuperAdmin can pick freely; Admin sees the field pre-filled to their `activeTenantId` and `disabled` (with a translated hint). The submit step maps the single value onto the existing API DTO shape (`tenant_ids: [oneId] + primary_tenant_id` for admin/guard; `tenant_id` for resident; nothing for super_admin). The chip-based `<TenantMultiSelect>` is removed.

**Independent Test**: As SuperAdmin in `/catalogs/users` → New User → role=guard → tenant field is a single `<Select>` listing every tenant; payload has `tenant_ids: [oneId]`. As Admin → tenant field is `disabled` and shows the Admin's tenant; submitting persists the new user with that one tenant in `profiles.tenant_id` and exactly one `user_tenants` row.

### Implementation for User Story 3

- [X] T026 [P] [US3] Implement `canEditUserTenantField(role)` in `packages/features/src/tenant-selector/policy/can-edit-user-tenant-field.ts` per data-model.md §2.3: returns `role === "SuperAdmin"`
- [X] T027 [US3] Add `export { canEditUserTenantField } from "./can-edit-user-tenant-field";` to `packages/features/src/tenant-selector/policy/index.ts`
- [X] T028 [US3] Append `describe("canEditUserTenantField", …)` block to `packages/features/src/tenant-selector/policy/policy.test.ts` covering 4 roles
- [X] T029 [P] [US3] Add `users.form.tenantLockedHint` key to `packages/i18n/src/messages/en.json` with value `"New users are added to your community. Contact support if you need to assign a different one."`
- [X] T030 [P] [US3] Add `users.form.tenantLockedHint` key to `packages/i18n/src/messages/es.json` with value `"Los nuevos usuarios se añaden a tu comunidad. Contacta a soporte si necesitas asignar otra."`
- [X] T031 [US3] Update `apps/web/src/features/users/components/user-form.tsx` per contracts/user-form-tenant-field.md: (a) remove `import { TenantMultiSelect } from "./tenant-multi-select";`; (b) drop `tenantIds: string[]` and `primaryTenantId: string` from `UserFormData`, keep only `tenantId: string`; (c) replace the multi-select branch (~lines 332-347) with the same single `<Select>` already used for residents — bound to `formData.tenantId`, populated from the `tenants` prop; (d) compute `tenantFieldLocked = !canEditUserTenantField(actorRole)` and apply `disabled` + initialize `formData.tenantId` to `currentUser.activeTenantId ?? currentUser.tenantId` when locked; (e) render hint paragraph `{t("users.form.tenantLockedHint")}` below the select when locked; (f) at submit, branch payload by role: admin/guard → `tenant_ids: [formData.tenantId], primary_tenant_id: formData.tenantId, delete tenantId`; resident → keep `tenantId`; super_admin → `delete tenantId`
- [X] T032 [US3] Update validation block in `apps/web/src/features/users/components/user-form.tsx` (~lines 171-210): drop `users.validation.atLeastOneTenant` and `users.validation.primaryMustBeSelected` references; the single missing-tenant check uses existing `users.validation.tenantRequired`
- [X] T033 [US3] Update edit-mode initializer in `apps/web/src/features/users/components/user-form.tsx` `useState` to compute `initialTenantId = initialData?.tenantId ?? initialData?.tenantIds?.[0] ?? ""` per contracts/user-form-tenant-field.md "Initial-data resolution"
- [X] T034 [US3] Delete `apps/web/src/features/users/components/tenant-multi-select.tsx`
- [X] T035 [US3] Delete `apps/web/src/features/users/__tests__/tenant-multi-select.test.tsx` if it exists (verify with `ls` first; skip if not present)
- [X] T036 [P] [US3] Update `apps/web/src/features/users/__tests__/user-form-validation.test.tsx` per contracts/user-form-tenant-field.md "Test plan": drop multi-tenant array assertions; add cases verifying admin/guard payload contains `tenant_ids: ["<id>"]` (length-1) and `primary_tenant_id`; resident payload unchanged; super_admin payload omits tenant; missing-tenant fails with `users.validation.tenantRequired`
- [X] T037 [P] [US3] Update `apps/web/src/features/users/__tests__/user-form-role-lock.test.tsx` to add Admin-creator case: `<Select>` is `disabled`, value equals `currentUser.activeTenantId`, hint paragraph visible
- [X] T038 [P] [US3] Add new test file `apps/web/src/features/users/__tests__/user-form-tenant-lock.test.tsx` covering: Admin creator → field disabled and pre-filled; SuperAdmin creator → field enabled and editable; submit ships the tenant in the payload regardless of locked state
- [X] T039 [P] [US3] Remove obsolete i18n keys from `packages/i18n/src/messages/en.json` and `es.json` only after grep confirms zero references in source: `users.form.tenantsMultiLabel`, `users.form.tenantsEmpty`, `users.form.tenantPrimaryLabel`, `users.form.tenantSetPrimary`, `users.form.tenantRemove`, `users.validation.atLeastOneTenant`, `users.validation.primaryMustBeSelected`, `users.validation.tooManyTenants`. Verify `users.form.tenantsSearchPlaceholder` is unused before removing (per research.md R8 caveat). If any key is still referenced, leave it and note in PR description
- [X] T040 [P] [US3] Add E2E test `apps/web/e2e/user-form-tenant-field.spec.ts`: Admin sign-in → New User → assert `<Select>` `[disabled]` attribute and pre-filled value → fill name/email/role=guard → submit → verify new user persists with `profiles.tenant_id` equal to Admin's tenant. SuperAdmin sign-in → New User → assert `<Select>` is enabled and lists all tenants

**Checkpoint**: All three user-facing stories now work independently. The product policy is fully expressed at the UI layer.

---

## Phase 6: User Story 4 — SuperAdmin retains full multi-tenant experience (Priority: P3)

**Goal**: Pure verification target. No new code; existing spec-020 and spec-021 SuperAdmin behaviors must continue to pass. This guards against regressions introduced by Stories 1–3.

**Independent Test**: Run the spec-020 and spec-021 SuperAdmin acceptance suites unchanged. Manually smoke the SuperAdmin flow per quickstart.md Section 4.

### Implementation for User Story 4

- [X] T041 [P] [US4] Add E2E regression test `apps/web/e2e/superadmin-spec024-regression.spec.ts` that signs in as `superadmin@test.com` and asserts: top-bar combobox renders and lists all tenants; switching tenant shows the spec-021 confirm dialog; `/catalogs/tenants` Create button opens the Sheet on every click (no Dialog ever); `/catalogs/users` form's tenant `<Select>` is enabled and populated with all tenants (per FR-020/FR-021/SC-005)
- [X] T042 [US4] Run `pnpm test:e2e --filter=@ramcar/web -- specs/020 specs/021` from repo root and confirm all SuperAdmin-scoped existing tests pass without modification (any failure is a regression introduced by Stories 1–3)

**Checkpoint**: SuperAdmin behavior verified intact. All four stories complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting verification of FR-022 (no API change), code health, and the manual quickstart walkthrough.

- [X] T043 [P] Run `pnpm test --filter=@ramcar/api` and confirm 100% pass; this is the FR-022 gate (any failure indicates an accidental API edit)
- [X] T044 [P] Run `git diff main -- apps/api packages/shared/src/validators` and confirm the diff is empty (no API or DTO changes from this branch — except for the documented exception in quickstart.md Section 5 about removing unused validation keys, if applicable)
- [X] T045 [P] Run `pnpm lint && pnpm typecheck` across the affected workspaces (`@ramcar/features`, `@ramcar/i18n`, `@ramcar/web`, `@ramcar/desktop`) and resolve any errors introduced by the deletions in T034
- [X] T046 [P] Run `pnpm check:shared-features` (per CLAUDE.md) to confirm shared module conventions still hold (no per-app duplication created)
- [X] T047 Walk through `specs/024-non-superadmin-tenant-scope/quickstart.md` Sections 1–5 manually and check off each ✅ assertion; file any failure under the relevant FR number

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Foundational
  - US1 and US2 are both P1 — implement together for the MVP
  - US3 (P2) can begin after Foundational; independent of US1/US2 in terms of files
  - US4 (P3) is verification — runs last to confirm no regressions
- **Polish (Phase 7)**: Depends on US1–US4 being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. Edits `tenant-selector.tsx` and the shared `policy/` folder.
- **US2 (P1)**: Depends only on Foundational. Edits `tenants-table.tsx`, adds `ContactSupportDialog`, adds `canCreateAnotherTenant` policy. Independent of US1's `tenant-selector.tsx` edits (no overlap).
- **US3 (P2)**: Depends only on Foundational. Edits `user-form.tsx`, deletes `tenant-multi-select.tsx`, adds `canEditUserTenantField` policy. Independent of US1 and US2.
- **US4 (P3)**: Depends on US1, US2, US3 having merged. Pure verification.

### Within Each User Story

- Policy function file → policy barrel export → policy unit-test append → consumer-component edit → component test → E2E test (in that order)
- The shared file `policy/policy.test.ts` is appended sequentially across stories (T009 → T017 → T028); they cannot run in parallel because they edit the same file
- The shared file `policy/index.ts` is also appended sequentially (T008 → T016 → T027)

### Parallel Opportunities

- T002 (seed) is parallel to T001 (verify branch)
- Within Foundational: T003–T006 are sequential (each creates a file the next references), so no [P]
- Within US1: T012 (component test), T013 (web E2E), T014 (desktop test) are parallel because they edit different test files
- Within US2: T015 (policy fn), T018 (en.json), T019 (es.json), T020 (Dialog component), T021 (Dialog test) are parallel — all different files. T024 and T025 (table-gating tests) are parallel after T023 lands.
- Within US3: T026 (policy fn), T029 (en.json), T030 (es.json) are parallel. T036, T037, T038 are parallel test edits in different files. T039 (i18n cleanup) is parallel with T040 (E2E).
- Within Polish: T043–T046 are parallel (independent verifications).

---

## Parallel Example: User Story 2

```bash
# After Foundational is done, launch US2's parallel work in one batch:
Task: "Implement canCreateAnotherTenant in policy/can-create-another-tenant.ts"   # T015
Task: "Add 4 contactSupport keys to packages/i18n/src/messages/en.json"            # T018
Task: "Add 4 contactSupport keys to packages/i18n/src/messages/es.json"            # T019
Task: "Implement ContactSupportDialog in components/contact-support-dialog.tsx"    # T020
Task: "Add component test for ContactSupportDialog"                                # T021

# Then sequentially:
T016 (barrel export)  →  T017 (policy.test.ts append)  →  T022 (selector index export)  →  T023 (tenants-table edit)

# Then parallel again:
Task: "Component test tenants-table.gating.test.tsx"  # T024
Task: "E2E test tenant-create-gating.spec.ts"         # T025
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

Both Story 1 and Story 2 are P1 — together they form the v1 product narrative ("an Admin sees one community and cannot create more"). Suggested MVP scope:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (selector visibility)
4. Complete Phase 4: User Story 2 (tenant-create gating)
5. **STOP and VALIDATE**: Run quickstart.md Sections 1 and 2; ship MVP if green
6. Continue to Phase 5: User Story 3 (user-form tenant field) for full v1
7. Phase 6: User Story 4 (regression verification)
8. Phase 7: Polish

### Incremental Delivery

- After Phases 1–4: MVP — Admins see one community in the UI and cannot create extras
- After Phase 5: v1 complete — user-creation form aligned with the single-tenant policy
- After Phase 6: regression gate cleared — SuperAdmin flows verified intact
- After Phase 7: PR ready — API regression confirmed and quickstart green

### Parallel Team Strategy

Two-developer split is natural here:

1. Both complete Setup + Foundational together (small)
2. Once Foundational is done:
   - Developer A: User Story 1 (selector + reconciliation)
   - Developer B: User Story 2 (Dialog + Tenants table gating)
3. Either developer picks up User Story 3 next (independent of US1/US2)
4. User Story 4 (verification) and Polish are shared cleanup

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps each task to a specific user story for traceability
- All three policy functions are pure (no React) and unit-testable in isolation; the shared `policy.test.ts` file is appended one describe block per story
- Tests are required by plan.md "Testing" section (Vitest unit, Vitest+RTL component, Vitest+JSDOM desktop, Playwright E2E, Jest API regression)
- Commit after each task or logical group; a natural commit boundary is the end of each story phase
- FR-022 is a hard gate: no API change. T043 + T044 are the regression checks
- SC-008 is the architectural promise: a future tier/permission feature replaces ≤ 3 files per concern. Verified by code review when that feature lands
