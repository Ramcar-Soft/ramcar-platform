# Implementation Plan: Access Log (Bitácora) — Admin/SuperAdmin Logbook

**Branch**: `019-logbook-bitacora` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-logbook-bitacora/spec.md`

## Summary

Deliver a read-only, paginated access-event browser at `/logbook` in `apps/web` for Admins and SuperAdmins, with three sibling subpages — `/logbook/visitors`, `/logbook/providers`, `/logbook/residents` — that filter by `access_events.person_type`. Filters share a toolbar (date range + presets, free-text search, resident combobox, SuperAdmin tenant selector), combine with logical AND server-side, and persist to the URL query string. Server-side pagination returns `{ data, meta }`. CSV export covers two modes: "Export current view" (reuses active filters across all pages) and "Export all" (modal with an independent date range). Backend work is a list endpoint + export endpoint added to the existing `apps/api/src/modules/access-events/` NestJS module; no new module, no frontend Supabase `.from()` access. RLS on `access_events` is already the defense-in-depth gate; the API gate adds role gating (`super_admin`, `admin` only) and rejects cross-tenant requests from Admins. Residents combobox reuses `ResidentSelect` from `@ramcar/features` (spec 018). Tenant selector (SuperAdmin-only) reuses `GET /tenants`. The Logbook is explicitly **web-only** (not a bi-app feature) — the sidebar config already gates `logbook` to `platforms: ["web"]`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS

**Primary Dependencies**:
- **Frontend (apps/web only — no desktop)**: Next.js 16 (App Router), `next-intl` v4, TanStack Query v5, Zustand (via `@ramcar/store`), `@ramcar/ui` (shadcn Table, Tabs, Popover, Command, Select, Button, Input, DatePicker, Badge, Skeleton, Dialog/Sheet, Separator), `@ramcar/features` (reusing `ResidentSelect`), `@ramcar/shared` (Zod DTOs + types), `@ramcar/i18n` (message catalogs), `lucide-react`, Tailwind CSS 4
- **Backend (apps/api)**: NestJS v11, Supabase JS v2, Zod via shared validation pipe, existing `UsersService`, existing `AccessEventsRepository` (extended with a list method + an export iterator)
- **CSV generation**: built-in (no new dep) — `Content-Type: text/csv; charset=utf-8` with `\r\n` line endings and manual quoting for fields containing `,`, `"`, `\n`. UTF-8 BOM (`﻿`) prepended so Excel in Latin locales opens Spanish accents correctly (Principle of "legible to the same audience reading the on-screen table", FR-035)

**Storage**: PostgreSQL via Supabase. **No new tables** for this feature. Read-only query over `access_events` joined to `profiles` (for guard name and the resident-being-visited name), `visit_persons` (for visitor/provider name, code, company, status, resident_id), and `vehicles` (for plate/brand). Two potential schema adjustments require planning-phase decisions and are handled in Phase 0 (tenant time zone column, resident unit column).

**Testing**:
- Jest + ts-jest for `apps/api` (service/repository unit tests, controller tests with guard stubbing; integration tests covering RBAC denial, admin tenant spoofing, and super_admin multi-tenant aggregation)
- Vitest + `@testing-library/react` for `apps/web` hooks/components (filter-bar interaction, URL↔state sync, debounced search)
- Playwright E2E reserved for the golden-path scenario (Admin loads Today's Visitors subpage, toggles Providers, exports current view); not strictly required for this feature's merge gate but covered in `quickstart.md`

**Target Platform**: Web (apps/web, modern evergreen browsers). The Logbook is intentionally NOT a bi-app feature — `sidebar-config.ts` already restricts `logbook` to `platforms: ["web"]`, and the spec scopes the audience to portal Admins/SuperAdmins. Desktop (guard booth) is out of scope.

**Project Type**: Authenticated portal feature in a Next.js 14+ App Router monorepo; backend additions in an existing NestJS module.

**Performance Goals**:
- Default page (Today + page size 25) returns within 1 s p95 under normal load (FR-039, SC-003)
- Filter/search change → new results within 1 s p95 (FR-040)
- Navigation click → first visible rows within 3 s p95 cold load (SC-001)
- Tab switch between subpages produces visible rows within 1 s (SC-006) — no full page reload
- "Export all" for a tenant with ~5,000 events begins streaming within 15 s (SC-005)

**Constraints**:
- Tenant isolation at both API (`@CurrentTenant` + explicit cross-tenant 403 for Admins) and DB (existing `access_events` SELECT RLS already does `super_admin OR tenant_id = jwt.tenant_id`)
- No frontend Supabase `.from()`/`.rpc()`/`.storage` (Constitution Principle VIII); all data goes through the NestJS API
- All user-visible strings sourced from `@ramcar/i18n` (FR-038) — no hardcoded text
- Filters must be fully reflected in the URL so refresh/share restores state (FR-022)
- Pagination is server-side only (FR-007); no client-side sorting/filtering over a partial dataset
- Export is synchronous streaming, CSV-only (FR-032); PDF and async/email delivery are out of scope
- Debounce window on search input: 300 ms (single request per window) — matches FR-020 and mirrors the existing convention in `ResidentSelect`

**Scale/Scope**:
- New routes: 4 (`/logbook` redirect + 3 subpages — already scaffolded as empty pages on this branch)
- New React feature module: `apps/web/src/features/logbook/` (table, toolbar, subpage wrappers, hooks, URL state, export dialog)
- New backend endpoints: 2 (`GET /api/access-events` list, `GET /api/access-events/export` CSV stream)
- New Zod schemas in `@ramcar/shared`: `accessEventListQuerySchema`, `accessEventExportQuerySchema`, and types `AccessEventListItem`, `AccessEventListResponse`
- New i18n keys: `logbook.*` group spanning tabs, columns, filters, presets, badges, export dialog, empty state, errors
- Expected tenant scale: up to ~5,000 access events per tenant for month-long windows; no pagination-ceiling changes needed (page sizes 10/25/50/100 are already within existing conventions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Result | Notes |
|---|---|---|---|
| I. Multi-Tenant Isolation | Every DB query scoped by `tenant_id`; RLS enforced as DB-level defense-in-depth | ✅ PASS | List/export repository methods always filter by `tenant_id` derived from `@CurrentTenant` for Admins, and from the actor's authorized tenant set for SuperAdmins. When a SuperAdmin omits `tenant_id`, the query filters to `tenant_id IN (<authorized set>)`; it never runs unscoped. Existing `access_events` SELECT RLS already denies rows outside the caller's tenant scope (see migration `20260410000000` line ~150). Integration test will confirm zero cross-tenant leakage (SC-004). |
| II. Feature-Based Architecture | Frontend domain lives in `src/features/[domain]/`; backend in `src/modules/[domain]/` | ✅ PASS | Frontend: new `apps/web/src/features/logbook/` vertical slice (components, hooks, types, url-state helpers). Routing under `apps/web/src/app/[locale]/(dashboard)/logbook/` contains only page wrappers delegating to the feature. Backend: additions live inside the existing `apps/api/src/modules/access-events/` module — no new module. |
| III. Strict Import Boundaries | No cross-feature imports; `shared/` never imports `features/`; common imported by modules, not reverse | ✅ PASS | `features/logbook/` imports only from `@ramcar/ui`, `@ramcar/shared`, `@ramcar/i18n`, `@ramcar/features` (for `ResidentSelect`), `@tanstack/react-query`, `@/shared/...`, `lucide-react`. It does NOT import from `features/residents`, `features/providers`, or `features/users`. Backend additions stay inside `access-events/` and import existing `UsersService` via NestJS DI (already provided by `AccessEventsModule`). |
| IV. Offline-First Desktop | Desktop works offline; SQLite in main process only | ✅ N/A | Logbook is web-only (`sidebar-config.ts` already restricts it to `platforms: ["web"]`). No Electron/SQLite/outbox code is touched. |
| V. Shared Validation via Zod | DTOs defined once in `@ramcar/shared` and reused by API + frontend | ✅ PASS | Two new schemas added to `@ramcar/shared`: `accessEventListQuerySchema` (drives `AccessEventListQueryDto` and the frontend TanStack Query hook) and `accessEventExportQuerySchema` (same pattern for export). Response types (`AccessEventListItem`, `AccessEventListResponse`) are added to `@ramcar/shared` next to the existing `AccessEvent` type so both sides import the same shape. No duplication. |
| VI. Role-Based Access Control | Guarded by `JwtAuthGuard + RolesGuard`; DB RLS mirrors API role restrictions | ✅ PASS | New endpoints apply `@Roles("super_admin", "admin")` (narrower than the controller-level `"super_admin", "admin", "guard"` currently in effect, so the two new handler methods override via method-level `@Roles`). The existing `access_events` SELECT RLS is already role-agnostic at SELECT (it allows guard/admin/super_admin all in their tenant); the API guard is what excludes Guards/Residents — and the DB layer still correctly rejects cross-tenant reads for anyone. No DB migration needed for RLS; confirmed by re-reading `20260410000000_create_vehicles_and_access_events.sql`. |
| VII. TypeScript Strict Mode | `strict: true` across all tsconfigs; no unexplained `any` | ✅ PASS | All new code stays inside existing `@ramcar/` workspaces that already extend strict tsconfigs. No `any` introduced: query shapes are Zod-inferred, response items have explicit `AccessEventListItem` interface with precise `string \| null` fields, export stream body is `ReadableStream<Uint8Array>` (typed). |
| VIII. API-First Data Access | All DB ops through NestJS API; frontend Supabase is auth+realtime only | ✅ PASS | Frontend reads via `apiClient.get("/access-events", { params })` and a new `apiClient.download("/access-events/export", { params })` helper (returns `Blob` + `Content-Disposition` filename). No `supabase.from()`, `.rpc()`, or `.storage` on the frontend. Backend owns all business logic, tenant filter, RBAC, and CSV streaming. |
| Cross-App Sharing (CLAUDE.md, spec 014) | Bi-app features authored once in `@ramcar/features`; no per-app duplicates for bi-app features | ✅ PASS | Logbook is **not** a bi-app feature. Sidebar config already declares `platforms: ["web"]` for this route (no desktop sibling). The feature therefore correctly lives in `apps/web/src/features/logbook/` and does not enter `@ramcar/features`. The `ResidentSelect` consumed by the toolbar is already a shared primitive in `@ramcar/features`, so reuse is one-directional (web → shared), which is allowed. |
| UI Pattern — Sheets, not dedicated pages (CLAUDE.md) | Catalog create/edit uses right-side Sheet, never `/new` or `/[id]/edit` pages | ✅ N/A | The Logbook is explicitly read-only (FR-005: "rows are not inline-editable and do not open a detail view"). No create/edit flow exists in this feature. The "Export all" modal is a `Dialog`, not a catalog Sheet, and fits the existing modal-confirmation pattern. |

**Result**: Initial gate PASSES — no violations. **Complexity Tracking section is intentionally empty.**

Post-design re-check (after Phase 1 artifacts are produced): all principles still PASS. The Phase 0 decision to treat tenant time zone as a non-blocking enhancement (documented in `research.md` R3) avoids forcing a schema change; the decision to project `profiles.address` as the Residents-subpage "Unit" column (R6) avoids a second schema change; both are reversible without API contract churn.

## Project Structure

### Documentation (this feature)

```text
specs/019-logbook-bitacora/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature spec (pre-existing)
├── research.md          # Phase 0 — decisions R1–R9
├── data-model.md        # Phase 1 — read-only projection per subpage, query shapes
├── quickstart.md        # Phase 1 — manual verification (Admin, SuperAdmin, Guard, Resident)
├── contracts/
│   ├── access-events-list.md    # GET /api/access-events — query schema, response shape, role rules
│   ├── access-events-export.md  # GET /api/access-events/export — query schema, streaming contract, filename
│   └── logbook-ui.md            # UI contract (routes, subpage columns, filter persistence, empty/error states)
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

Paths touched by this feature, grounded in the current monorepo:

```text
apps/web/
├── src/app/[locale]/(dashboard)/logbook/
│   ├── page.tsx                              # EXISTS (redirects to /logbook/visitors) — keep
│   ├── layout.tsx                            # NEW — shared layout hosting the in-page tabs (Visitors/Providers/Residents) and filter toolbar above the outlet
│   ├── visitors/page.tsx                     # REWRITE — wraps <LogbookSubpage personType="visitor" />
│   ├── providers/page.tsx                    # REWRITE — wraps <LogbookSubpage personType="service_provider" />
│   └── residents/page.tsx                    # REWRITE — wraps <LogbookSubpage personType="resident" />
│
├── src/features/logbook/                     # NEW feature slice
│   ├── components/
│   │   ├── logbook-shell.tsx                 # tabs + toolbar + outlet slot
│   │   ├── logbook-toolbar.tsx               # date range + presets, search, resident combobox, (super_admin) tenant selector, export menu
│   │   ├── logbook-table.tsx                 # generic paginated read-only table consuming columns prop
│   │   ├── logbook-subpage.tsx               # client component: resolves columns for personType, wires useLogbook + useExport
│   │   ├── visitors-columns.tsx              # Code | Name | Direction | Resident visited | Vehicle | Status | Registered by | Date
│   │   ├── providers-columns.tsx             # Code | Name | Company | Direction | Vehicle | Status | Registered by | Date
│   │   ├── residents-columns.tsx             # Name | Unit | Direction | Mode | Vehicle | Registered by | Date
│   │   ├── export-menu.tsx                   # "Export current view" + "Export all" dropdown
│   │   ├── export-all-dialog.tsx             # modal with date range (presets + custom) — FR-030
│   │   ├── date-range-filter.tsx             # presets + custom range popover
│   │   ├── tenant-select.tsx                 # SuperAdmin-only; reuses useTenants hook
│   │   ├── status-badge.tsx                  # translated allowed/flagged/denied badge (visitors/providers only)
│   │   └── empty-state.tsx                   # centered "No records found" (FR-009)
│   ├── hooks/
│   │   ├── use-logbook.ts                    # TanStack Query for GET /access-events; key: ["access-events", tenantId, personType, filters]
│   │   ├── use-logbook-export.ts             # POST-less download helper using new apiClient.download
│   │   ├── use-logbook-filters.ts            # parses/writes URL search params to/from filter state (debounced search)
│   │   └── use-date-presets.ts               # computes Today/Last 7d/30d/90d windows in the tenant's effective time zone
│   ├── types/
│   │   └── index.ts                          # re-exports AccessEventListItem et al. from @ramcar/shared
│   └── index.ts
│
├── src/shared/lib/api-client.ts              # EXTEND — add apiClient.download(path, { params }) returning { blob, filename }
│
├── src/features/navigation/                  # NO CHANGE — sidebar-config.ts already lists `logbook` with correct roles/platforms
│
apps/api/src/modules/access-events/
├── access-events.controller.ts               # EXTEND — add @Get() list and @Get("export") handlers, narrowed by @Roles("super_admin", "admin")
├── access-events.service.ts                  # EXTEND — add list(filters, actorUser, tenantId) + exportCsv(filters, actorUser, tenantId): ReadableStream
├── access-events.repository.ts               # EXTEND — add list(filters, tenantIds) returning { data, total } with joins to profiles, visit_persons, vehicles; add exportIterator(...) yielding batches
├── dto/
│   ├── list-access-events.dto.ts             # NEW — re-exports accessEventListQuerySchema from @ramcar/shared
│   └── export-access-events.dto.ts           # NEW — re-exports accessEventExportQuerySchema
└── __tests__/
    ├── access-events.service.spec.ts         # NEW — unit tests for list/export services
    ├── access-events.controller.spec.ts      # NEW — controller tests with RBAC denial, admin cross-tenant rejection, super_admin multi-tenant aggregation
    └── access-events.repository.spec.ts      # NEW — integration-style repo tests with tenant isolation fixture
│
packages/shared/src/
├── types/access-event.ts                     # EXTEND — add AccessEventListItem, AccessEventListResponse
├── validators/access-event.ts                # EXTEND — add accessEventListQuerySchema, accessEventExportQuerySchema (reusing the existing personType/direction/accessMode enums)
└── index.ts                                  # re-export new schemas + types
│
packages/i18n/src/messages/
├── en.json                                   # ADD — logbook.* group (tabs, columns, filters, presets, badges, export, empty, errors)
└── es.json                                   # ADD — same keys, Spanish
```

**Structure Decision**: This is a single-app feature in `apps/web` (portal only — `sidebar-config.ts` already declares `logbook.platforms = ["web"]`). The feature therefore lives in `apps/web/src/features/logbook/` and is NOT added to `@ramcar/features`. Backend additions live inside the existing `apps/api/src/modules/access-events/` module — no new NestJS module is introduced, because "Logbook" is a read projection over the same entity that module already owns (create/update endpoints remain untouched). Shared Zod schemas and response types are added to `@ramcar/shared` alongside the existing `AccessEvent` type so both the API and the frontend hook bind to the same shape (Principle V). The residents combobox consumed by the filter toolbar is imported verbatim from `@ramcar/features/shared/resident-select` (spec 018) — consuming a shared primitive from an app is allowed; no duplication is introduced. Database work is bounded to one non-blocking, additive tenant time zone column (see `research.md` R3); no touch to `access_events`, `profiles`, `visit_persons`, or `vehicles` tables or their RLS.

## Complexity Tracking

> *No Constitution Check violations. This section is intentionally empty.*
