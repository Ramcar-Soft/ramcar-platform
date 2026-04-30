---

description: "Tasks for spec 025 — Inline Vehicle Creation in Person Create Form"
---

# Tasks: Inline Vehicle Creation in Person Create Form

**Input**: Design documents from `/specs/025-inline-vehicle-create/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/inline-vehicle-section.md, quickstart.md

**Tests**: Included — research §9 enumerates the test layout (Vitest unit + integration tests across `packages/features/src/shared/vehicle-form/`, `packages/features/src/visitors/`, `apps/web/src/features/users/`, `apps/web/src/features/providers/`, `apps/desktop/src/features/providers/`, plus an optional Playwright happy-path).

**Organization**: Tasks are grouped by user story. US1 and US3 are P1 (booth visitor flow + role-gate security invariant). US2 is P2 (resident onboarding on web).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks).
- **[Story]**: Maps the task to a user story (US1, US2, US3). Setup / Foundational / Polish phases have no story label.
- All file paths are absolute from the repo root.

## Path Conventions

This is a Turborepo monorepo. Touched roots:

- `packages/features/src/shared/vehicle-form/` — shared inline-vehicle UI + orchestration hook (cross-app).
- `packages/features/src/visitors/` — shared visitor/provider feature module.
- `packages/i18n/src/messages/` — shared user-facing strings.
- `apps/web/src/features/users/` — single-app resident integration.
- `apps/web/src/features/providers/` — web provider integration.
- `apps/desktop/src/features/providers/` — desktop provider integration.
- `apps/web/src/shared/hooks/use-form-persistence.ts` — web-only draft recovery widening.

---

## Phase 1: Setup (Shared i18n strings)

**Purpose**: Land the new `vehicles.inline.*` localized strings in `@ramcar/i18n` so every host that consumes the shared inline section has labels available before integration. Per FR-017, all new user-facing strings live in the shared catalog rather than per-app message files.

- [X] T001 Add the new `vehicles.inline.*` namespace to `packages/i18n/src/messages/en.json` with the 8 keys defined in research §7 (`sectionTitle`, `sectionTitleResident`, `addEntry`, `removeEntry`, `savingEntry`, `savedEntry`, `retryEntry`, `errorPlateInUse`).
- [X] T002 [P] Add the same 8 keys (Spanish translations) to `packages/i18n/src/messages/es.json` under `vehicles.inline.*`.
- [X] T003 [P] Update `packages/i18n/src/messages/en.ts` and `packages/i18n/src/messages/es.ts` `as const` re-exports (if present) so the new keys are typed; otherwise verify the JSON imports already cover the new namespace and skip.

---

## Phase 2: Foundational (Shared inline-vehicle primitives)

**Purpose**: Build the cross-app shared component (`<InlineVehicleSection />`) and orchestration hook (`useInlineVehicleSubmissions`) that ALL three user stories consume. This phase is BLOCKING — no user story integration can begin until these exports exist and pass their unit tests.

**⚠️ CRITICAL**: No host-app integration (US1, US2, US3) can start until this phase is complete.

- [X] T004 Define the `InlineVehicleEntry` type module in `packages/features/src/shared/vehicle-form/inline-vehicle-types.ts`: export `InlineVehicleEntryStatus` (`"draft" | "saving" | "saved" | "error"`), `InlineVehicleEntryFields`, and `InlineVehicleEntry` exactly as specified in `data-model.md` §3, plus the `OwnerKind` union.
- [X] T005 Implement the orchestration hook at `packages/features/src/shared/vehicle-form/use-inline-vehicle-submissions.ts` per `contracts/inline-vehicle-section.md` §2. Required behavior: own `entries` state with `addEntry` / `removeEntry` / `updateEntry` / `reset`; expose `isSubmittingAny` and `allSaved`; implement `submitAll(personId, ownerKind)` as a sequential `for…of` await loop calling `transport.post<Vehicle>("/vehicles", body)`; memoize `personId` so retries do NOT re-submit it; map HTTP status → entry status using the table in contracts §2 ("Error mapping contract"); skip rows whose `vehicleType` is empty or whose `createVehicleSchema.safeParse` fails (leave them in `"draft"` with `fieldErrors` from Zod issues); throw if `submitAll` is called concurrently; on success transitions, call `queryClient.invalidateQueries({ queryKey: ["vehicles", tenantId, ownerKind, ownerId] })`. Adapter ports (`useTransport`, `useRole`, `useI18n`) MUST be the only seam to the host app — no `next/*`, no `react-i18next`, no `window.electron`.
- [X] T006 Implement `<InlineVehicleSection />` at `packages/features/src/shared/vehicle-form/inline-vehicle-section.tsx` per `contracts/inline-vehicle-section.md` §2. Props: `ownerKind`, `entries`, `onAddEntry`, `onRemoveEntry`, `onUpdateEntry`, `disabled?`, `sectionTitleKey?`. Behavior: return `null` when `ownerKind === "resident"` AND `useRole().role === "guard"` (FR-008 defense-in-depth gate); render section header from `vehicles.inline.sectionTitle` (visitor/provider) or `vehicles.inline.sectionTitleResident` (resident); render each entry by composing the existing `VehicleForm` field set (refactor a `<VehicleFields />` subcomponent out of `vehicle-form.tsx` if needed — do not duplicate field markup, per research §1); per-row right-rail UI varies by status (`"draft"|"error"` → remove button, `"saving"` → spinner, `"saved"` → "Saved" pill with plate text, read-only); render `entry.errorMessage` as a destructive-toned banner above row fields; render `entry.fieldErrors` per-field. MUST NOT import `next/*`, `"use client"`, or `react-i18next` directly.
- [X] T007 Wire the new exports into `packages/features/src/shared/vehicle-form/index.ts`: add `export { InlineVehicleSection } from "./inline-vehicle-section";`, `export { useInlineVehicleSubmissions } from "./use-inline-vehicle-submissions";`, and re-export the `InlineVehicleEntry` / `InlineVehicleEntryFields` / `InlineVehicleEntryStatus` / `OwnerKind` types from `inline-vehicle-types.ts`.
- [ ] T008 [P] Write the shared-component unit test at `packages/features/src/shared/vehicle-form/__tests__/inline-vehicle-section.test.tsx` covering: empty state shows only "Add" button; clicking add appends a draft row; updating fields calls `onUpdateEntry`; clicking remove on a `"draft"` row calls `onRemoveEntry`; remove is disabled while `"saving"`; `"saved"` row renders read-only pill; `"error"` row renders banner + field errors; role-gate returns `null` when `ownerKind === "resident"` AND role is `"guard"`; role-gate renders normally when `ownerKind === "resident"` AND role is `"admin"` or `"super_admin"`; role-gate ALWAYS renders when `ownerKind === "visitPerson"` (any role).
- [ ] T009 [P] Write the orchestration-hook unit test at `packages/features/src/shared/vehicle-form/__tests__/use-inline-vehicle-submissions.test.ts` covering: happy path with 2 entries (both POSTs fire sequentially, both flip to `"saved"`); single-entry failure (entry flips to `"error"`, `errorMessage` populated, `personId` retained); retry-after-partial-failure (saved entries are skipped on second `submitAll` call, only `"error"` rows re-fire, `personId` is reused — `POST /api/users` / `POST /api/visit-persons` is NOT re-issued because the orchestrator never calls those endpoints); concurrent-call rejection (throws when called while `isSubmittingAny` is true); empty-`vehicleType` rows skipped silently and remain in `"draft"`; 403 status maps to `"error"` with localized "forbidden" message; 409 status maps to `"error"` with `fieldErrors.plate`; cache invalidation called once per principal after `allSaved`.

**Checkpoint**: Foundation ready — `<InlineVehicleSection />` and `useInlineVehicleSubmissions` are exported, role-gated, validated against `createVehicleSchema`, and unit-tested. User story integrations can now begin in parallel.

---

## Phase 3: User Story 1 - Guard registers a visitor/provider with vehicle in one Save (Priority: P1) 🎯 MVP

**Goal**: Booth guards (and admins/super-admins) register a visitor or service-provider WITH a vehicle in a single Save action inside the existing right-side `Sheet`, and after save the access-event step opens with the just-created vehicle pre-selected when exactly one vehicle was inline-saved (FR-001, FR-003, FR-004, FR-005, FR-009).

**Independent Test**: From the desktop booth as a guard (or web `/visits-and-residents/visitors` / `/providers` as any role), open the create sidebar, fill visitor/provider fields + one inline vehicle row, press Save once, observe (a) visitor/provider exists, (b) vehicle exists tied to the visitor/provider, (c) access-event step opens with the new vehicle pre-selected. Repeat for providers (web + desktop). Repeat for the no-vehicle path and confirm no regression.

### Implementation for User Story 1 — Shared visitors module

- [X] T010 [US1] Edit `packages/features/src/visitors/components/visit-person-form.tsx` to render `<InlineVehicleSection />` below the existing field group when the form is in **create** mode (NOT in edit mode — see `data-model.md` §6 + research §9). Wire the section's `ownerKind="visitPerson"`, pass `entries` / `onAddEntry` / `onRemoveEntry` / `onUpdateEntry` from the orchestrator owned by the parent. Do NOT render the section in edit mode.
- [X] T011 [US1] Edit `packages/features/src/visitors/components/visit-person-sidebar.tsx` to instantiate `useInlineVehicleSubmissions()` at the sidebar level, pass its state into `VisitPersonForm`, and after a successful person create + `submitAll` resolution with `failed.length === 0` AND `saved.length === 1`, set the existing `justCreatedVehicleId` state to the saved vehicle's id so `AccessEventForm`'s vehicle picker pre-selects it on the next render. On `failed.length > 0`, KEEP the sidebar open and surface per-row errors (no toast spam — research §3). On sidebar close, call `orchestrator.reset()`.
- [X] T012 [US1] Edit the visitor-create handler in `packages/features/src/visitors/components/visitors-view.tsx` (`handleCreatePerson`) to: (1) call `useCreateVisitPerson` first; (2) on success, await `orchestrator.submitAll(visitPerson.id, "visitPerson")`; (3) branch on the partition (`saved` / `failed`) per the contract above. Do NOT delete the just-created visitor on partial failure (the spec's edge-case ruling).

### Implementation for User Story 1 — Web providers integration

- [X] T013 [P] [US1] Edit `apps/web/src/features/providers/components/provider-form.tsx` to render `<InlineVehicleSection />` with `ownerKind="visitPerson"` (providers ARE `visit_persons` rows; per `data-model.md` §1), threading entries from the orchestrator owned by the sidebar. Pattern mirrors T010 verbatim.
- [X] T014 [P] [US1] Edit `apps/web/src/features/providers/components/provider-sidebar.tsx` to instantiate `useInlineVehicleSubmissions`, thread state, set `justCreatedVehicleId` on single-vehicle success, and reset on close. Pattern mirrors T011 verbatim.
- [X] T015 [P] [US1] Edit `apps/web/src/features/providers/components/providers-page-client.tsx` (or whichever component owns `handleCreatePerson` for providers — verify path) to await `orchestrator.submitAll(provider.id, "visitPerson")` after the provider create resolves. Pattern mirrors T012 verbatim.

### Implementation for User Story 1 — Desktop providers integration

- [X] T016 [P] [US1] Edit `apps/desktop/src/features/providers/components/provider-form.tsx` symmetric with T013 — same component composition, but the host app injects the desktop transport (no outbox path: provider create is online-only per spec 013) and `react-i18next` adapter.
- [X] T017 [P] [US1] Edit `apps/desktop/src/features/providers/components/provider-sidebar.tsx` symmetric with T014.
- [X] T018 [P] [US1] Edit `apps/desktop/src/features/providers/components/providers-page-client.tsx` symmetric with T015.

### Tests for User Story 1

- [ ] T019 [US1] Update existing `packages/features/src/visitors/__tests__/visit-person-form.test.tsx` to assert that `<InlineVehicleSection />` renders in create mode and is hidden in edit mode (per the contract in T010). Re-use the existing test scaffolding; add cases without rewriting the file.
- [ ] T020 [P] [US1] Create `packages/features/src/visitors/__tests__/visitors-view-inline-vehicle.test.tsx` covering: full happy path — guard role, registers visitor with one inline vehicle, sidebar transitions to access-event step with the new vehicle pre-selected; partial failure — vehicle POST 409 leaves the visitor saved, the row in `"error"`, the sidebar OPEN; cancel after person-saved-then-vehicle-failed — closing the sidebar does NOT delete the visitor.
- [ ] T021 [P] [US1] Create `apps/web/src/features/providers/__tests__/provider-inline-vehicle.test.tsx`: provider create with one inline vehicle on the web; sidebar pre-selects the just-created vehicle in the access-event step.
- [ ] T022 [P] [US1] Create `apps/desktop/src/features/providers/__tests__/provider-inline-vehicle.test.tsx`: same as T021 but using the `react-i18next` adapter and the desktop transport. Validates the i18n adapter seam works on desktop too.

**Checkpoint**: User Story 1 is fully functional and independently testable — visitors and providers (web + desktop) all support inline-vehicle save with pre-select on success and partial-failure recovery.

---

## Phase 4: User Story 2 - Admin creates a resident with their vehicle(s) in one Save (Priority: P2)

**Goal**: Admins and super-admins onboard residents in the web Users catalog with one or more vehicles captured inline in the same right-side `Sheet`, and the existing draft-recovery (`useFormPersistence`) is extended to also persist inline-vehicle drafts (FR-002, FR-005, FR-010, FR-013).

**Independent Test**: As an admin on the web portal, open the Users create sidebar, set role = resident, fill resident fields, expand the inline vehicle section, add 2 vehicle rows, press Save, observe the resident exists with both vehicles attached. Repeat with role = admin / guard / super-admin (non-resident roles) and confirm the inline section is hidden. Reload the browser mid-form and confirm the inline drafts restore.

### Implementation for User Story 2

- [X] T023 [US2] Widen the type signature in `apps/web/src/shared/hooks/use-form-persistence.ts` (additive only) so the persisted snapshot accepts an `inlineVehicles?: InlineVehicleEntryFields[]` field alongside the existing `formData` shape. No new `localStorage` key — the inline drafts ride inside the existing `user-create` / `user-edit-<id>` snapshot per `data-model.md` §5. Persist ONLY `InlineVehicleEntryFields` (no `status` / `vehicleId` / `errorMessage` / `fieldErrors`).
- [X] T024 [US2] Edit `apps/web/src/features/users/components/user-form.tsx` to render `<InlineVehicleSection />` with `ownerKind="resident"` and `sectionTitleKey="vehicles.inline.sectionTitleResident"` ONLY when `formData.role === "resident"`. Wire `entries` / handlers from the orchestrator owned by `UserSidebar`. Wire the persistence: pass `useFormPersistence`'s restored `inlineVehicles` to seed the orchestrator's initial entries, and call `onDraftChange` whenever the orchestrator emits an updated entries list (drop status/errors before persisting).
- [X] T025 [US2] Edit `apps/web/src/features/users/components/user-sidebar.tsx` to instantiate `useInlineVehicleSubmissions`, thread state into `UserForm`, and rewire `handleSubmit` to: (1) call `useCreateUser`; (2) on success, await `orchestrator.submitAll(user.id, "resident")`; (3) close the sidebar only when `failed.length === 0`, else keep it open. On close, call `orchestrator.reset()` AND clear the persisted draft snapshot via the existing `useFormPersistence` clear path.

### Tests for User Story 2

- [ ] T026 [US2] Create `apps/web/src/features/users/__tests__/user-form-inline-vehicle.test.tsx` covering: role=resident → section renders; role=admin / guard / super-admin → section hidden; admin fills resident + 2 vehicles → user is POSTed once and 2 vehicle POSTs fire sequentially with the new user's id; partial-failure path — first vehicle 409, user record persists, sidebar stays open, fixing the plate and re-pressing Save retries ONLY the failing row and does NOT re-create the user (load-bearing for FR-007).
- [ ] T027 [US2] Add a draft-recovery test (either in the same file as T026 or co-located in `apps/web/src/shared/hooks/__tests__/use-form-persistence.test.tsx` if one exists) covering: type into 2 inline vehicle rows, simulate reload (re-mount with the same `localStorage`), confirm rows restore as `"draft"` with field values intact and `vehicleId` / `status` / errors NOT restored.

**Checkpoint**: User Story 2 is fully functional — residents created on the web portal can include inline vehicles, the inline section is correctly gated to `role === "resident"`, and draft recovery works end-to-end.

---

## Phase 5: User Story 3 - Guards cannot inline-create vehicles for residents (Priority: P1)

**Goal**: Confirm the security invariant — a guard role cannot reach an inline vehicle entry on a resident person, neither via the UI nor via a direct API call. UI hide is defense-in-depth on top of the API-level `ForbiddenException` already in `VehiclesService.create` (FR-008, FR-009 — already partially covered structurally by Phase 2's role-gate inside `<InlineVehicleSection />`; this phase adds explicit verification).

**Independent Test**: As a guard, attempt to reach the user create sidebar with role = resident — confirm the inline section does not render. Issue a direct `POST /api/vehicles` with `ownerType: "user"` as a guard — confirm 403. As a guard on the visitor create sidebar — confirm the inline section DOES render and the vehicle save succeeds.

### Implementation for User Story 3

- [ ] T028 [US3] Add a guard-vs-resident integration case to `apps/web/src/features/users/__tests__/user-form-inline-vehicle.test.tsx` (the file created in T026): mount `UserSidebar` with the actor role mocked to `"guard"`, attempt to set role = resident, assert `<InlineVehicleSection />` is NOT in the DOM (defense in depth — the parent gate `formData.role === "resident"` may or may not render; the inner gate must also block).
- [ ] T029 [US3] Add a guard-on-visit-person integration case to `packages/features/src/visitors/__tests__/visitors-view-inline-vehicle.test.tsx` (the file created in T020): mount with actor role `"guard"`, ownerKind effectively `"visitPerson"`, assert the inline section IS rendered and a vehicle row can be added and saved (this validates FR-009 — guards CAN inline-add for visitors).
- [ ] T030 [US3] Verify the existing API safety net stays green: run `pnpm test --filter @ramcar/api -- --testPathPattern vehicles.service` and confirm the existing `403`-on-guard-resident-vehicle test in `apps/api/src/modules/vehicles/__tests__/vehicles.service.spec.ts` (or wherever it lives in the current code — locate via `grep -R "ForbiddenException" apps/api/src/modules/vehicles/`) passes. Do NOT add new API tests — this spec adds zero API code; the existing test is the load-bearing API-level half of FR-008.

**Checkpoint**: User Story 3's security invariant is validated at three layers (parent role-gate in `UserForm`, child role-gate inside `<InlineVehicleSection />`, API `ForbiddenException`). All three user stories are now independently functional and verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cross-cutting verification — optional E2E, lint/typecheck/tests, manual quickstart pass.

- [ ] T031 [P] Optional Playwright happy-path test at `apps/web/e2e/inline-vehicle-create.spec.ts` covering: open visitors page → register a visitor with one inline vehicle → assert access-event step is reached with the vehicle pre-selected. Marked optional per research §9 because the Vitest integration tests already exercise the same path at the component layer; skip if E2E budget is constrained.
- [ ] T032 Run the full validation suite from the repo root: `pnpm lint && pnpm typecheck && pnpm test && (pnpm --filter @ramcar/web test:e2e -- --grep "inline vehicle" || true)`. All must be green except the optional E2E if T031 was skipped.
- [ ] T033 Walk through the quickstart manual verification at `specs/025-inline-vehicle-create/quickstart.md` end-to-end on a local dev stack (`pnpm db:start` + `pnpm dev`). Sections 1 (visitor + vehicle, desktop guard), 3 (resident + 2 vehicles, web admin), 4 (partial failure with plate conflict), 5 (guard role gate), 6 (no-vehicle regression check), and 7 (web draft recovery) MUST all behave as documented.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (i18n keys must exist for T006/T008). BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2 / US3.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of US1 / US3 — can run in parallel with Phase 3 if staffed.
- **User Story 3 (Phase 5)**: Depends on Foundational AND on at least the `UserForm` integration in T024 (for T028) AND the visitors integration in T012 (for T029). T030 has no code dependency — it is verification of an existing API test.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- Form/component edits before integration tests (the tests need the integrations to exist).
- Sidebar edits depend on the matching form edit (Sidebar owns the orchestrator and threads state into the form).
- The `handleCreatePerson` / `handleSubmit` page-client edit depends on the matching sidebar edit (the page client triggers the orchestrator owned by the sidebar via callback chain).

### Parallel Opportunities

- T002, T003 in Phase 1 are parallel with T001 (T001 sets up the canonical en.json keys; the others mirror).
- T008, T009 in Phase 2 are parallel with each other (different test files, no production-code dependency between them once T004–T007 are done).
- T013–T015 (web providers) and T016–T018 (desktop providers) and T010–T012 (shared visitors) in Phase 3 are three INDEPENDENT integration paths and can run in parallel by three contributors. Within each path, sidebar/form/page-client are sequential.
- T020, T021, T022 in Phase 3 are three independent test files — fully parallel once their respective integrations land.
- T026, T027 in Phase 4 are parallel with T028 in Phase 5 (different scenarios in the same test file or sibling files).

### Suggested MVP Scope

User Story 1 (Phase 1 + Phase 2 + Phase 3) alone delivers the highest-value path called out in the spec: booth guards register vehicle-borne visitors and providers in a single Save without screen transitions. SC-001, SC-002, SC-005, and SC-006 are all measurable from US1 alone. US2 and US3 add the resident path and the security invariant respectively and can ship in subsequent increments.

---

## Parallel Example: Phase 3 — User Story 1 dispatch

```bash
# Three independent integration paths can run in parallel after Phase 2 is green:

# Track A — Shared visitors (sequential within track):
Task: "Edit visit-person-form.tsx to render <InlineVehicleSection /> in create mode (T010)"
Task: "Edit visit-person-sidebar.tsx threading orchestrator state (T011)"
Task: "Edit visitors-view.tsx handleCreatePerson to drive submitAll (T012)"

# Track B — Web providers (sequential within track):
Task: "Edit web provider-form.tsx (T013)"
Task: "Edit web provider-sidebar.tsx (T014)"
Task: "Edit web providers-page-client.tsx (T015)"

# Track C — Desktop providers (sequential within track):
Task: "Edit desktop provider-form.tsx (T016)"
Task: "Edit desktop provider-sidebar.tsx (T017)"
Task: "Edit desktop providers-page-client.tsx (T018)"

# Tests for all three tracks fan out in parallel once each track is integrated:
Task: "Create visitors-view-inline-vehicle.test.tsx (T020)"
Task: "Create web provider-inline-vehicle.test.tsx (T021)"
Task: "Create desktop provider-inline-vehicle.test.tsx (T022)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup — i18n keys land first so the shared component has labels.
2. Complete Phase 2: Foundational — `<InlineVehicleSection />` + `useInlineVehicleSubmissions` exported, role-gated, unit-tested.
3. Complete Phase 3: User Story 1 — visitors + providers (web + desktop) consume the shared module.
4. **STOP and VALIDATE**: Walk through quickstart §1 (desktop guard registers visitor) and §2 (web admin registers provider).
5. Deploy / demo as MVP — booth flow already shows the win.

### Incremental Delivery

1. Phase 1 + Phase 2 → foundation ready.
2. Phase 3 → MVP, ship to booth users.
3. Phase 4 → resident onboarding parity for admins (web), ship next.
4. Phase 5 → explicit security verification (largely a test-only phase since the gate already lives in the shared component).
5. Phase 6 → final smoke + quickstart pass before a clean merge.

### Parallel Team Strategy

With multiple contributors after Phase 2 lands:

- Contributor A: User Story 1 — shared visitors track (T010 → T011 → T012, then T020).
- Contributor B: User Story 1 — web providers track (T013 → T014 → T015, then T021).
- Contributor C: User Story 1 — desktop providers track (T016 → T017 → T018, then T022).
- Contributor D: User Story 2 — resident path (T023 → T024 → T025, then T026, T027).

Tests within a story merge independently because the test files are co-located with each integration.

---

## Notes

- [P] tasks = different files, no incomplete dependency on the same path.
- Each user story's tests live next to its integration files so a story merge does not stall on tests in another story's directory.
- All vehicle writes go through the existing `POST /api/vehicles` endpoint — Constitution Principle VIII (API-First Data Access) is preserved. No frontend file may add `supabase.from()` / `.rpc()` / `.storage` calls for vehicles or persons.
- The shared module MUST NOT import `next/*`, `"use client"`, `react-i18next`, `window.electron`, or any concrete i18n / transport library — adapter ports (`useI18n`, `useTransport`, `useRole`) are the only seam.
- The orchestrator's `personId` memoization is the load-bearing mechanism for FR-007 (no duplicate person on retry). Tests T009 and T026 must explicitly cover the retry-without-recreate path.
- No DB migrations, no schema changes, no new Zod schemas, no new API endpoints. If a task tempts you to add one, escalate — it indicates a misread of the design.
- Commit in user-story chunks (one per phase) so a partial revert can roll a story back without unwinding the others.
