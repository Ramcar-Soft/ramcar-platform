---
description: "Task list for feature 014-cross-app-code-sharing (Cross-App Shared Feature Modules)"
---

# Tasks: Cross-App Shared Feature Modules

**Input**: Design documents from `/specs/014-cross-app-code-sharing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included where the spec and research explicitly call for them — i.e. the `@ramcar/features` unit tests (research §8 "one source of truth for component behavior tests") and the CI duplication check tests. Host-app E2E/regression tests already exist and are validated (not re-authored).

**Organization**: Tasks are grouped by user story (spec §"User Scenarios & Testing"). Each story is independently testable against its acceptance scenarios.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1..US6 maps to spec's six stories)
- Every task description includes exact file paths

## Path Conventions

- Monorepo: `packages/*`, `apps/*`, `scripts/`, workspace-root files at `/`
- New package: `packages/features/` (→ `@ramcar/features`)
- Host adapter layers: `apps/web/src/shared/lib/features/`, `apps/desktop/src/shared/lib/features/`
- Workspace-root manifest + script: `/shared-features.json`, `/scripts/check-shared-features.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new `@ramcar/features` workspace package so it is installable, typechecked, lintable, testable, and consumable from both host apps.

- [X] T001 Create directory structure `packages/features/src/{adapters,shared,visitors,test}` and `packages/features/`
- [X] T002 Create `packages/features/package.json` with name `@ramcar/features`, `main`/`types` pointing at `src/index.ts`, subpath exports for `./adapters`, `./visitors`, `./shared/*`; workspace deps on `@ramcar/ui`, `@ramcar/shared`, `@ramcar/store`, `@ramcar/i18n`; peer deps on `react` and `@tanstack/react-query`; dev deps for vitest/jsdom/@testing-library matching sibling packages
- [X] T003 [P] Create `packages/features/tsconfig.json` extending `@ramcar/config/tsconfig.base.json` with strict mode and `jsx: "react-jsx"`
- [X] T004 [P] Create `packages/features/vitest.config.ts` configured for jsdom (mirror `packages/store/vitest.config.ts`)
- [X] T005 [P] Create `packages/features/eslint.config.mjs` extending `@ramcar/config/eslint` and adding `no-restricted-imports` for `next/*`, `@supabase/supabase-js`, and raw `fetch`; add `no-restricted-syntax` rule rejecting `"use client"` directives and identifier `window.electron`
- [X] T006 [P] Add `"@ramcar/features": "workspace:*"` to `apps/web/package.json` dependencies
- [X] T007 [P] Add `"@ramcar/features": "workspace:*"` to `apps/desktop/package.json` dependencies
- [X] T008 Update `apps/web/next.config.ts` to include `"@ramcar/features"` in the existing `transpilePackages` array
- [X] T009 [P] Create `packages/features/src/index.ts` as a barrel that re-exports `./adapters` (visitors barrel added later in US1)
- [X] T010 Run `pnpm install` from the repo root to register the new workspace package

**Checkpoint**: `pnpm --filter @ramcar/features typecheck` passes against an empty package; `pnpm --filter @ramcar/web typecheck` and `pnpm --filter @ramcar/desktop typecheck` resolve `@ramcar/features` without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ship the adapter port definitions, the host adapter implementations, the provider wiring in each host app, the new Zustand slice, the i18n consolidation, and the primitive-component migration. All of this MUST complete before the visitors pilot (US1) can import shared code.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Adapter ports (shared contracts authored once)

- [X] T011 [P] Author `packages/features/src/adapters/transport.ts` with `TransportPort` interface, `TransportContext`, `TransportProvider`, and `useTransport()` hook matching `specs/014-cross-app-code-sharing/contracts/feature-transport-port.ts`
- [X] T012 [P] Author `packages/features/src/adapters/i18n.ts` with `I18nPort` interface, `I18nContext`, `I18nProvider`, and `useI18n()` hook matching `contracts/feature-i18n-port.ts`
- [X] T013 [P] Author `packages/features/src/adapters/role.ts` with `RolePort` interface, `RoleContext`, `RoleProvider`, and `useRole()` hook matching `contracts/feature-role-port.ts`
- [X] T014 [P] Create `packages/features/src/adapters/index.ts` re-exporting all three ports and providers

### Web host adapter implementations

- [X] T015 [P] Implement `apps/web/src/shared/lib/features/transport.tsx` exporting `<WebTransportProvider>` that adapts the existing `apiClient` in `apps/web/src/shared/lib/api-client.ts` to `TransportPort`
- [X] T016 [P] Implement `apps/web/src/shared/lib/features/i18n.tsx` exporting `<WebI18nProvider>` that adapts `useTranslations()` from `next-intl` into an `I18nPort` (flatten dotted keys; expose `locale` from `useLocale()`)
- [X] T017 [P] Implement `apps/web/src/shared/lib/features/role.tsx` exporting `<WebRoleProvider>` that reads `role`, `tenantId`, `userId` from the Supabase session via `@/shared/lib/supabase/client`
- [X] T018 [P] Create `apps/web/src/shared/lib/features/index.ts` barrel re-exporting all three providers

### Desktop host adapter implementations

- [X] T019 [P] Implement `apps/desktop/src/shared/lib/features/transport.tsx` exporting `<DesktopTransportProvider>` that adapts the existing `apiClient` in `apps/desktop/src/shared/lib/api-client.ts` to `TransportPort`; leave a TODO comment marking where `window.electron.sync.enqueue()` will hook in for the outbox path
- [X] T020 [P] Implement `apps/desktop/src/shared/lib/features/i18n.tsx` exporting `<DesktopI18nProvider>` that adapts `useTranslation()` from `react-i18next` into an `I18nPort`
- [X] T021 [P] Implement `apps/desktop/src/shared/lib/features/role.tsx` exporting `<DesktopRoleProvider>` that reads `role`, `tenantId`, `userId` from the desktop session source (spec 001 session persistence)
- [X] T022 [P] Create `apps/desktop/src/shared/lib/features/index.ts` barrel

### Provider wiring in host apps

- [X] T023 Wire the three web providers inside `apps/web/src/app/[locale]/(dashboard)/layout.tsx` (authenticated group) above the existing `<StoreProvider>` and `<QueryClientProvider>`
- [X] T024 Wire the three desktop providers in `apps/desktop/src/main.tsx` (or the nearest root component above `<StoreProvider>`/`<QueryClientProvider>`)

### Store extension

- [X] T025 Author `packages/store/src/slices/visitors-slice.ts` with `sidebarMode`, `selectedVisitPersonId`, `activeTab`, and actions per `data-model.md` §5
- [X] T026 Register `VisitorsSlice` in `AppState` inside `packages/store/src/index.tsx` and include `createVisitorsSlice(...args)` in the `createStore` factory

### i18n consolidation (single source of truth)

- [X] T027 Audit every key used by `apps/web/src/features/visitors/**` and `apps/desktop/src/features/visitors/**` against `packages/i18n/src/messages/{en,es}.json`; record any missing/duplicated keys in a working note in `specs/014-cross-app-code-sharing/i18n-audit.md`
- [X] T028 Add missing visitor keys to `packages/i18n/src/messages/en.json` and `packages/i18n/src/messages/es.json` under existing `visitPersons.*` / `common.*` namespaces
- [X] T029 Delete any duplicated visitor keys from `apps/web/src/messages/*.json` (web per-app message files) and from the desktop `i18next` resource files used by `apps/desktop/src/i18n/index.ts`

### Shared-primitive migration (the `src/shared/components/*` duplicates)

- [X] T030 [P] Move `image-capture/` (image-grid.tsx + image-upload.tsx) to `packages/features/src/shared/image-capture/`; strip `"use client"` / relative alias quirks; switch translations to `useI18n()`
- [X] T031 [P] Move `vehicle-form/` (vehicle-form.tsx + vehicle-type-select.tsx) to `packages/features/src/shared/vehicle-form/`; same strip
- [X] T032 [P] Move `visit-person-status-select.tsx` to `packages/features/src/shared/visit-person-status-select/`
- [X] T033 [P] Move `resident-select/` (currently web-only) to `packages/features/src/shared/resident-select/`; route its data call through `useTransport()`
- [X] T034 Create `packages/features/src/shared/index.ts` barrel exporting all four primitives
- [X] T035 Delete `apps/web/src/shared/components/image-capture/`, `apps/web/src/shared/components/vehicle-form/`, `apps/web/src/shared/components/visit-person-status-select.tsx`, `apps/web/src/shared/components/resident-select/`
- [X] T036 Delete `apps/desktop/src/shared/components/image-capture/`, `apps/desktop/src/shared/components/vehicle-form/`, `apps/desktop/src/shared/components/visit-person-status-select.tsx`
- [X] T037 Update all imports that previously pointed at each app's `src/shared/components/{image-capture,vehicle-form,visit-person-status-select,resident-select}` to import from `@ramcar/features/shared/*` (repo-wide grep + edit)

**Checkpoint**: `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass across the monorepo. No visitors files imported yet, but the adapters and primitives are live and consumed by both apps.

---

## Phase 3: User Story 1 — Author a bi-app feature once (Priority: P1) 🎯 MVP

**Goal**: Move the `visitors` feature (all 10 components + 10 hooks) out of both apps into `@ramcar/features/visitors/` and have both apps render the feature by importing from the shared package. A new field added to the shared form appears in both apps with no per-app edit.

**Independent Test**: Add a new field (e.g., `phoneNumber`) to `packages/features/src/visitors/components/visit-person-form.tsx`, add translation keys to `packages/i18n`, run both apps. The field appears in both web and desktop visitor-create sidebars without editing any file under `apps/web/src/features/visitors/` or `apps/desktop/src/features/visitors/` (those directories are empty).

### Shared visitors hooks (transport-agnostic; all in parallel)

- [X] T038 [P] [US1] Migrate `use-visit-persons.ts` to `packages/features/src/visitors/hooks/use-visit-persons.ts`; use `useTransport()` for the API call and `useRole()` for `tenantId` in the query key (`["visit-persons", tenantId, "list", filters]`)
- [X] T039 [P] [US1] Migrate `use-create-visit-person.ts` to `packages/features/src/visitors/hooks/use-create-visit-person.ts`
- [X] T040 [P] [US1] Migrate `use-update-visit-person.ts` to `packages/features/src/visitors/hooks/use-update-visit-person.ts`
- [X] T041 [P] [US1] Migrate `use-upload-visit-person-image.ts` to `packages/features/src/visitors/hooks/use-upload-visit-person-image.ts`
- [X] T042 [P] [US1] Migrate `use-visit-person-images.ts` to `packages/features/src/visitors/hooks/use-visit-person-images.ts`
- [X] T043 [P] [US1] Migrate `use-visit-person-vehicles.ts` to `packages/features/src/visitors/hooks/use-visit-person-vehicles.ts`
- [X] T044 [P] [US1] Migrate `use-recent-visit-person-events.ts` to `packages/features/src/visitors/hooks/use-recent-visit-person-events.ts`
- [X] T045 [P] [US1] Migrate `use-create-access-event.ts` to `packages/features/src/visitors/hooks/use-create-access-event.ts`
- [X] T046 [P] [US1] Migrate `use-update-access-event.ts` to `packages/features/src/visitors/hooks/use-update-access-event.ts`
- [X] T047 [P] [US1] Migrate `use-keyboard-navigation.ts` to `packages/features/src/visitors/hooks/use-keyboard-navigation.ts`

### Shared visitors components (all in parallel; each one replaces the dual duplicates)

- [X] T048 [P] [US1] Migrate `visit-person-status-badge.tsx` to `packages/features/src/visitors/components/visit-person-status-badge.tsx`; strip `"use client"`; switch to `useI18n()`
- [X] T049 [P] [US1] Migrate `visit-person-sidebar.tsx` to `packages/features/src/visitors/components/visit-person-sidebar.tsx`; read `sidebarMode`/`selectedVisitPersonId` from `useAppStore` (visitors slice)
- [X] T050 [P] [US1] Migrate `visit-person-form.tsx` to `packages/features/src/visitors/components/visit-person-form.tsx`; accept props `initialDraft?`, `onDraftChange?`, `afterFields?`; DO NOT import `useFormPersistence`; strip `"use client"`; `useI18n()` for strings
- [X] T051 [P] [US1] Migrate `visit-person-edit-form.tsx` to `packages/features/src/visitors/components/visit-person-edit-form.tsx`
- [X] T052 [P] [US1] Migrate `visit-person-access-event-form.tsx` to `packages/features/src/visitors/components/visit-person-access-event-form.tsx`
- [X] T053 [P] [US1] Migrate `image-section.tsx` to `packages/features/src/visitors/components/image-section.tsx` (consumes the shared `image-capture/*` primitives migrated in Phase 2)
- [X] T054 [P] [US1] Migrate `recent-events-list.tsx` to `packages/features/src/visitors/components/recent-events-list.tsx`
- [X] T055 [P] [US1] Migrate `visitors-table.tsx` to `packages/features/src/visitors/components/visitors-table.tsx`; accept `emptyState?: ReactNode` and `trailingAction?: ReactNode` slot props per `contracts/slot-prop-conventions.md`
- [X] T056 [P] [US1] Migrate `visitors-table-columns.tsx` to `packages/features/src/visitors/components/visitors-table-columns.tsx`

### Top-level view + public surface

- [X] T057 [US1] Author `packages/features/src/visitors/components/visitors-view.tsx` (renamed from `visitors-page-client.tsx`; no "Client" suffix); expose slot props `topRightSlot?`, `trailingAction?`, `emptyState?`, and behavior props `initialDraft?`, `onDraftChange?`; document each in TSDoc per `contracts/slot-prop-conventions.md` (depends on T048–T056)
- [X] T058 [US1] Create `packages/features/src/visitors/types.ts` re-exporting `VisitPerson`, `VisitPersonImage`, `AccessEvent`, `Vehicle`, and related types from `@ramcar/shared` (zero duplication)
- [X] T059 [US1] Create `packages/features/src/visitors/index.ts` as the public surface exporting `VisitorsView`, all hooks, and types
- [X] T060 [US1] Add `export * from "./visitors";` to `packages/features/src/index.ts`

### Wire host apps against the shared surface

- [X] T061 [US1] Rewrite `apps/web/src/app/[locale]/(dashboard)/visits-and-residents/**/page.tsx` (or the concrete visitors route — find it during task execution) to render `<VisitorsView />` imported from `@ramcar/features/visitors`; wire `initialDraft`/`onDraftChange` from `apps/web/src/shared/hooks/use-form-persistence.ts`; wire `trailingAction` from any existing admin-only action component
- [X] T062 [US1] Rewrite the desktop visitors page (currently `apps/desktop/src/features/visitors/pages/*`) — move page-level wiring to `apps/desktop/src/pages/visitors-page.tsx` and render `<VisitorsView />` imported from `@ramcar/features/visitors`

### Remove duplicated directories

- [X] T063 [US1] Delete every file under `apps/web/src/features/visitors/` (entire directory removed)
- [X] T064 [US1] Delete every file under `apps/desktop/src/features/visitors/` (entire directory removed)

### Unit tests in the shared package (passing tests prove both apps' contract)

- [X] T065 [P] [US1] Author the Vitest harness `packages/features/src/test/harness.tsx` that renders children inside mock `TransportPort`/`I18nPort`/`RolePort` providers plus a real `<StoreProvider>`; export `renderWithHarness(ui, overrides?)`
- [X] T066 [P] [US1] Write `packages/features/src/visitors/__tests__/visit-person-form.test.tsx` covering happy-path submit, required-field validation, and `onDraftChange` firing on input
- [X] T067 [P] [US1] Write `packages/features/src/visitors/__tests__/visitors-table.test.tsx` covering row selection toggles the visitors slice, and `emptyState` slot renders when data is empty
- [X] T068 [P] [US1] Write `packages/features/src/visitors/__tests__/use-create-visit-person.test.tsx` asserting the hook calls `transport.post("/visit-persons", payload)` and invalidates the `["visit-persons", tenantId]` keys

**Checkpoint**: Both apps build and run. `apps/web/src/features/visitors/` and `apps/desktop/src/features/visitors/` are empty. A diff on any one file in `packages/features/src/visitors/**` is the entire cost of a UI/behavior change for the visitors feature.

---

## Phase 4: User Story 2 — Change a shared behavior in one place (Priority: P1)

**Goal**: Prove the single-change path. A behavior change to the pilot feature is authored in exactly one file and shows up in both apps.

**Independent Test**: Tighten a validation rule in one file. Run web + desktop. Both reflect the new rule; no other commits needed.

- [X] T069 [US2] Pick a representative validation rule (e.g., min-length on `fullName`) and tighten it in `packages/shared/src/validators/visit-person.ts`; commit as a single-file change
- [X] T070 [US2] Run `pnpm dev` and manually verify the new rule is enforced on the visitor-create flow in both `apps/web` and `apps/desktop`
- [X] T071 [P] [US2] Add a regression Vitest test in `packages/features/src/visitors/__tests__/visit-person-form-validation.test.tsx` asserting the tightened rule rejects input below the new threshold
- [X] T072 [US2] Measure SC-003 (≥40% LOC reduction) by counting lines under `apps/web/src/features/visitors/**`, `apps/desktop/src/features/visitors/**`, and `packages/features/src/visitors/**` before/after migration; record numbers in a new `specs/014-cross-app-code-sharing/metrics.md`

**Checkpoint**: One file, one diff, two apps updated. Metrics recorded.

---

## Phase 5: User Story 3 — Allow deliberate platform divergence without forking (Priority: P1)

**Goal**: Each deliberate divergence (desktop-only sync badge, web-only draft recovery, web-only admin actions) is wired through the documented extension points. The shared module remains unforked.

**Independent Test**: Desktop visitors page shows an offline/sync badge in the toolbar; web visitors page does not. Web visitors form restores a draft after simulating a reload; desktop does not attempt to. Neither host required a change to `@ramcar/features`.

- [X] T073 [P] [US3] Author `apps/desktop/src/shared/components/sync-badge.tsx` that subscribes to `SyncSlice` via `useAppStore` and renders the current sync state
- [X] T074 [P] [US3] Inject `<SyncBadge />` into `<VisitorsView topRightSlot={...} />` on the desktop visitors page (`apps/desktop/src/pages/visitors-page.tsx`)
- [X] T075 [P] [US3] Wire `useFormPersistence("visit-person-create", ...)` on the web visitors page: supply `initialDraft` and `onDraftChange` props to `<VisitorsView />` so the browser-reload recovery path activates only on web
- [X] T076 [P] [US3] Identify any existing web-only admin action on the visitors row; render it via `trailingAction` gated by `useRole().role === "Admin"` in the web host page (or record in `i18n-audit.md`/metrics that none exists today)
- [X] T077 [P] [US3] Add Vitest test `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx` asserting `topRightSlot`, `trailingAction`, and `emptyState` render when provided and are absent when not
- [X] T078 [P] [US3] Add Vitest test `packages/features/src/visitors/__tests__/visitors-view-draft.test.tsx` asserting `initialDraft` pre-fills inputs and `onDraftChange` fires on change

**Checkpoint**: Desktop shows the offline badge; web shows the draft-restored banner. `packages/features/src/visitors/` is unchanged during this phase (extension points worked without a fork).

---

## Phase 6: User Story 4 — Detect and prevent re-duplication (Priority: P2)

**Goal**: CI fails when a migrated feature is reintroduced under `apps/*/src/features/<X>/`.

**Independent Test**: Open a PR that adds a new component under `apps/web/src/features/visitors/components/` (or desktop). CI fails with an actionable error pointing at the offending path and the migrated shared package.

- [X] T079 [US4] Create `/shared-features.json` at the workspace root with `$schema` pointing at `./specs/014-cross-app-code-sharing/contracts/shared-features-manifest.schema.json` and an empty `features: []` / `allowList: []`
- [X] T080 [US4] Append the `visitors` entry to `/shared-features.json` with `name: "visitors"`, `migratedAt` = today's date, `package: "@ramcar/features/visitors"`
- [X] T081 [US4] Implement `/scripts/check-shared-features.ts` — Node script (ts-node or tsx) that: (a) reads the manifest, (b) scans `apps/web/src/features/<name>/**/*.{ts,tsx}` and `apps/desktop/src/features/<name>/**/*.{ts,tsx}` for every migrated feature, (c) permits only `index.ts` files whose AST is exclusively a single `export * from "@ramcar/features/<name>"`, (d) respects `allowList` paths, (e) exits non-zero with a formatted message listing offending path, feature name, target package, and a link to `specs/014-cross-app-code-sharing/`
- [X] T082 [P] [US4] Add a `"check:shared-features"` script in the root `/package.json` invoking `tsx scripts/check-shared-features.ts`
- [X] T083 [US4] Wire `check:shared-features` as a top-level task in `/turbo.json` so `pnpm turbo check:shared-features` runs it
- [X] T084 [US4] Create `/.github/workflows/ci.yml` (or extend the existing CI workflow if present) to run `pnpm turbo check:shared-features` after `pnpm install`
- [X] T085 [P] [US4] Author Vitest tests in `/scripts/__tests__/check-shared-features.test.ts` covering: (a) pass when app features dir is empty, (b) fail when a non-reexport file exists, (c) pass when an `index.ts` is a pure re-export, (d) pass when the offending path is in `allowList`, (e) message content includes migrated-feature name and target package

**Checkpoint**: Deliberately drop a `test.tsx` stub into `apps/web/src/features/visitors/` locally; `pnpm turbo check:shared-features` fails with the expected message. Remove the stub; it passes.

---

## Phase 7: User Story 5 — Migrate existing duplicated features incrementally (Priority: P2)

**Goal**: Prove the visitors pilot shipped without breaking the still-unmigrated `residents` and `providers` features, and the migration runbook is ready for the follow-on PRs.

**Independent Test**: Build and run both apps; walk the residents and providers flows end-to-end. Both continue to function. The runbook in `quickstart.md` Task 6 is complete and referenced from CLAUDE.md's migration-status table.

- [X] T086 [US5] Build `apps/web` and `apps/desktop`; walk the `residents` create/edit flow in both; record pass/fail in `specs/014-cross-app-code-sharing/metrics.md`
- [X] T087 [US5] Walk the `providers` create/edit flow in both apps; record pass/fail
- [X] T088 [US5] Review `specs/014-cross-app-code-sharing/quickstart.md` Task 6 ("Migrate a new feature to `@ramcar/features`") against the visitors experience; correct any drift
- [X] T089 [US5] Update the "Migration status" bullet list in `CLAUDE.md` under "Cross-App Shared Feature Modules": mark `visitors` as migrated with today's date; keep `residents` and `providers` as pending follow-on

**Checkpoint**: Residents and providers are untouched, still function in both apps. Team has a working runbook for the next migration.

---

## Phase 8: User Story 6 — Keep the end-user experience consistent (Priority: P3)

**Goal**: End-user-visible parity. The same labels, same required fields, same validation messages across both apps for the visitors workflow.

**Independent Test**: Side-by-side walkthrough of the visitor-create flow on web and desktop. Labels, required markers, and validation messages match. A translation change in `@ramcar/i18n` shows up in both apps without a per-app release step.

- [X] T090 [US6] Perform a side-by-side walkthrough of visitor-create in web (`apps/web`) and desktop (`apps/desktop`); record each label, placeholder, and validation message; confirm parity in `specs/014-cross-app-code-sharing/metrics.md`
- [X] T091 [US6] Grep `apps/web/` and `apps/desktop/` for any remaining visitor-related string literals not sourced from `@ramcar/i18n`; remove or rehome them
- [X] T092 [US6] Run existing web E2E (`pnpm --filter @ramcar/web test:e2e`) and desktop integration tests (`pnpm --filter @ramcar/desktop test`); confirm green and record in metrics

**Checkpoint**: SC-004 (strings defined once) and SC-008 (no user-visible regression) are both met.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final gate before handing off to `residents`/`providers` follow-on PRs.

- [X] T093 [P] Run `pnpm typecheck` at the monorepo root; fix any residual errors
- [X] T094 [P] Run `pnpm lint` at the monorepo root; fix any residual warnings
- [X] T095 [P] Run `pnpm test` at the monorepo root; confirm all suites (including `@ramcar/features`) pass
- [X] T096 [P] Run `pnpm turbo check:shared-features`; confirm passing
- [X] T097 Verify Success Criteria SC-001..SC-008 from `specs/014-cross-app-code-sharing/spec.md`; append a "Validation" section to `specs/014-cross-app-code-sharing/metrics.md` with a pass/fail line per SC
- [X] T098 Update `CLAUDE.md` "Cross-App Shared Feature Modules" block: final wording, any lessons learned, point at the new `@ramcar/features` package layout and the manifest
- [X] T099 Bump `packages/features/package.json` version to `0.1.0` (first working release)
- [X] T100 Run the full `quickstart.md` scenarios locally (Tasks 1, 2, 3, 4, 7) and confirm each behaves as described

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001–T010). BLOCKS every user story
- **US1 (Phase 3)**: Depends on Foundational. No dependencies on US2..US6
- **US2 (Phase 4)**: Depends on US1 shipping (the pilot must exist before you can prove one-place changes)
- **US3 (Phase 5)**: Depends on US1 (slot props exist on `VisitorsView`); may run in parallel with US2 after T057
- **US4 (Phase 6)**: Depends on US1 (the manifest only makes sense after the first migration); may run in parallel with US2/US3
- **US5 (Phase 7)**: Depends on US1 + US4 (manifest in place so residents/providers aren't in it yet)
- **US6 (Phase 8)**: Depends on US1 + US2 + US3 (full pilot including slots)
- **Polish (Phase 9)**: After all user stories

### Within-Phase Dependencies

**Foundational (Phase 2)**:
- T011–T014 (adapter ports) before T015–T022 (host adapter implementations reference the ports)
- T023, T024 (provider wiring) after T015–T022
- T025 before T026 (slice file must exist before registration)
- T027 before T028, T029 (audit before edits)
- T030–T033 (primitives) independent of each other; T034 before T035–T037 (barrel must exist before deletion rewrites imports)

**US1 (Phase 3)**:
- Hooks T038–T047 and components T048–T056 can all run in parallel — distinct files, no cross-dependencies (each pulls only from the foundational adapters and primitives, which are already live)
- T057 (`VisitorsView`) depends on T048–T056 (it composes them)
- T058 (`types.ts`) and T059 (`index.ts`) after T038–T057
- T060 after T059
- T061, T062 (host wiring) after T060
- T063, T064 (deletion) after T061, T062
- T065–T068 (tests) can start as soon as the hooks/components they exercise exist

**US3 (Phase 5)**:
- T073 before T074 (the badge component must exist to be injected)
- T075 independent of T073/T074 (web-side)
- T077, T078 after T057

**US4 (Phase 6)**:
- T079 before T080
- T081 depends on the manifest schema existing (already in `contracts/`) and on T079
- T082 before T083 (script entry before Turbo task)
- T084, T085 can run in parallel after T081

### Parallel Opportunities

- **Setup**: T003, T004, T005, T006, T007, T009 all `[P]`
- **Foundational**: all three adapter ports `[P]` with each other (T011, T012, T013, T014); all three web adapters `[P]` (T015–T018); all three desktop adapters `[P]` (T019–T022); all four primitive moves `[P]` (T030–T033)
- **US1**: massive parallelism — 10 hooks + 10 components all `[P]` (T038–T056)
- **US1 tests**: T065, T066, T067, T068 all `[P]`
- **US3**: T073, T074, T075, T076, T077, T078 mostly `[P]`
- **US4**: script tests `[P]` (T085); script entry `[P]` (T082)
- **Polish**: T093, T094, T095, T096 all `[P]`

---

## Parallel Example: User Story 1 (the visitors migration)

Once Phase 2 (Foundational) is complete, the 20 file-level migrations for US1 can fan out across the team:

```bash
# Developer A: hooks
Task: "Migrate use-visit-persons.ts → packages/features/src/visitors/hooks/use-visit-persons.ts"
Task: "Migrate use-create-visit-person.ts → packages/features/src/visitors/hooks/use-create-visit-person.ts"
# ... plus 8 more hooks (T040–T047), all [P]

# Developer B: simple components
Task: "Migrate visit-person-status-badge.tsx → packages/features/src/visitors/components/visit-person-status-badge.tsx"
Task: "Migrate recent-events-list.tsx → packages/features/src/visitors/components/recent-events-list.tsx"
Task: "Migrate image-section.tsx → packages/features/src/visitors/components/image-section.tsx"

# Developer C: forms (the trickiest — slot props + draft callbacks)
Task: "Migrate visit-person-form.tsx with slot props + initialDraft/onDraftChange callbacks"
Task: "Migrate visit-person-edit-form.tsx"
Task: "Migrate visit-person-access-event-form.tsx"

# Developer D: table + sidebar
Task: "Migrate visitors-table.tsx with emptyState + trailingAction slots"
Task: "Migrate visitors-table-columns.tsx"
Task: "Migrate visit-person-sidebar.tsx with visitorsSlice wiring"
```

Then one developer serializes T057 → T060 → T061, T062 → T063, T064.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (scaffolded package).
2. Complete Phase 2: Foundational (adapters + primitives + store slice + i18n consolidation).
3. Complete Phase 3: US1 (the visitors migration itself).
4. **STOP and VALIDATE**: run both apps; walk the visitor-create flow in each; confirm no regression against the pre-migration acceptance tests for spec 011/013.
5. Ship the MVP PR.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → visitors migrated → MVP ship.
3. US2 → prove single-place change → ship metrics + validation test.
4. US3 → wire the deliberate platform divergences (sync badge, draft recovery) → ship.
5. US4 → CI drift check → ship; now future PRs are protected.
6. US5 → prove residents/providers still fine → ship the runbook.
7. US6 → end-user parity audit → final polish.
8. Phase 9 polish → merge to main.

Residents and providers migrations are explicitly follow-on PRs (not part of this plan) and follow the runbook in `quickstart.md` Task 6.

### Parallel Team Strategy

With three developers:

1. Team completes Setup + Foundational together (two days of mostly-parallel work given the `[P]` tasks).
2. Once Foundational is done, developers fan out across the 20 `[P]` file-level migrations in US1. One dev serializes the integration (T057–T064).
3. US2, US3, US4 can run in parallel once US1 lands — each touches disjoint files.
4. US5 and US6 are validation-heavy; best run by one developer against the full stack.

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks in the same phase.
- `[Story]` labels trace back to spec.md user stories (US1..US6).
- US1 is the MVP; US2 and US6 are verification stories (prove the pattern works for the engineer and for the end-user); US3 is the extension-points story; US4 is the self-enforcement story; US5 is the "don't break the other features" story.
- The five contract files in `specs/014-cross-app-code-sharing/contracts/` are the authoritative sources for T011–T014, T079–T085 — do not let the runtime implementations drift from them.
- Do NOT commit until the user explicitly asks (per CLAUDE.md git rules).
- Stop at each phase checkpoint to validate before moving on.
- Avoid `useFormPersistence` imports inside `packages/features/` — the hook stays in `apps/web/src/shared/hooks/` by design (research §12).
