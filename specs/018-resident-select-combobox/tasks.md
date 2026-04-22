---
description: "Task list for 018-resident-select-combobox implementation"
---

# Tasks: Resident Select Combobox

**Input**: Design documents from `/specs/018-resident-select-combobox/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/residents-api.md, contracts/resident-select-ui.md, quickstart.md

**Tests**: Tests ARE requested for this feature. Spec FR-015 mandates unit coverage for the picker, and the backend resolver endpoint requires its own Jest suite (happy path, 404, tenant isolation). All test tasks below are therefore in scope.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All file paths are absolute or repo-root-relative

## Path Conventions

- Shared picker: `packages/features/src/shared/resident-select/`
- Shared i18n catalog: `packages/i18n/src/messages/`
- API module: `apps/api/src/modules/residents/`
- Web/desktop consumers: unchanged — verified via typecheck and manual checks, NOT edited

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working environment is ready before touching code. No new project scaffolding is required — all packages/modules already exist.

- [X] T001 Confirm the workspace is on branch `018-resident-select-combobox` and `pnpm install` completes cleanly at repo root
- [X] T002 [P] Run `pnpm --filter @ramcar/features build` to confirm the shared package currently builds green (baseline)
- [X] T003 [P] Run `pnpm typecheck` at repo root to capture a green baseline before any refactor

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the shared i18n catalog and add the backend resolver endpoint — both are required by multiple user stories (US1, US3, US4) and must be in place before the picker can be rewritten.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### i18n catalog extension (FR-009, research R7)

- [X] T004 [P] Add `residents.select.placeholder`, `residents.select.searchPlaceholder`, `residents.select.empty`, `residents.select.loading`, `residents.select.error`, `residents.select.ariaLabel` keys to `packages/i18n/src/messages/en.json` (searchPlaceholder MUST NOT mention address per FR-004)
- [X] T005 [P] Add the same `residents.select.*` keys with Spanish translations to `packages/i18n/src/messages/es.json`
- [X] T006 [P] Mirror the new keys in `packages/i18n/src/messages/en.ts` and `packages/i18n/src/messages/es.ts` type exports so the message catalog remains type-safe
- [X] T007 Run `pnpm --filter @ramcar/i18n build` (or `pnpm typecheck --filter @ramcar/i18n`) to confirm the catalog additions compile

### Backend resolver endpoint (FR-008, contracts/residents-api.md §2)

- [X] T008 Add `getById(id: string, actorUser, tenantId: string): Promise<ExtendedUserProfile>` to `apps/api/src/modules/residents/residents.service.ts` that delegates to `UsersService.getById` and asserts `profile.role === "resident"` (throw `NotFoundException` otherwise, per contract — do not leak non-resident profiles)
- [X] T009 Add a `@Get(":id")` handler to `apps/api/src/modules/residents/residents.controller.ts` guarded by the existing `JwtAuthGuard + TenantGuard + RolesGuard` with `@Roles("super_admin", "admin", "guard")`, extracting `@CurrentTenant()` and `@CurrentUser()`, delegating to `ResidentsService.getById`
- [X] T010 [P] Add unit/integration tests for the resolver under `apps/api/src/modules/residents/__tests__/residents.controller.spec.ts` (or equivalent existing test file) covering: (a) happy path returns `ExtendedUserProfile`, (b) `404` when id does not exist, (c) `404` when id belongs to a different tenant, (d) `404` when profile exists but `role !== "resident"`, (e) resolver returns inactive residents (the picker must still render their name)
- [X] T011 Run `pnpm --filter @ramcar/api test -- residents` (or the repo's equivalent) to confirm the resolver suite passes

**Checkpoint**: Foundation ready — i18n keys exist and `GET /residents/:id` is live. All user stories may now proceed.

---

## Phase 3: User Story 1 - Pick a resident from a searchable combobox (Priority: P1) 🎯 MVP

**Goal**: Replace the current "input + plain Select" with a single-trigger Popover + Command picker backed by the existing `GET /residents` list query so users can click once, see a list, and narrow via search.

**Independent Test**: Render `<ResidentSelect value="" onChange={fn} />` in the existing visitor create form (or via `renderWithHarness`), click the trigger, verify the popover opens with a list and a search input, type 2–3 characters, verify the list narrows, select a resident, verify `onChange(residentId)` is called and the trigger displays the resident's name.

### Implementation for User Story 1

- [X] T012 [US1] Rewrite `packages/features/src/shared/resident-select/index.tsx` using `Popover` + `Command` + `CommandInput` + `CommandList` + `CommandEmpty` + `CommandItem` from `@ramcar/ui`, modeled on `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx`; public props stay `{ value, onChange, placeholder? }` plus additive optional `{ disabled?, ariaLabel?, id? }` (per contracts/resident-select-ui.md)
- [X] T013 [US1] Wire trigger label rendering: show `fullName` (and `— address` when the resident has one) from the currently-resolved resident, fall back to `placeholder` prop, fall back to `t("residents.select.placeholder")` when unbound (FR-002)
- [X] T014 [US1] Wire the list `useQuery` with key `["residents", tenantId, "select", debouncedSearch]` calling `useTransport().get("/residents", { params: { search: debouncedSearch || undefined, status: "active", page: 1, pageSize: 50, sortBy: "full_name", sortOrder: "asc" } })`; set `filter={() => 1}` on `Command` so the server is authoritative (research R2, R3, R4)
- [X] T015 [US1] Wire select-on-click: `CommandItem` `onSelect` calls `onChange(resident.id)`, clears local `search`, and closes the popover (FR-006)
- [X] T016 [US1] Wire `useI18n().t(...)` for trigger placeholder, search input placeholder, and combobox `aria-label` (FR-009); verify search placeholder does NOT mention address (FR-004)
- [X] T017 [P] [US1] Add unit tests in `packages/features/src/shared/resident-select/resident-select.test.tsx` using `renderWithHarness`: (a) trigger renders placeholder when `value === ""`, (b) trigger renders the bound resident's name when the resident is in the current list page, (c) clicking the trigger opens the popover with a search input and a list populated from the mocked transport, (d) selecting a `CommandItem` calls `onChange(residentId)` and closes the popover (matches FR-015 items a/b/c/e)

**Checkpoint**: At this point, User Story 1 is fully functional — a user can click the picker, see residents, and pick one. The picker still does not search server-side (US2) or resolve saved ids on edit (US3 FR-008). Those land in Phases 4 and 5.

---

## Phase 4: User Story 2 - Search the entire roster, not just the visible page (Priority: P1)

**Goal**: Typing in the search input issues a single debounced `GET /residents?search=…` request and surfaces residents that were NOT in the initial list. No request ever exceeds `pageSize: 50`.

**Independent Test**: In the test harness, configure `transport.get` so that `/residents` returns a fixed initial page NOT containing "Zacarías Ortega" when called without `search`, and returns "Zacarías Ortega" when called with `search=zaca`. Render the picker, open it, type `zaca`. Assert exactly one request is made with `search=zaca` and that `"Zacarías Ortega"` appears in the list.

### Implementation for User Story 2

- [X] T018 [US2] Add local `search` (every keystroke) and `debouncedSearch` (300ms `useEffect` timer) state to `packages/features/src/shared/resident-select/index.tsx`; `debouncedSearch` is the only `search` value that participates in the React Query key (SC-002, research R3)
- [X] T019 [US2] Ensure the list query (from T014) is driven by `debouncedSearch` so successive keystrokes within the debounce window collapse into a single request; verify the debounce timer is cleared on unmount and when `search` changes (research R3, Edge Case "Rapid typing")
- [X] T020 [US2] Render empty/loading/error states inside the popover per contracts/resident-select-ui.md §Rendered shape: `t("residents.select.empty")` when zero results and not loading, `t("residents.select.loading")` while the list query is pending and no cached data exists, `t("residents.select.error")` on error (FR-013 — US4 overlaps here but the primitive strings are wired in US2 to keep the popover usable across states; deeper error-state polish is validated in US4)
- [X] T021 [US2] Explicitly verify the picker does NOT render a "create new resident" affordance anywhere in the popover (FR-012)
- [X] T022 [P] [US2] Add a unit test in `packages/features/src/shared/resident-select/resident-select.test.tsx` asserting that typing `zaca` issues exactly one transport call containing `params.search === "zaca"` after ~350ms, and that a resident NOT in the initial unfiltered response appears in the list after the search response arrives (FR-015 item d, direct US2 evidence)
- [X] T023 [P] [US2] Add a unit test asserting the empty-state string renders when the transport returns `{ data: [], meta: {...} }` and no "create new" row is present (FR-015 item f, FR-012)
- [X] T024 [P] [US2] Add a unit test asserting clearing the search input back to empty issues a new unfiltered request (no `search` param) and the picker returns to the initial list (Acceptance Scenario US2-4)

**Checkpoint**: Search-as-you-type works against the full roster via the server. A user at a 2,500-resident tenant can reach any resident by typing. The initial-browse behavior from US1 remains intact.

---

## Phase 5: User Story 3 - Drop-in replacement for the existing component (Priority: P1)

**Goal**: All four existing consumers (`visit-person-form`, `visit-person-edit-form`, `provider-form`, `provider-edit-form`) continue to compile and work without call-site edits; edit-mode forms display the bound resident's name on first paint via the new `GET /residents/:id` resolver.

**Independent Test**: Run `pnpm typecheck` — confirm no existing consumer requires a code change. Render the picker with `value={savedId}` where `savedId` is NOT in the initial list page; confirm the trigger displays the resident's resolved name without the user opening the popover, and that a single `GET /residents/:id` request fires.

### Implementation for User Story 3

- [X] T025 [US3] Add the resolver `useQuery` to `packages/features/src/shared/resident-select/index.tsx` with key `["residents", tenantId, "detail", value]`, `enabled: Boolean(value && !currentPageContains(value))`, calling `useTransport().get(\`/residents/${value}\`)` (research R5, FR-008)
- [X] T026 [US3] Extend the trigger-label resolver logic from T013 to also consider the resolver query's `data` when the current list page does not contain `value`; on resolver `404` or other error, fall back to the localized placeholder without blocking form submission (Edge Case "saved resident no longer in the active roster")
- [X] T027 [US3] Add an abort/stale-response guard: ensure an in-flight list or resolver response whose popover has since closed or whose query key has since changed does not update component state (FR-014, Edge Case "Popover dismissed mid-flight") — TanStack Query gives this for free via cache keys, but add an explicit test in T030
- [X] T028 [P] [US3] Add a unit test asserting the trigger renders the resolved resident name when `value` is bound and the resident is NOT in the current list page, and that exactly one `/residents/:id` call is made (FR-015 item b extended, FR-008, Acceptance Scenario US3-2)
- [X] T029 [P] [US3] Add a regression-guard unit test that exercises BOTH existing call shapes — `<ResidentSelect value={id} onChange={fn} />` and `<ResidentSelect value={id} onChange={fn} placeholder="…" />` — and asserts identical behavior (FR-015 item g, SC-003)
- [X] T030 [P] [US3] Add a unit test asserting that unmounting the picker mid-flight (or closing the popover with a pending search) does not produce a stale state update / act warning (FR-014)
- [X] T031 [US3] Run `pnpm typecheck` at repo root and confirm `apps/web/src/features/providers/components/provider-form.tsx`, `apps/web/src/features/providers/components/provider-edit-form.tsx`, `packages/features/src/visitors/components/visit-person-form.tsx`, and `packages/features/src/visitors/components/visit-person-edit-form.tsx` compile unchanged
- [X] T032 [US3] Run `pnpm check:shared-features` to confirm no per-app duplicate of the picker has been introduced under `apps/web/src/features/**/resident-select*` or `apps/desktop/src/features/**/resident-select*` (FR-011)

**Checkpoint**: The four existing consumers work unchanged. Edit-mode forms paint the saved resident's name on first render. The picker is still authored exactly once in `@ramcar/features`.

---

## Phase 6: User Story 4 - Loading and error feedback (Priority: P2)

**Goal**: A slow or failing residents request produces a clear loading indicator and a localized error, rather than an ambiguous empty list.

**Independent Test**: Render with a transport whose `get` delays 1s → confirm the popover shows the loading caption in the list area. Render with a transport whose `get` rejects → confirm the popover shows the localized error caption and the search input remains usable.

### Implementation for User Story 4

- [X] T033 [US4] Verify/refine the loading-state rendering inside `packages/features/src/shared/resident-select/index.tsx`: when the list query is pending AND no cached data is available, render a non-selectable loading row using `t("residents.select.loading")`, visually distinct from the empty state (FR-013, Acceptance Scenario US4-1)
- [X] T034 [US4] Verify/refine the error-state rendering: when the list query has errored, render a non-selectable error caption using `t("residents.select.error")` (no raw error stacks); the search input must remain usable so the user can retry by typing a new query (FR-013, Acceptance Scenario US4-2)
- [X] T035 [P] [US4] Add a unit test that configures the transport to delay its response and asserts the loading caption renders before the response arrives and then clears
- [X] T036 [P] [US4] Add a unit test that configures the transport to reject and asserts the error caption renders with the localized string, the search input is still interactive, and re-typing triggers a new request

**Checkpoint**: All four user stories are independently functional. The picker behaves correctly across happy, loading, error, and edit-mode-with-unknown-id cases.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, cleanup, and live-stack validation across both host apps.

- [X] T037 [P] Run `pnpm --filter @ramcar/features test` and confirm all new/existing tests in `resident-select.test.tsx` pass (FR-015 coverage ≥ parity with `vehicle-brand-select.test.tsx`, SC-006)
- [X] T038 [P] Run `pnpm --filter @ramcar/api test` and confirm the resolver endpoint tests (T010) pass
- [X] T039 [P] Run `pnpm lint` at repo root; fix any lint findings in the files touched by this feature
- [X] T040 [P] Run `pnpm typecheck` at repo root; must be green
- [X] T041 Remove any now-unused helpers from the old `resident-select` implementation (e.g., previous standalone `Input` + `Select` wiring); do NOT create compatibility shims — the public prop contract is preserved verbatim
- [ ] T042 Walk through `specs/018-resident-select-combobox/quickstart.md` manual checks A–D (web small tenant, web edit mode, web large-tenant edge case, desktop guard booth) and confirm each check's expected behavior; in particular, verify via DevTools Network that typing produces at most one request per 300ms window (SC-002) and initial `pageSize=50` (SC-005)
- [ ] T043 Verify the empty `Complexity Tracking` section of `plan.md` is still accurate (no constitution violations introduced during implementation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories** — the picker cannot render without the new i18n keys (US1), and edit-mode resolution cannot work without `GET /residents/:id` (US3).
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)**: Depends on US1 (shares the picker component and list query).
- **US3 (Phase 5)**: Depends on Foundational + US1. May run in parallel with US2 if a second developer owns the resolver wiring, but both touch `index.tsx`, so in practice US2 → US3 sequentially.
- **US4 (Phase 6)**: Depends on US1 (touches the same component's list-query states). The loading/empty/error primitives are scaffolded in US2 (T020); US4 is the focused polish pass.
- **Polish (Phase 7)**: Depends on all desired user stories.

### User Story Independence Notes

- **US1** is independently demoable — a picker that opens, shows an initial list, and commits a selection is the MVP.
- **US2** depends on US1's component skeleton but is independently testable via the mocked-transport search test (Phase 4 Independent Test above).
- **US3** depends on US1's component skeleton but the resolver + regression-guard tests can be authored on top of US1 without US2 landed. In practice US1 → US2 → US3 is the cleanest serial order given they all mutate the same `index.tsx`.
- **US4** depends only on US1 and targets the loading/error display code path.

### Within Each User Story

- Rewriting `index.tsx` (T012) blocks all downstream tasks in US1 since every later task reads or mutates it.
- T014 (list query) blocks T015 (commit on select) and T018–T019 (debounce wiring in US2) and T025 (resolver wiring in US3).
- Tests marked [P] within a story can run in parallel because they are independent cases inside the same test file — but if you author them in a single sitting, a shared `beforeEach` is more economical.

### Parallel Opportunities

- T004–T006 (i18n catalog: en.json, es.json, `.ts` type mirrors) touch different files → safe in parallel.
- T010 (api resolver tests) is in the api module and runs parallel to any `@ramcar/features` work in US1.
- T017, T022, T023, T024, T028, T029, T030, T035, T036 all live in the same single test file (`resident-select.test.tsx`). They are [P]-marked for "no cross-file dependency", but if two agents edit the same file simultaneously you will need to serialize writes or split into sub-suites.
- T037, T038, T039, T040 (test / lint / typecheck runs) are independent commands → safe in parallel.

---

## Parallel Example: Foundational phase

```bash
# Four catalog + backend tracks can land in parallel:
Task T004: "Add residents.select.* keys to packages/i18n/src/messages/en.json"
Task T005: "Add residents.select.* keys to packages/i18n/src/messages/es.json"
Task T008: "Add ResidentsService.getById in apps/api/src/modules/residents/residents.service.ts"
Task T010: "Add resolver controller tests in apps/api/src/modules/residents/__tests__/residents.controller.spec.ts"
```

## Parallel Example: US1 implementation + tests

```bash
# After T012–T016 are done, tests can be authored in a single sitting:
Task T017: "Unit tests: trigger placeholder, trigger bound name, open popover, commit on select"

# In parallel, US2 debounce work (T018–T019) can start since it edits the same component
# but is logically layered on top of T014's list query.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 Setup (sanity checks).
2. Complete Phase 2 Foundational — in particular T004–T007 (i18n). The resolver endpoint (T008–T011) is not strictly required for the MVP of US1, but it is required for US3; landing it together keeps the API surface consistent.
3. Complete Phase 3: US1 (T012–T017).
4. **STOP and VALIDATE**: render the picker in the visitor create form, click it, pick a resident. Ship-able as an interim checkpoint internally (NOT user-visible yet — US2/US3 also must land before release because the four existing consumers depend on the same component file).

### Incremental Delivery

Because all four consumers import from `index.tsx`, US1 → US2 → US3 must land as a single logical slice before the refactor can ship. US4 can ship alongside or immediately after. A reasonable PR breakdown:

1. **PR 1 (Foundational)**: T004–T011 — i18n keys + resolver endpoint + its tests. Mergeable standalone.
2. **PR 2 (Picker refactor)**: T012–T032 — US1 + US2 + US3 landed together in `index.tsx`. Mergeable when typecheck, picker tests, and `pnpm check:shared-features` all pass.
3. **PR 3 (Polish)**: T033–T043 — US4 refinement + quickstart walkthrough. Mergeable once PR 2 is in.

### Parallel Team Strategy

- Developer A: Foundational i18n (T004–T007).
- Developer B: Foundational backend (T008–T011).
- After Foundational merges, Developer A takes US1 + US2, Developer B takes US3 (once US1 skeleton is pushed, US3 resolver work can proceed on a branch off US1). Because all three stories write to the same `index.tsx`, the final landing is serialized regardless of concurrent authoring.

---

## Notes

- [P] tasks = different files OR independent within the same file with no ordering constraints.
- [Story] label maps each task to its user story for traceability against spec.md.
- Existing consumers (`visit-person-form`, `visit-person-edit-form`, `provider-form`, `provider-edit-form`) MUST NOT be edited. Any task that requires editing a consumer indicates the prop contract was broken (SC-003, FR-007) — stop and revisit.
- Do NOT introduce a per-app duplicate under `apps/web/src/features/**` or `apps/desktop/src/features/**`. `pnpm check:shared-features` is the CI guard.
- Do NOT add a "create new resident" affordance (FR-012).
- Do NOT accept `tenantId` as a prop (FR-010); use `useRole().tenantId` for the React Query key only.
- Do NOT add `pageSize` or `debounceMs` props (keeps the public contract minimal — research R3).
- Do NOT advertise address search in any placeholder or help text (FR-004, spec clarification 2026-04-21).
- Verify each user-story checkpoint before starting the next; all four stories touch the same component file and cross-story regressions are the primary risk.
