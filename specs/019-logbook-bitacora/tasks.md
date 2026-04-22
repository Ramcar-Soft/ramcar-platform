# Tasks: Access Log (Bitácora) — Admin/SuperAdmin Logbook

**Input**: Design documents from `/specs/019-logbook-bitacora/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅ (access-events-list.md, access-events-export.md, logbook-ui.md), quickstart.md ✅

**Tests**: INCLUDED. The feature spec and plan explicitly call for Jest + ts-jest tests in `apps/api`, Vitest + `@testing-library/react` tests in `apps/web`, and Zod schema tests in `@ramcar/shared`. Test files are listed in `quickstart.md` and are tracked as explicit tasks below. Playwright E2E is listed as optional/recommended — included in Polish phase.

**Organization**: Tasks are grouped by user story so each story can be implemented, reviewed, and demoed independently. Priority order follows spec.md: US1–US4 (P1) → US5–US8 (P2) → US9–US10 (P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, ...) — set on story-phase tasks only
- All paths are absolute-relative to repo root (e.g., `apps/web/src/features/logbook/...`)

## Path Conventions (from plan.md)

- Frontend feature slice: `apps/web/src/features/logbook/`
- Frontend routes: `apps/web/src/app/[locale]/(dashboard)/logbook/`
- Backend module (extend, do not create new): `apps/api/src/modules/access-events/`
- Shared types/validators: `packages/shared/src/types/access-event.ts`, `packages/shared/src/validators/access-event.ts`
- Shared i18n: `packages/i18n/src/messages/{en,es}.json`
- DB migrations: `supabase/migrations/`
- DB types: `packages/db-types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new feature directory and test folders. No business logic yet.

- [X] T001 Create `apps/web/src/features/logbook/` directory tree with empty `components/`, `hooks/`, `types/`, `__tests__/` subfolders and an `index.ts` stub
- [X] T002 Create `apps/api/src/modules/access-events/__tests__/` directory (for new controller/service/repository specs) — the module currently has no `__tests__` folder

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, shared contracts, download helper, and translations — everything every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database & generated types

- [X] T003 Create migration file `supabase/migrations/2026042200000X_add_logbook_support.sql` — scaffold with header comment and empty body (actual SQL in T004/T005)
- [X] T004 Add `ALTER TABLE public.tenants ADD COLUMN time_zone text NOT NULL DEFAULT 'UTC';` to `supabase/migrations/2026042200000X_add_logbook_support.sql` (research R3)
- [X] T005 Add `CREATE OR REPLACE FUNCTION public.search_access_events(...)` RPC (per `contracts/access-events-list.md` § Search implementation) plus `GRANT EXECUTE ... TO authenticated;` to the same migration file (research R8)
- [X] T006 Apply migration locally with `pnpm db:migrate:dev` and regenerate types with `pnpm db:types` (updates `packages/db-types/`)

### Shared Zod schemas and types (blocking for API + Web)

- [X] T007 [P] Extend `packages/shared/src/types/access-event.ts` — add `AccessEventListItem`, `AccessEventListResponse` interfaces (per `data-model.md` § Read-only projection)
- [X] T008 [P] Add `LOGBOOK_CSV_LABELS` constant (en + es column headers + enum labels) to `packages/shared/src/types/access-event.ts` (research R9)
- [X] T009 Extend `packages/shared/src/validators/access-event.ts` — add `accessEventListQuerySchema` and `accessEventExportQuerySchema` (per `data-model.md` § Query shape). Depends on T007 (shared types).
- [X] T010 Re-export the new schemas + types from `packages/shared/src/index.ts` — append `export * from "./types/access-event"` and `export * from "./validators/access-event"` entries if not already present
- [X] T011 [P] Write validator tests in `packages/shared/src/validators/access-event.test.ts` — cover: required `personType`, `pageSize` enum, `dateFrom > dateTo` rejection (beyond-schema check noted in data-model.md), `locale` default, `search` trim/max-length

### Frontend download helper (blocking for export tasks)

- [X] T012 Extend `apps/web/src/shared/lib/api-client.ts` — add `download(path, options)` method returning `{ blob, filename }` per `contracts/access-events-export.md` § Frontend download helper. Parses `Content-Disposition` filename, asserts `text/csv` content-type.

### i18n (blocking for every UI task — FR-038: no hardcoded strings)

- [X] T013 [P] Add `logbook.*` key group to `packages/i18n/src/messages/en.json` per `contracts/logbook-ui.md` § i18n keys (title, tabs, toolbar, presets, columns, direction, mode, status, empty, error, pagination, export)
- [X] T014 [P] Add same `logbook.*` key group in Spanish to `packages/i18n/src/messages/es.json`

**Checkpoint**: Foundation ready. All user-story phases can now start in parallel (if staffed) or sequentially in priority order.

---

## Phase 3: User Story 1 — Admin browses today's Visitor logbook (Priority: P1) 🎯 MVP

**Goal**: Admin of Tenant A opens `/logbook`, is redirected to `/logbook/visitors`, and sees today's visitor events for their tenant (25 rows, most recent first) with the full visitors column set and working pagination. No cross-tenant rows appear.

**Independent Test**: Sign in as Admin of Tenant A that has ≥25 visitor events today. Navigate to `/logbook`. Verify redirect to `/logbook/visitors`, row count, column headers, and pagination controls. Confirm Tenant B's events are absent.

### Backend (list endpoint — no-search path)

- [X] T015 [US1] Create `apps/api/src/modules/access-events/dto/list-access-events.dto.ts` — re-export `accessEventListQuerySchema` as the DTO used by the Zod validation pipe
- [X] T016 [US1] Extend `apps/api/src/modules/access-events/access-events.repository.ts` — add `list(filters, scope)` method that accepts `{ kind: "single"|"many", tenantId(s) }` and returns `{ data: AccessEventListItem[], total: number }`. Uses Supabase `.from("access_events").select(...)` with embedded joins for `visit_persons`, `profiles` (guard), `profiles` (resident), `vehicles`, and `tenants` (for `tenantName` in many-mode). Implements pagination via `.range(offset, offset+limit-1)` + `{ count: "exact" }`. Filters on `person_type`, `tenant_id(s)`, `created_at` range. Ordered by `created_at DESC`. No-search path only (search path added in US3).
- [X] T017 [US1] Extend `apps/api/src/modules/access-events/access-events.service.ts` — add `resolveTenantScope(actorRole, actorTenantId, requestedTenantId, authorizedTenantIds?)` helper per contract § Role-based tenant scoping; add `list(query, actorUser)` method that resolves scope + date defaults (today in tenant zone, fetched from `tenants.time_zone`) and calls the repository. Throws `ForbiddenException` on Admin cross-tenant per FR-025.
- [X] T018 [US1] Extend `apps/api/src/modules/access-events/access-events.controller.ts` — add `@Get()` handler `list(@Query(ZodValidationPipe(accessEventListQuerySchema)) query, @CurrentUser() user)` with method-level `@Roles("super_admin", "admin")` narrowing the controller-level roles. Returns `AccessEventListResponse`.

### Frontend (feature slice + MVP subpage wiring)

- [X] T019 [P] [US1] Create `apps/web/src/features/logbook/components/empty-state.tsx` — centered empty state consuming `logbook.empty.*` i18n keys (FR-009)
- [X] T020 [P] [US1] Create `apps/web/src/features/logbook/components/status-badge.tsx` — translated badge for visitor/provider status (allowed=green, flagged=amber, denied=red) per `contracts/logbook-ui.md` § Visitors columns
- [X] T021 [P] [US1] Create `apps/web/src/features/logbook/components/visitors-columns.tsx` — exports `visitorsColumns: ColumnDef<AccessEventListItem>[]` with Code | Name | Direction | Resident visited | Vehicle | Status | Registered by | Date (FR-011)
- [X] T022 [P] [US1] Create `apps/web/src/features/logbook/types/index.ts` — re-exports `AccessEventListItem`, `AccessEventListResponse` from `@ramcar/shared` plus a local `LogbookFilters` interface (per `contracts/logbook-ui.md` § Filter persistence)
- [X] T023 [US1] Create `apps/web/src/features/logbook/hooks/use-logbook.ts` — TanStack Query v5 hook calling `apiClient.get("/access-events", { params })`. Query key `["access-events", scopeKey, personType, filters]` where `scopeKey = actorRole === "super_admin" ? (filters.tenantId ?? "ALL") : actorTenantId`. Depends on T022 (types).
- [X] T024 [US1] Create `apps/web/src/features/logbook/components/logbook-table.tsx` — shared table consuming `columns`, `data`, `meta`, `isLoading`, `error`, `onPageChange`, `onPageSizeChange`, `showTenantColumn`. Skeleton/empty/error rendering per `contracts/logbook-ui.md` § Rendering states. Pagination with Previous/Next, `{page} / {totalPages}`, page-size select (10/25/50/100). Depends on T019 (empty state), T022 (types).
- [X] T025 [US1] Create `apps/web/src/features/logbook/components/logbook-subpage.tsx` — client component that takes `personType` + `columns`, calls `useLogbook(personType, filters)`, renders `<LogbookTable />`. MVP version reads default filters only (no URL filters yet — that's US2). Depends on T023, T024, T021.
- [X] T026 [US1] Create `apps/web/src/features/logbook/components/logbook-shell.tsx` — layout component rendering `<PageHeading>`, `<Tabs>` (Visitors/Providers/Residents linking to `/logbook/<subpage>`), toolbar placeholder, and `{children}`. Active tab derived from `usePathname()`.
- [X] T027 [US1] Create `apps/web/src/features/logbook/index.ts` — export `LogbookShell`, `LogbookSubpage`, columns, hooks, types
- [X] T028 [US1] Create `apps/web/src/app/[locale]/(dashboard)/logbook/layout.tsx` — NEW shared layout that wraps children in `<LogbookShell>` (the outlet receives the active subpage)
- [X] T029 [US1] Rewrite `apps/web/src/app/[locale]/(dashboard)/logbook/visitors/page.tsx` — render `<LogbookSubpage personType="visitor" columns={visitorsColumns} />`
- [X] T030 [US1] Verify `apps/web/src/app/[locale]/(dashboard)/logbook/page.tsx` redirects to `/logbook/visitors` (already exists per plan — confirm and leave unchanged, or adjust import if path resolution breaks)

### Tests

- [X] T031 [P] [US1] Write `apps/web/src/features/logbook/__tests__/logbook-table.test.tsx` — covers skeleton, empty state, error state, and row rendering (Vitest + React Testing Library)

**Checkpoint**: At this point, an Admin can visit `/logbook`, be redirected to `/logbook/visitors`, and see today's visitor events for their tenant with pagination. No search, no date-range control, no providers/residents tabs, no export yet. **This is the MVP**. Stop here to demo/validate SC-001.

---

## Phase 4: User Story 2 — Apply date range filters (Priority: P1)

**Goal**: User can change date range via presets (Today, Last 7d, Last 30d, Last 3 months) or a custom range. Filter state is persisted in the URL (FR-022) and pagination resets to page 1 on filter change (FR-021).

**Independent Test**: On Visitors subpage with >25 rows today, pick "Last 7 days". Verify the table re-queries, page resets to 1, URL gains `?date_preset=last_7d`. Refresh and confirm state is restored.

### Frontend

- [X] T032 [P] [US2] Create `apps/web/src/features/logbook/hooks/use-date-presets.ts` — computes inclusive `{ from, to }` ISO dates for Today/Last 7d/Last 30d/Last 90d in the tenant's effective time zone (from user session or `tenants.time_zone` passed down). Handles DST boundaries per spec Edge Cases.
- [X] T033 [US2] Create `apps/web/src/features/logbook/hooks/use-logbook-filters.ts` — reads `useSearchParams()` into `LogbookFilters`, exposes setter that serialises and calls `router.replace("/logbook/<subpage>?...")`. Omits default values from URL (per `contracts/logbook-ui.md` § Filter persistence). Debounces `search` writes at 300 ms (anticipates US3). Resets `page` to 1 on any non-page change.
- [X] T034 [US2] Create `apps/web/src/features/logbook/components/date-range-filter.tsx` — trigger button + `<Popover>` with presets list + (for Custom) two `<DatePicker>` inputs from `@ramcar/ui` and an Apply button. Inline translated error when `to < from`. Commits to filter state via a callback prop.
- [X] T035 [US2] Wire `<DateRangeFilter>` into an initial `logbook-toolbar.tsx` at `apps/web/src/features/logbook/components/logbook-toolbar.tsx` (other toolbar items added by subsequent stories) and mount it in `logbook-shell.tsx`. Consumes filters from `useLogbookFilters`.
- [X] T036 [US2] Extend `logbook-subpage.tsx` from T025 — replace default-only filter input with `useLogbookFilters(personType)` so URL-driven filters flow into `useLogbook` and changes refetch automatically.

### Tests

- [X] T037 [P] [US2] Write `apps/web/src/features/logbook/__tests__/use-logbook-filters.test.ts` — covers URL → state parse (all param permutations), state → URL serialise (defaults omitted), page-reset-on-filter-change, debounced search write, invalid date range rejection

**Checkpoint**: Admin can change date range via presets or custom range, URL persists the selection, refresh restores it. Combined with US1, the daily + historical browsing workflow is complete.

---

## Phase 5: User Story 3 — Search across people, vehicles, and notes (Priority: P1)

**Goal**: Free-text search with 300 ms debounce matches across `visit_persons.full_name`, `visit_persons.phone`, `visit_persons.company`, `vehicles.plate`, `vehicles.brand`, `vehicles.model`, `access_events.notes`, and the visited resident's `profiles.full_name` (FR-020). Server-side via the `search_access_events` RPC.

**Independent Test**: Type a 3-char visitor-name fragment, wait 300 ms, confirm exactly one network request and a filtered result set. Clear the input and confirm unfiltered results return with page reset to 1.

### Backend

- [X] T038 [US3] Extend `apps/api/src/modules/access-events/access-events.repository.ts` — add a second code path in `list()` (or a sibling `searchList()`) that calls `supabase.rpc("search_access_events", { ... })` when `filters.search` is non-empty. Maps RPC result rows to `AccessEventListItem` and returns `{ data, total }` using `total_count` from the first row (per RPC contract).
- [X] T039 [US3] Extend `apps/api/src/modules/access-events/access-events.service.ts` — branch in `list()` to call the search path when `query.search?.trim()` is non-empty, passing the RPC-expected args (`p_tenant_ids`, `p_person_type`, `p_date_from`, `p_date_to_exclusive`, `p_resident_id`, `p_search`, `p_limit`, `p_offset`)

### Frontend

- [X] T040 [US3] Add `<SearchInput>` to `apps/web/src/features/logbook/components/logbook-toolbar.tsx` — controlled via `useLogbookFilters` with 300 ms debounce (already set up in T033). `Esc` key clears. Uses i18n `logbook.toolbar.search.placeholder` / `ariaLabel`.

### Tests

- [X] T041 [P] [US3] Write `apps/web/src/features/logbook/__tests__/logbook-toolbar.test.tsx` — covers search debounce (exactly one request per 300 ms window), Esc clears, filter combination resets page to 1. Uses Vitest fake timers.

**Checkpoint**: All three P1 browse capabilities (subpage load, date range, search) are functional. Combined with US4 below, US1–US4 form a secure, audit-ready read workflow.

---

## Phase 6: User Story 4 — Role-Based Access Control (Priority: P1)

**Goal**: Guards and Residents receive 403 from every Logbook endpoint (FR-024). Admins are locked to their JWT tenant (FR-025 — explicit 403 on cross-tenant). SuperAdmins can aggregate across authorised tenants or pick one (FR-026). DB RLS acts as defense-in-depth (FR-027).

**Independent Test**: Run the 6-command request matrix in `quickstart.md` § Access-control audit and verify every expected status code.

### Backend tests (integration-style)

- [X] T042 [P] [US4] Write `apps/api/src/modules/access-events/__tests__/access-events.controller.spec.ts` — controller-level tests with guard stubbing: Guard/Resident → 403; Admin (no tenantId) → own-tenant subset; Admin (wrong tenantId) → 403; SuperAdmin (no tenantId) → multi-tenant aggregation; SuperAdmin (unauth tenant) → 403. Uses NestJS Testing module + mocked `AccessEventsService`.
- [X] T043 [P] [US4] Write `apps/api/src/modules/access-events/__tests__/access-events.service.spec.ts` — unit tests for `resolveTenantScope` (6 rows of the truth table from `contracts/access-events-list.md`), date-default resolution in tenant TZ, and scope → repository-input mapping
- [X] T044 [P] [US4] Write `apps/api/src/modules/access-events/__tests__/access-events.repository.spec.ts` — integration-style test against the local Supabase: seed two tenants with overlapping person names/plates; verify that `.eq("tenant_id", ...)` and `.in("tenant_id", [...])` return correct row counts and zero cross-tenant leakage under the existing SELECT RLS policy

**Checkpoint**: All P1 user stories are complete. The Logbook is production-viable for Admins on a single tenant (US1–US3) and SuperAdmins on multiple tenants (US4), with cross-tenant leakage blocked at both API and DB layers.

---

## Phase 7: User Story 5 — Browse the Providers subpage (Priority: P2)

**Goal**: Tab to `/logbook/providers` shows `person_type = service_provider` rows with provider-specific columns (adds Company, drops Resident visited). Filters persist across tab switches (FR-003, Acceptance Scenario US5-4).

**Independent Test**: From Visitors subpage, click "Providers" tab. Verify URL changes to `/logbook/providers`, table re-queries with `personType=service_provider`, Company column appears, Resident visited column is gone, and existing filters (date range, search) remain applied.

### Frontend

- [X] T045 [P] [US5] Create `apps/web/src/features/logbook/components/providers-columns.tsx` — same column set as visitors, replace `residentVisited` with `company` (`row.visitPerson.company ?? "—"`) per FR-012
- [X] T046 [US5] Rewrite `apps/web/src/app/[locale]/(dashboard)/logbook/providers/page.tsx` — render `<LogbookSubpage personType="service_provider" columns={providersColumns} />`
- [X] T047 [US5] Verify `logbook-shell.tsx`'s tab navigation does not trigger a full reload between sibling routes (App Router behaviour — confirm visually; add an `aria-current="page"` on active tab)

**Checkpoint**: Visitors and Providers subpages both work with shared filters.

---

## Phase 8: User Story 6 — Browse the Residents subpage (Priority: P2)

**Goal**: Tab to `/logbook/residents` shows `person_type = resident` rows with residents-specific columns (Name, Unit, Direction, Mode, Vehicle, Registered by, Date) per FR-013.

**Independent Test**: Click Residents tab. Verify column set matches FR-013, `Unit` cells show `profiles.address` or `—` on null (research R6), `Mode` cell is translated vehicle/pedestrian label.

### Frontend

- [X] T048 [P] [US6] Create `apps/web/src/features/logbook/components/residents-columns.tsx` — `Name | Unit | Direction | Mode | Vehicle | Registered by | Date`. `Unit` cell reads `row.resident.unit ?? "—"`. `Mode` translates `row.accessMode`.
- [X] T049 [US6] Rewrite `apps/web/src/app/[locale]/(dashboard)/logbook/residents/page.tsx` — render `<LogbookSubpage personType="resident" columns={residentsColumns} />`

**Checkpoint**: All three subpages are browsable independently with the shared toolbar.

---

## Phase 9: User Story 7 — Filter by resident (Priority: P2)

**Goal**: Resident combobox filters events to a chosen resident. On Visitors/Providers subpages it filters `visit_persons.resident_id`; on Residents subpage it filters `access_events.user_id` (FR-019).

**Independent Test**: Open the resident combobox, type a partial name, pick a resident, confirm table filters correctly per subpage. Clear the combobox and confirm rows return.

### Backend

- [X] T050 [US7] Extend the no-search path in `apps/api/src/modules/access-events/access-events.repository.ts` — when `filters.residentId` is present, apply `.eq("user_id", residentId)` on the Residents subpage and `.eq("visit_person.resident_id", residentId)` (inner-joined) on Visitors/Providers. The RPC path from US3 already accepts `p_resident_id` — verify the branch handles both personType cases.

### Frontend

- [X] T051 [US7] Import `ResidentSelect` from `@ramcar/features/shared/resident-select` (spec 018) into `apps/web/src/features/logbook/components/logbook-toolbar.tsx`. Wire `value = filters.residentId` and `onChange = setFilter("residentId", ...)`. Per research R7: no `tenantId` prop — `ResidentSelect` picks tenant from `useRole()`. Hidden behaviour for all-tenants SuperAdmin mode is added in US8.

**Checkpoint**: Resident-centric investigative workflow supported on all three subpages.

---

## Phase 10: User Story 8 — SuperAdmin switches tenants (Priority: P2)

**Goal**: SuperAdmin sees a Tenant selector in the toolbar (FR-017). Default "All tenants" aggregates rows and prepends a Tenant column (per `contracts/logbook-ui.md` § Subpage column sets). Selecting one tenant narrows and enables the ResidentSelect. Admin never sees the selector (FR-018).

**Independent Test**: Sign in as SuperAdmin with ≥2 authorised tenants. Verify selector appears, default is "All tenants", `Tenant` column is first, rows come from all tenants. Pick one tenant → rows narrow, Tenant column disappears, ResidentSelect appears. Sign in as Admin → selector is absent from the DOM.

### Frontend

- [X] T052 [P] [US8] Create `apps/web/src/features/logbook/components/tenant-select.tsx` — renders `null` unless `useRole().role === "super_admin"`. Uses existing `useTenants()` hook (from `/api/tenants`). Options: "All tenants" (clears `tenant_id` URL param) + one per authorised tenant.
- [X] T053 [US8] Mount `<TenantSelect>` in `apps/web/src/features/logbook/components/logbook-toolbar.tsx`. In the toolbar, conditionally hide `<ResidentSelect>` when `actorRole === "super_admin" && !filters.tenantId` (research R7).
- [X] T054 [US8] Update `visitors-columns.tsx`, `providers-columns.tsx`, `residents-columns.tsx` — or make the `logbook-table.tsx` `showTenantColumn` prop prepend a `logbook.columns.tenant` column rendering `row.tenantName ?? "—"`. Choose the `logbook-table.tsx` approach to keep column files per-subpage pure.
- [X] T055 [US8] Wire `showTenantColumn` in `logbook-subpage.tsx` — true iff `actorRole === "super_admin" && !filters.tenantId` AND the response has `tenantName` populated
- [X] T056 [US8] Extend `use-logbook.ts` (from T023) to pass `scopeKey` into the query key — already spec'd but only needs verification here; add a unit test if not covered by T037

### Tests

- [X] T057 [P] [US8] Extend `apps/api/src/modules/access-events/__tests__/access-events.service.spec.ts` — add edge-case tests: SuperAdmin with zero authorised tenants → `{ data: [], meta.total: 0 }`, SuperAdmin aggregate returns `tenantName` populated, single-tenant SuperAdmin mode omits `tenantName`

**Checkpoint**: All P2 user stories complete. Portfolio SuperAdmins can triage across tenants without re-authenticating.

---

## Phase 11: User Story 9 — Export the current filtered view (Priority: P3)

**Goal**: "Export current view" downloads a CSV of all rows matching the active filters (not only the current page) with localised headers + enum cells per FR-029/031/032/033/035. Filename `logbook-<subpage>-<yyyy-mm-dd>.csv`.

**Independent Test**: With ≥2 pages of rows showing, click Export → "Export current view". Verify the downloaded file opens in Excel (UTF-8 BOM), has the translated header row, contains all rows (not only page 1), and is named per the pattern.

### Backend

- [X] T058 [US9] Create `apps/api/src/modules/access-events/dto/export-access-events.dto.ts` — re-exports `accessEventExportQuerySchema` from `@ramcar/shared`
- [X] T059 [US9] Extend `apps/api/src/modules/access-events/access-events.repository.ts` — add `exportIterator(filters, scope)` that yields batches of 500 `AccessEventListItem` rows via `.range()` (no-search) or chunked RPC calls (with-search), ordered by `created_at DESC`, until a short batch is returned (per research R2 + contract § Streaming behaviour)
- [X] T060 [US9] Add a CSV-writer helper (e.g., `apps/api/src/modules/access-events/access-events.csv.ts`) implementing: UTF-8 BOM prefix, `\r\n` line endings, RFC 4180 quoting (wrap on `,`, `"`, `\n`; double `"`), CSV-injection defence (prefix `'` to cells starting with `=`, `+`, `-`, `@`). Reads column header + enum labels from `LOGBOOK_CSV_LABELS[locale]` for the subpage.
- [X] T061 [US9] Extend `apps/api/src/modules/access-events/access-events.service.ts` — add `exportCsv(query, actorUser): StreamableFile`. Resolves scope and tenant TZ (for filename date), constructs a `ReadableStream<Uint8Array>` that (a) emits BOM + header row synchronously, (b) iterates `exportIterator`, (c) serialises each batch to CSV lines via T060's helper, (d) closes on short batch. Returns `new StreamableFile(stream, { type: "text/csv; charset=utf-8", disposition: 'attachment; filename="logbook-<subpage>-<yyyy-mm-dd>.csv"' })`.
- [X] T062 [US9] Extend `apps/api/src/modules/access-events/access-events.controller.ts` — add `@Get("export")` handler delegating to `service.exportCsv`, same method-level `@Roles("super_admin", "admin")`. Sets `Cache-Control: no-store`.

### Frontend

- [X] T063 [US9] Create `apps/web/src/features/logbook/hooks/use-logbook-export.ts` — wraps `apiClient.download("/access-events/export", { params })`; on success, creates `URL.createObjectURL(blob)`, appends a transient `<a download={filename}>`, clicks it, revokes the URL. Exposes `{ isExporting, exportCurrentView(filters), error }`.
- [X] T064 [US9] Create `apps/web/src/features/logbook/components/export-menu.tsx` — dropdown button with "Export current view" (disabled when `meta.total === 0`, label then reads `logbook.export.noRows`) and "Export all…" (opens the dialog — added in US10). Wires "Export current view" to `useLogbookExport.exportCurrentView(currentFilters)`. Shows spinner + disables during export per FR-033.
- [X] T065 [US9] Mount `<ExportMenu>` in `apps/web/src/features/logbook/components/logbook-toolbar.tsx`

### Tests

- [X] T066 [P] [US9] Write `apps/web/src/features/logbook/__tests__/export-menu.test.tsx` — covers: empty-rows state disables "Export current view" with i18n label; click triggers `apiClient.download` with active filters; loading state disables the button; error shows toast
- [X] T067 [P] [US9] Extend `apps/api/src/modules/access-events/__tests__/access-events.service.spec.ts` — tests for CSV writer (quoting edge cases, CSV injection prefix), BOM presence, streaming close on short batch

**Checkpoint**: Admins and SuperAdmins can export their current view. Audit and compliance use case is half-served.

---

## Phase 12: User Story 10 — Export a bulk date range via modal (Priority: P3)

**Goal**: "Export all" opens a modal requiring a date range (presets + custom). Confirmation ignores the toolbar's date range, keeps subpage `personType` and tenant scope (FR-030), and respects the modal-chosen range.

**Independent Test**: Click Export → "Export all…". Verify modal opens, confirming without a range shows inline error, picking "Last 30 days" downloads a CSV with the 30-day rows (ignoring the toolbar's range).

### Frontend

- [X] T068 [US10] Create `apps/web/src/features/logbook/components/export-all-dialog.tsx` — `<Dialog>` with title, description, embedded `<DateRangeFilter>` (presets + custom), inline error when submitted without a range, Cancel + Export footer. Uses `useLogbookExport` with modal-scoped filters (current personType + tenantId + modal's dateFrom/dateTo; no `search`/`residentId` per data-model.md).
- [X] T069 [US10] Wire the Export Menu's "Export all…" item to open `<ExportAllDialog>` from `export-menu.tsx` (added in T064)

**Checkpoint**: All user stories shipped. The Logbook is feature-complete per `spec.md`.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, performance checks, E2E, and documentation touch-ups.

- [X] T070 [P] Add a Playwright E2E spec at `apps/web/e2e/logbook.spec.ts` covering the golden path: Admin logs in, navigates to `/logbook`, verifies today's rows, toggles Providers tab, applies "Last 7 days", searches by plate, clicks "Export current view", asserts download event
- [X] T071 [P] Run `pnpm --filter @ramcar/api test` and confirm new specs (controller/service/repository) pass with coverage targets met
- [X] T072 [P] Run `pnpm --filter @ramcar/web test` and confirm new frontend specs (filters, toolbar, table, export-menu) pass
- [X] T073 [P] Run `pnpm --filter @ramcar/shared test` and confirm validator tests pass
- [X] T074 Run `pnpm typecheck` across the monorepo; resolve any strict-mode errors introduced by the feature
- [X] T075 Run `pnpm lint` across the monorepo; fix any violations
- [X] T076 Execute the full manual smoke flow in `specs/019-logbook-bitacora/quickstart.md` (Admin, SuperAdmin, Guard-denied, Resident-denied) and tick every step
- [X] T077 Execute the 6-command access-control audit in `quickstart.md` § Access-control audit and confirm every expected status code (SC-004 validation)
- [X] T078 Measure performance on a seeded tenant with ≥5,000 events: default page (Today + 25) p95 < 1 s (SC-003), filter change p95 < 1 s (FR-040), tab switch < 1 s (SC-006), Export all first-byte < 15 s (SC-005). Document in a short comment on the PR.
- [X] T079 Double-check FR-038 (no hardcoded strings) by searching `apps/web/src/features/logbook/` for bare English/Spanish text literals; fix any stragglers with i18n keys

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → immediate
- **Foundational (Phase 2)** → depends on Setup; BLOCKS every user story
  - Within Phase 2: T003 → T004 → T005 → T006 sequential (same migration file + typegen); T007 parallel with T008 (same file but different sections — technically T007 before T008 to avoid merge conflicts); T009 depends on T007; T010 depends on T009; T011 parallel with T012; T013 parallel with T014
- **User Stories (Phase 3–12)** → all depend on Foundational. Can proceed in parallel (if staffed) or sequentially in priority order (P1 → P2 → P3).
- **Polish (Phase 13)** → depends on all user stories complete

### User Story Dependencies

- **US1 (MVP)**: blocks nothing structural; its backend list endpoint + frontend shell + table + visitors-columns are the foundation every later story extends. Other stories assume US1's endpoint + shell exist.
- **US2 (date range filters)**: independent of US3/US4 at the frontend level; extends US1's hooks.
- **US3 (search)**: depends on the RPC from Phase 2 (T005); otherwise independent of US2 on the backend. Frontend search input lives in the same toolbar as US2's date range, so merge order matters (US2 toolbar first, then US3 adds the input).
- **US4 (RBAC tests)**: independent — test-only; can run in parallel with US1–US3 implementation.
- **US5, US6**: each depends on US1's `<LogbookSubpage>` + `<LogbookTable>`. Independent of each other.
- **US7 (resident filter)**: frontend depends on US1 toolbar; backend depends on US1 list + US3 RPC (residentId filter already in RPC contract).
- **US8 (SuperAdmin tenant switcher)**: frontend depends on US7 (conditional hiding of ResidentSelect); backend tenant scope resolution is already in US1's service helper (`resolveTenantScope` covers all roles from day one).
- **US9 (export current view)**: depends on US1 (list filters) + US2 (active filter set) + US3 (search filter) for "current view" semantics.
- **US10 (export all modal)**: depends on US9's menu + download plumbing; independent date range picker.

### Within Each User Story

- Backend: repository → service → controller → tests
- Frontend: types → hooks → components → routes → tests
- Within frontend, `[P]` tasks (empty-state, status-badge, columns, etc. — T019–T022) parallelise because they live in different files and have no on-each-other dependencies before the shell/table is built.

### Parallel Opportunities

- Phase 2 tasks T007, T011, T013, T014 are all `[P]`
- Phase 3 tasks T019–T022 are all `[P]`
- Phase 4 tasks T032, T037 are `[P]`
- Phase 6 tasks T042, T043, T044 are all `[P]` (different test files)
- Phase 7–10 can be worked by different developers after Phase 3 lands (different subpage routes + toolbar sections)
- Phase 13 `[P]` tasks (T070–T073) are independent test-runs

---

## Parallel Example: User Story 1

```bash
# Launch these four in parallel (different files, no inter-dependency):
Task: "Create empty-state.tsx in apps/web/src/features/logbook/components/"
Task: "Create status-badge.tsx in apps/web/src/features/logbook/components/"
Task: "Create visitors-columns.tsx in apps/web/src/features/logbook/components/"
Task: "Create types/index.ts in apps/web/src/features/logbook/types/"
```

## Parallel Example: Foundational Phase

```bash
# These three can run in parallel once the migration has been applied:
Task: "Extend access-event.ts types with AccessEventListItem/Response + LOGBOOK_CSV_LABELS"
Task: "Add download() to apps/web/src/shared/lib/api-client.ts"
Task: "Add logbook.* keys to packages/i18n/src/messages/en.json"
Task: "Add logbook.* keys to packages/i18n/src/messages/es.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational) — **this includes the migration + RPC + shared schemas + i18n + download helper**. No user story work can begin until this completes.
3. Complete Phase 3 (US1 — Admin browses today's visitors).
4. **STOP and VALIDATE** SC-001 (navigate + see today's rows in < 3 s) against a seeded tenant.
5. Demo or ship to staging.

### Incremental Delivery

After MVP validation:

1. Add Phase 4 (US2 — date range) → demo investigative workflow.
2. Add Phase 5 (US3 — search) → demo "find by plate / name" in < 10 s (SC-002).
3. Add Phase 6 (US4 — RBAC tests) in parallel with US2/US3 (tests only, no user-visible change).
4. Add Phase 7 + Phase 8 (US5 + US6 — providers + residents subpages) → all three tabs live.
5. Add Phase 9 + Phase 10 (US7 + US8 — resident filter + SuperAdmin tenant switcher).
6. Add Phase 11 + Phase 12 (US9 + US10 — exports) → compliance/audit use case.
7. Phase 13 (Polish) → ship.

### Parallel Team Strategy

With 2–3 developers after Phase 2:

- Dev A: US1 (MVP) then US2 (date range) then US3 (search).
- Dev B (starts once US1's shell lands): US5 → US6 (sibling subpages).
- Dev C (starts once Phase 2 lands): US4 tests + US7 (resident filter) + US8 (tenant switcher).
- Everyone converges on US9/US10 after US1–US8 are merged, then Phase 13.

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks in the same phase.
- `[Story]` label maps task to the user story for traceability and independent validation.
- This feature **adds tests** (Jest for API, Vitest for web, Playwright for E2E) per plan.md § Testing. Tests run after the code they cover in each phase, not TDD-first (the spec does not mandate TDD).
- No database schema change is touched by any story except Phase 2 (T004, T005). All other stories are code-only.
- The Logbook is **web-only** (sidebar already restricts `platforms: ["web"]`). No desktop tasks appear in this plan — by design.
- No commits or pushes unless the user explicitly asks (per CLAUDE.md § Git Rules).
- Every user-visible string must come from `@ramcar/i18n` (FR-038). T079 is the final sweep.
