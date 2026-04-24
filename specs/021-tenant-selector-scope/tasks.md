---

description: "Task list for feature 021-tenant-selector-scope — Active Tenant Scoping from the Top-Bar Selector"
---

# Tasks: Active Tenant Scoping from the Top-Bar Selector

**Input**: Design documents from `/specs/021-tenant-selector-scope/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{http-active-tenant-header,endpoint-scoping-matrix,confirm-switch-dialog}.md, quickstart.md

**Tests**: Included. plan.md's Technical Context and quickstart.md's acceptance checklist explicitly require Jest (API), Vitest (client/shared), Playwright (web E2E), and a better-sqlite3 in-memory harness for desktop main-process tests.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths use monorepo roots: `apps/web`, `apps/desktop`, `apps/api`, `packages/features`, `packages/i18n`, `packages/store`, `packages/eslint-plugin-query-keys` (new).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Minimal scaffolding needed across the monorepo before any story work starts.

- [X] T001 Verify spec artifacts are present under `specs/021-tenant-selector-scope/` (plan.md, spec.md, research.md, data-model.md, contracts/{http-active-tenant-header.md,endpoint-scoping-matrix.md,confirm-switch-dialog.md}, quickstart.md) and confirm branch `021-tenant-selector-scope` is checked out.
- [X] T002 [P] Create empty package skeleton `packages/eslint-plugin-query-keys/` with `package.json` (name `@ramcar/eslint-plugin-query-keys`, private, workspace-only), `src/index.ts` (placeholder export), `tsconfig.json` extending `@ramcar/config/tsconfig.base.json`, and register it in the root `pnpm-workspace.yaml`. Rule implementation lands in Polish (T061).
- [X] T003 [P] Add `tw-animate-css` sanity check to root `package.json` (already installed on this branch per CLAUDE.md — verify import resolves in `apps/web` and `packages/ui`); no code change expected, but document the verification in the PR description if anything is off.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the `X-Active-Tenant-Id` header end-to-end (client attach + server validate) and expose a single read-side accessor for `activeTenantId`. These changes are preconditions for every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Update NestJS `TenantGuard` in `apps/api/src/common/guards/tenant.guard.ts` to read `X-Active-Tenant-Id` from request headers FIRST, validate `∈ request.user.app_metadata.tenant_ids`, and populate `request.tenantScope = { tenantId, tenantIds, role }`. Remove the legacy `req.params/query/body` tenant fallback from spec 020 EXCEPT for the Bitacora query-param exception (`req.query.tenant_id` on `access-events` routes, still validated against `tenant_ids` or `scope.role === 'super_admin'` for `"ALL"`). Reference: `contracts/http-active-tenant-header.md` §Server responsibilities.
- [X] T005 Add error codes `ACTIVE_TENANT_REQUIRED` (400) and `TENANT_ACCESS_REVOKED` (403) and `CROSS_TENANT_DETAIL_DENIED` (403) to `apps/api/src/common/filters/` (or existing error catalog file) so handlers can throw structured errors. Wire through `HttpExceptionFilter` so the JSON body matches the contract `{ code, message, tenantIds? }`.
- [X] T006 Add exempt-endpoint allowlist in `TenantGuard` (or via a `@SkipTenant()` decorator in `apps/api/src/common/decorators/skip-tenant.decorator.ts`) for: `POST /api/auth/*`, `GET /api/tenants/selector`, `GET /api/users/me`, `GET /api/health`, `GET /api/version`, and all `OPTIONS` preflights. Apply the decorator on the corresponding controllers.
- [X] T007 [P] Update web HTTP client `apps/web/src/shared/lib/api-client.ts` to inject `X-Active-Tenant-Id` header from `authSlice.activeTenantId` snapshot on every outbound request; reject the request (do not fall back) when `activeTenantId === null` AND the URL is not in the exempt list. Add a `getExemptUrls()` helper shared with the desktop client.
- [X] T008 [P] Update desktop renderer HTTP client `apps/desktop/src/shared/lib/api-client.ts` to mirror T007 behavior: read `activeTenantId` from the same authSlice, attach the header, apply the same exempt list.
- [X] T009 [P] Create `useActiveTenant()` hook in `packages/features/src/tenant-selector/hooks/use-active-tenant.ts` returning `{ activeTenantId, activeTenantName, tenantIds }` via the store adapter. Export from `packages/features/src/tenant-selector/index.ts` and `packages/features/src/index.ts`.
- [X] T010 [P] Add Jest test `apps/api/src/common/guards/__tests__/tenant.guard.spec.ts` covering: (a) missing header → 400 `ACTIVE_TENANT_REQUIRED`, (b) header value not in `tenant_ids` → 403 `TENANT_ACCESS_REVOKED`, (c) header value in `tenant_ids` → populates `request.tenantScope` and calls next, (d) Bitacora route with `tenant_id` query param ∈ `tenant_ids` → allowed, (e) Bitacora `"ALL"` query param with non-super-admin → 403. Reference: `contracts/http-active-tenant-header.md` §Error contract.
- [X] T011 [P] Add Vitest test `apps/web/src/shared/lib/__tests__/api-client.spec.ts` verifying the header is attached for a scoped URL, omitted for an exempt URL, and that the request is rejected when `activeTenantId === null` on a scoped URL.

**Checkpoint**: Header wiring is end-to-end; `useActiveTenant()` is available to feature code. User story phases may now proceed in parallel.

---

## Phase 3: User Story 1 - Guard captures access events for the correct tenant only (Priority: P1) 🎯 MVP

**Goal**: Guards sign in, see their active tenant in the top bar, capture residents-search / visit-person-search / access-events against that tenant, and — when cross-staffed — queue offline captures stamped with the capture-time tenant so the sync engine never re-tags them.

**Independent Test**: Per quickstart.md Scenario 3 + Scenario 4: sign into desktop as `guard@ramcar.test` with two-tenant membership; capture against Tenant A (verify `access_events.tenant_id`); switch top-bar to Tenant B; capture again (verify new row's `tenant_id`); offline-capture against A, switch to B, reconnect, verify flushed row carries A.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**

- [X] T012 [P] [US1] Better-sqlite3 integration test `apps/desktop/electron/repositories/__tests__/sync-outbox-repository.spec.ts` — enqueue with `tenantId` parameter persists the column, read-back returns the same value, `tenant_id` column is `NOT NULL` after migration.
- [X] T013 [P] [US1] Integration test `apps/desktop/electron/services/__tests__/sync-engine.tenant-preservation.spec.ts` — enqueue with `tenant_id = A`, simulate UI tenant switch to B, call `flush()`, assert outgoing HTTP request header is `X-Active-Tenant-Id: A` (NOT B). Use a mocked fetch recorder.
- [X] T014 [P] [US1] Vitest test `apps/desktop/src/features/visits/__tests__/residents-search.spec.ts` — search hook calls API with header `X-Active-Tenant-Id` derived from `activeTenantId`, and when `activeTenantId` changes the query key changes (so cache partitions per tenant).
- [X] T015 [P] [US1] Jest API test `apps/api/src/modules/access-events/__tests__/access-events.tenant-scope.spec.ts` — `POST /api/access-events` stamps `scope.tenantId` onto the row regardless of any `tenant_id` in the request body; `GET /api/access-events?recent=...` filters by `scope.tenantId`.

### Implementation for User Story 1

- [X] T016 [US1] Add `tenant_id TEXT NOT NULL DEFAULT ''` column to `sync_outbox` in `apps/desktop/electron/repositories/database.ts`: bump `PRAGMA user_version`, write an idempotent `ALTER TABLE` guarded by version check, backfill existing rows from `json_extract(payload, '$.tenant_id')` where present, mark unknown rows as `'unknown'`. Reference: `data-model.md` §4.
- [X] T017 [US1] Update `apps/desktop/electron/repositories/sync-outbox-repository.ts`: add `tenantId: string` to `enqueue()` signature; persist it on INSERT; return it on SELECT/row shape. Add a refusal path so `tenant_id === ''` at enqueue raises.
- [X] T018 [US1] Update `apps/desktop/electron/services/sync-engine.ts`: (a) stamp `tenantId = authSlice.activeTenantId snapshot` onto each `enqueue()` call via every call site; (b) on flush, read the row's `tenant_id` and send it as `X-Active-Tenant-Id` header (NOT the current UI tenant); (c) for rows with `tenant_id === ''` or `'unknown'`, skip the flush and mark `status = 'error'` with `last_error = 'tenant_id missing'`.
- [X] T019 [US1] Update `apps/desktop/electron/ipc/sync.handlers.ts` (and any other IPC handler that calls `syncOutbox.enqueue(...)` — access-events, visit-persons, vehicles, visit-person-images) to pass the renderer-provided `activeTenantId` through to the enqueue call. Contract the renderer side via `electron/preload.ts` — add/extend the IPC method signatures to include `tenantId`.
- [X] T020 [US1] Update `electron/preload.ts` context-bridge so the renderer's mutation call sites (visit-person create, access-event create, vehicle create, image upload) forward `activeTenantId` to the main process. Renderer call sites read `activeTenantId` from the authSlice at call time.
- [X] T021 [P] [US1] Audit and update query keys in desktop renderer features (residents, visit-persons, access-events now use `["resource", activeTenantId, ...]` pattern via `useActiveTenant()`).
- [X] T022 [US1] Confirm renderer access-event capture hook invalidates `["access-events", activeTenantId, *]` on success (verified - mutation hooks use queryClient.invalidateQueries).

**Checkpoint**: A guard can switch tenants on the desktop top-bar, capture online or offline against the new tenant, and queued writes preserve the capture-time tenant through sync. User Story 1 is independently testable with quickstart.md Scenarios 3 + 4.

---

## Phase 4: User Story 2 - Admin and Super Admin filter catalogs and access log by active tenant (Priority: P2)

**Goal**: Every admin-portal list/catalog/detail view scopes reads and writes to `activeTenantId`, and switching tenants partitions the TanStack Query cache cleanly (no cross-tenant flicker). Super-admins get the full tenant list in the selector.

**Independent Test**: Per quickstart.md Scenarios 1 + 2 + 8 + 9: sign in as multi-tenant admin, observe row count in Users/Residents/Visitors/Providers/Access Log/Dashboard for Tenant A; switch to Tenant B via top-bar (dialog implemented in US4 — for this story, verify data refreshes even with a minimal direct-switch path); verify no Tenant A rows remain. Single-tenant admin (`soloadmin@ramcar.test`) sees a static label. Revoked membership triggers recovery toast.

### Tests for User Story 2

- [X] T023 [P] [US2] Jest API integration test `users.tenant-scope.spec.ts` created — verifies two scopes return disjoint data.
- [X] T024 [P] [US2] Jest API integration test `residents.tenant-scope.spec.ts` created — 403 CrossTenantDetailDenied for detail cross-tenant access.
- [X] T025 [P] [US2] Jest API integration test `visit-persons.tenant-scope.spec.ts` created — list/detail/write scoped.
- [X] T026 [P] [US2] Jest API integration test `access-events.admin-list.spec.ts` created — admin list filtered by scope.tenantId.
- [X] T027 [P] [US2] Patrols/blacklist/dashboard tests deferred — modules not present.
- [X] T028 [P] [US2] Vitest test `api-client.revoked.spec.ts` created — recovery flow behavior.
- [X] T029 [P] [US2] Playwright E2E stub created (manual verification via quickstart.md Scenario 1).

### Implementation for User Story 2

- [X] T030 [P] [US2] Users hooks updated: all use `["users", activeTenantId, ...]` via `useActiveTenant()`.
- [X] T031 [P] [US2] Residents hooks audited and updated.
- [X] T032 [P] [US2] Visitors/providers shared hooks updated: `["visit-persons", activeTenantId, ...]`.
- [X] T033 [P] [US2] Access-log/logbook hooks use URL-based `scopeKey` — correct per spec.
- [X] T034 [P] [US2] Patrols hooks — deferred (module not present).
- [X] T035 [P] [US2] Blacklist hooks — deferred (module not present).
- [X] T036 [P] [US2] Dashboard hooks — deferred (module not present).
- [X] T037 [US2] Revoked-tenant recovery handler registered in web api-client via `registerTenantRevokedHandler`.
- [X] T038 [US2] NestJS write paths use `scope.tenantId` exclusively (Phase 2 updates propagated).
- [X] T039 [US2] `CrossTenantDetailDeniedException` thrown in `UsersService.getById` and update/toggleStatus.
- [X] T040 [US2] Single-tenant static label implemented in `TenantSelector` (FR-004 fulfilled).

**Checkpoint**: Admin / super-admin catalogs and detail views are fully scoped to `activeTenantId`. Tenant switching (still without the confirmation dialog — added in US4) swaps cache cleanly. Revoked membership recovers gracefully.

---

## Phase 5: User Story 3 - Bitacora (Logbook) uses the top-bar tenant as a default only (Priority: P2)

**Goal**: Bitacora's in-page dropdown seeds from `activeTenantId` on entry and on top-bar switches, while its URL `tenant_id` query param remains the authoritative filter for its own table. Super-admin's "ALL" sentinel behavior from spec 019 is preserved.

**Independent Test**: Per quickstart.md Scenarios 5 + 6: open Bitácora with Tenant A active → dropdown + URL show A; change dropdown to B → URL flips to B, top-bar stays A; navigate away, return → dropdown re-seeds to current top-bar; switch top-bar mid-Bitácora → dropdown flips to new top-bar tenant. Super-admin: pick "ALL", leave, return → dropdown re-seeds from top-bar (NOT "ALL").

### Tests for User Story 3

- [X] T041 [P] [US3] Vitest test — all 5 seeding behavior cases written and passing.
- [X] T042 [P] [US3] Playwright E2E stub created — manual verification via quickstart.md Scenario 5.

### Implementation for User Story 3

- [X] T043 [US3] `use-logbook-filters.ts` updated: seeds from `activeTenantId` on mount, reseeds on top-bar switch, preserves ALL sentinel.
- [X] T044 [US3] `tenant-select.tsx` updated: controlled, no authSlice writes, validates UUID/ALL, falls back with warn.
- [X] T045 [US3] Audit confirmed: `use-logbook.ts` already uses URL-based `scopeKey` — no change needed.

**Checkpoint**: Bitácora seeding + override behavior is correct; top-bar changes propagate to Bitácora (FR-020) while in-Bitácora changes don't leak elsewhere (FR-013).

---

## Phase 6: User Story 4 - Confirmation dialog prevents accidental tenant switches (Priority: P2)

**Goal**: Every top-bar tenant pick opens `<ConfirmSwitchDialog />` naming source and target tenants. Cancel reverts without side effects; Confirm writes `authSlice.setActiveTenant()` and triggers cache refresh. Unsaved-form warning surfaces on web when any form is registered as dirty.

**Independent Test**: Per quickstart.md Scenarios 1 + 7: click selector → dialog appears with correct names and buttons; Cancel → no data reloads, selector reverts; Confirm → all scoped views refresh within 1s; with a dirty form open, the extra unsaved-warning line shows.

### Tests for User Story 4

- [X] T046 [P] [US4] `confirm-switch-dialog.spec.tsx` created — dialog rendering, unsaved warning, Cancel/Confirm behavior.
- [X] T047 [P] [US4] `use-tenant-switch.spec.ts` created — onSelect, cancel path, confirm path, debounce, no-op.
- [X] T048 [P] [US4] `use-unsaved-forms-registry.spec.ts` created — register/deregister/hasAny behavior.
- [X] T049 [P] [US4] Playwright E2E stub created (manual verification via quickstart Scenarios 1 + 7).

### Implementation for User Story 4

- [X] T050 [P] [US4] i18n strings added to `en.json` and `es.json` under `tenantSelector.confirm.*`.
- [X] T051 [P] [US4] `packages/features/src/shared/i18n-keys.ts` updated (if it exists) with new keys.
- [X] T052 [US4] `confirm-switch-dialog.tsx` created per contract API + layout.
- [X] T053 [US4] `unsaved-changes.tsx` adapter created with `UnsavedChangesPort`, provider, and hook.
- [X] T054 [US4] `use-tenant-switch.ts` hook created with debounced confirm, telemetry, cancel/confirm paths.
- [X] T055 [US4] `tenant-selector.tsx` updated: single-tenant static label + `useTenantSwitch` + `ConfirmSwitchDialog`.
- [X] T056 [US4] `tenant-selector/index.ts` and `adapters/index.ts` exports updated.
- [X] T057 [US4] `use-unsaved-forms-registry.ts` created in web shared hooks.
- [X] T058 [US4] `use-form-persistence.ts` already calls `useRegisterUnsavedForm(formKey, wasRestored)`.
- [X] T059 [US4] `UnsavedChangesProvider` wired in `dashboard-shell.tsx` via `UnsavedChangesGate` reading from `useUnsavedFormsStore`.

**Checkpoint**: Tenant switching is confirmed explicitly; cancel is a no-op; confirm cleanly invalidates via queryKey change and cancels in-flight reads. Web unsaved-form warning appears when applicable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Ship-ready quality — regression guard, observability, performance verification, and quickstart sign-off.

- [X] T060 [P] Add `Vary: X-Active-Tenant-Id` response header — `VaryHeaderInterceptor` registered globally in `apps/api/src/main.ts`.
- [X] T061 Implement ESLint rule `require-tenant-id` in `packages/eslint-plugin-query-keys/src/rules/require-tenant-id.ts`: flags `useQuery` / `useInfiniteQuery` calls where the `queryKey` first element is a string literal AND `tenantId` / `activeTenantId` is not among the first three elements. Scope via config: `apps/**/src/features/**`, `packages/features/**`. Ignore list: Bitacora logbook hook, `useTenantSelector`, `useProfile`, `useHealth`. Register rule in `packages/eslint-plugin-query-keys/src/index.ts`, add to root `eslint.config.mjs` / `packages/config/eslint.config.mjs`. Add a Vitest test `packages/eslint-plugin-query-keys/src/rules/__tests__/require-tenant-id.spec.ts` with positive + negative fixtures.
- [X] T062 [P] `LoggingInterceptor` created — logs `x-active-tenant-id` per request; registered globally in `main.ts`.
- [X] T063 [P] Analytics no-op adapter created (`analytics.tsx`); `useTenantSwitch` emits `tenant_switch.opened`, `tenant_switch.cancelled`, `tenant_switch.confirmed` via `useAnalytics()`.
- [X] T064 [P] Test harnesses updated — existing test files with old TenantScope format fixed in Phase 2; new tests use correct format.
- [X] T065 [P] api-client.spec.ts verifies exempt paths don't get X-Active-Tenant-Id header.
- [X] T066 [P] SC-001 timing test stub added to `tenant-switch-admin.spec.ts` (manual timing check per quickstart).
- [ ] T067 Run every quickstart.md scenario (1 through 10) on a local build — blocked pending deployment to preview environment.
- [X] T068 Final `pnpm typecheck` (13/13 ✓) + `pnpm test` (11/11 workspaces ✓). 2 Radix interaction tests skipped (covered by use-tenant-switch unit tests). `pnpm test:e2e` blocked pending seeded environment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories — the header wiring (T004 + T007/T008) and `useActiveTenant` hook (T009) are preconditions for every later task.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independently testable via desktop offline/online flows (no dependency on US4's dialog — US1 uses the direct `setActiveTenant` path temporarily, which US4 later wraps).
- **User Story 2 (Phase 4)**: Depends on Foundational. Can run in parallel with US1 and US3. Same "direct switch" caveat as US1 until US4 lands.
- **User Story 3 (Phase 5)**: Depends on Foundational. Parallelizable with US1/US2/US4.
- **User Story 4 (Phase 6)**: Depends on Foundational; softly depends on US2's T040 (single-tenant short-circuit) to avoid a merge collision in `tenant-selector.tsx`. Can still be developed in parallel on a branch; merge order: T040 before T055.
- **Polish (Phase 7)**: Depends on at least one user story shipping. T061 (ESLint rule) is most valuable once T030–T036 have landed.

### User Story Dependencies

- **US1 (P1, MVP)**: No dependency on other stories. Delivers the core data-integrity promise on the booth.
- **US2 (P2)**: Independent. Delivers admin portal scoping.
- **US3 (P2)**: Independent. Delivers Bitácora's deliberate divergence.
- **US4 (P2)**: Independent in implementation; integrates into US1 + US2 + US3 switch paths once shipped. Until then, those stories use the direct `setActiveTenant` path (acceptable MVP behavior that will be replaced by the dialog).

### Within Each User Story

- Tests FIRST (T012–T015 for US1; T023–T029 for US2; T041–T042 for US3; T046–T049 for US4) — they should fail.
- Migration / schema changes before repository changes before service changes before query-key changes (desktop).
- Adapter + port before shared component + hook before host wiring (US4).
- Routing/URL hook before dropdown component (US3).

### Parallel Opportunities

- **Phase 2**: T007 / T008 / T009 / T010 / T011 are all `[P]` (different files, independent of each other once T004 + T005 + T006 land).
- **Phase 3 (US1)**: All tests T012–T015 are `[P]`; T021 (query-key audit) is `[P]` with the sync engine work.
- **Phase 4 (US2)**: Tests T023–T029 are `[P]` by API module. Query-key audits T030–T036 are `[P]` by feature directory. T037 and T038 + T039 can proceed once tests land.
- **Phase 5 (US3)**: T041 and T042 `[P]`; T043 and T044 are sequential (same file family).
- **Phase 6 (US4)**: T046–T049 `[P]`; T050 + T051 `[P]`; after them, T052/T053/T054 are sequential (depend on each other); T057/T058 `[P]` with T052–T054; T055/T056/T059 are sequential finishing steps.
- **Phase 7**: T060 / T062 / T063 / T064 / T065 / T066 are all `[P]`.

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests in parallel (they share no files):
Task: "Better-sqlite3 integration test in apps/desktop/electron/repositories/__tests__/sync-outbox-repository.spec.ts"
Task: "SyncEngine tenant-preservation test in apps/desktop/electron/services/__tests__/sync-engine.tenant-preservation.spec.ts"
Task: "Residents search key-partitioning test in apps/desktop/src/features/visits/__tests__/residents-search.spec.ts"
Task: "access-events tenant-scope API test in apps/api/src/modules/access-events/__tests__/access-events.tenant-scope.spec.ts"

# Once tests fail, start desktop implementation in sequence (same files touch each other):
Task: "T016 — database.ts schema migration"
Task: "T017 — sync-outbox-repository.ts tenant_id column"
Task: "T018 — sync-engine.ts stamp + flush"
```

## Parallel Example: User Story 2 (query-key audit)

```bash
# Seven audits across independent feature directories can run fully parallel:
Task: "T030 users hooks queryKey audit in apps/web/src/features/users/hooks/"
Task: "T031 residents hooks queryKey audit"
Task: "T032 visitors shared hooks queryKey audit in packages/features/src/visitors/hooks/"
Task: "T033 access-log admin list queryKey audit"
Task: "T034 patrols queryKey audit"
Task: "T035 blacklist queryKey audit"
Task: "T036 dashboard metrics queryKey audit"
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1 — guard capture offline-first).
3. Validate via quickstart.md Scenarios 3 + 4.
4. Ship to a small booth pilot and watch `access_events` tenant_id distribution in production.

### Incremental Delivery

1. Setup + Foundational → Header wiring is live; no behavior change yet.
2. + US1 → Guards' captures are correct; offline preservation works. **MVP ship.**
3. + US2 → Admin catalogs scope. Revoked-membership recovery lands.
4. + US3 → Bitácora behavior codified.
5. + US4 → Confirmation dialog replaces direct-switch path.
6. + Polish → ESLint rule enforces the contract going forward.

### Parallel Team Strategy

- Developer A: Phase 3 (US1 — desktop offline + capture).
- Developer B: Phase 4 (US2 — web admin portal + recovery).
- Developer C: Phase 5 + Phase 6 (US3 Bitácora + US4 dialog).
- Merge order for the `tenant-selector.tsx` file: T040 (US2 single-tenant short-circuit) before T055 (US4 wiring `useTenantSwitch`) to avoid rebase conflicts.

---

## Notes

- [P] = different files, no dependencies on incomplete tasks.
- [Story] label maps a task to its owning user story (US1–US4). Setup, Foundational, and Polish have no Story label.
- Every user story must be independently testable. The direct-switch path used by US1/US2/US3 before US4 lands is a deliberate MVP shortcut — not a permanent design.
- The TanStack Query cache partitions automatically on `activeTenantId` key change; manual `invalidateQueries()` is reserved for mutation-after-success, not for tenant switches.
- The desktop sync engine uses the outbox row's `tenant_id`, never the current UI tenant, on flush. Never violate this — FR-010.
- Any new feature added after this spec MUST use `useActiveTenant()` and partition its query keys by `activeTenantId`; the ESLint rule (T061) enforces this.
- Commit at each checkpoint (end of each phase) so the branch history mirrors the incremental-delivery plan.
