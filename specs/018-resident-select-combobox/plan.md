# Implementation Plan: Resident Select Combobox

**Branch**: `018-resident-select-combobox` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-resident-select-combobox/spec.md`

## Summary

Refactor `@ramcar/features`' `ResidentSelect` from its current "text input + plain `Select`" shape into a single-trigger combobox (Popover + Command) matching the interaction shape of `VehicleBrandSelect`, but server-backed. The picker performs debounced search against the existing `GET /residents` endpoint so that the entire tenant roster (including the 2,500-resident edge case) is reachable without ever fetching the full list in one request. A new `GET /residents/:id` endpoint resolves the saved selection on edit forms so the trigger renders the resident's name on first paint. Public props remain `{ value, onChange, placeholder? }` so the four existing consumers (`visit-person-form`, `visit-person-edit-form`, `provider-form`, `provider-edit-form`) keep working with zero changes. Added via the shared `@ramcar/features` package only — no per-app duplicates.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, repo-wide)  
**Primary Dependencies**:
- Shared package: `@ramcar/features` (with `@ramcar/ui` Popover/Command, `@ramcar/shared` Zod + types, `@ramcar/i18n` for message catalog), TanStack Query v5, React 18, `lucide-react`
- Web host: Next.js 16 (App Router) + `next-intl` v4, consuming the shared package
- Desktop host: Electron 30 + Vite + React 18 + `react-i18next`, consuming the shared package
- Backend: NestJS v11 (modular monolith) — adds one controller method in `residents.controller.ts` + service delegation

**Storage**: PostgreSQL via Supabase — **no schema changes**. Reuses existing `profiles` table via `ResidentsService.list` → `UsersRepository.list` (list) and `UsersRepository.getById` (resolver).  
**Testing**: Vitest + `@testing-library/react` + `renderWithHarness` harness under `packages/features/src/test/harness.tsx` (unit); Jest + ts-jest for `apps/api` when the new resolver endpoint is added; Playwright reserved for app-level integration (not required for this refactor's gate).  
**Target Platform**: Web (apps/web, modern evergreen browsers) and Electron 30 renderer (apps/desktop). Shared module is environment-neutral (no `next/*`, no `"use client";`, no `window.electron`).  
**Project Type**: Cross-app shared UI feature inside an existing Turborepo monorepo.  
**Performance Goals**: Initial popover open < 500ms on broadband for 100–200-resident tenants (SC-004). At most one API request per 300ms debounce window during continuous typing (SC-002). Never issue a request with `pageSize > 100` (SC-005).  
**Constraints**: Must not break existing call sites (SC-003). Must NOT fetch the full roster in one request (FR-005). Must NOT advertise `address` search (FR-004, spec clarification). Must NOT offer a "create new resident" row (FR-012). Must NOT accept `tenantId` as a prop (FR-010).  
**Scale/Scope**: Picker is shared across four forms and two apps today; tenants range from ~10 to ~2,500 residents. One new API endpoint, one refactored shared component, one new test file, and additions to the shared i18n catalog.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Result | Notes |
|---|---|---|---|
| I. Multi-Tenant Isolation | Every query scoped to `tenant_id`; no unscoped DB access | ✅ PASS | List reuses `ResidentsService.list` (already tenant-scoped via `@CurrentTenant`); new `GET /residents/:id` reuses `UsersRepository.getById` inside `UsersService.getById` which enforces tenant + actor checks. Picker does NOT accept `tenantId` as a prop (FR-010); uses `useRole().tenantId` only for the React Query cache key. |
| II. Feature-Based Architecture | Frontend logic in `features/[domain]/`; backend module in `src/modules/[domain]/` | ✅ PASS | Shared picker lives in `packages/features/src/shared/resident-select/` (existing location). API change is contained in `apps/api/src/modules/residents/`. |
| III. Strict Import Boundaries | No cross-feature imports; `shared/` never imports `features/` | ✅ PASS | Picker under `packages/features/src/shared/`, already allowed to be consumed by `visitors/*` and by host apps. The picker itself imports only `@ramcar/ui`, `@ramcar/shared`, `@tanstack/react-query`, `lucide-react`, and its own `adapters/`. |
| IV. Offline-First Desktop | Desktop works offline; SQLite via main process only | ✅ N/A (read-only picker) | The picker is a read-only lookup. Creation/edit of the parent entities (visitor, provider) continues to use their existing transport (web: online HTTP; desktop: outbox). The picker itself does not write and therefore has no outbox contract; a transient "offline / can't load residents" error state is acceptable under the existing offline UX. |
| V. Shared Validation via Zod | DTOs defined once in `@ramcar/shared` / API DTO dir, reused across API + frontend | ✅ PASS | No new DTO. List reuses `residentFiltersSchema`. Resolver input is a single path param (no schema). Response types come from `@ramcar/shared` (`ExtendedUserProfile`, `PaginatedResponse<T>`) — reused unchanged. |
| VI. Role-Based Access Control | Guarded by `JwtAuthGuard` + `RolesGuard`; no UI-only auth | ✅ PASS | New endpoint inherits `JwtAuthGuard + TenantGuard + RolesGuard` with `@Roles("super_admin", "admin", "guard")` from `ResidentsController`. The picker is shown in guard-booth + admin flows only (today's behavior — no change). |
| VII. TypeScript Strict Mode | `strict: true` across the monorepo; no unexplained `any` | ✅ PASS | No new `any` introduced. Resolver response typed as `ExtendedUserProfile`. Public prop type is tightened, not loosened. |
| VIII. API-First Data Access | All DB ops go through NestJS; frontend uses only auth/realtime on Supabase | ✅ PASS | Both queries (list + resolver) go through `useTransport().get(...)` which targets the NestJS API. The picker never imports `@supabase/supabase-js`. |
| Cross-App Sharing (CLAUDE.md) | Bi-app features authored once in `@ramcar/features`, no per-app duplicate | ✅ PASS | Picker stays in `packages/features/src/shared/resident-select/`. FR-011 explicitly forbids per-app duplicates and `pnpm check:shared-features` will guard this. |
| UI Pattern — Sheets, not dedicated pages | Create/edit use right-side Sheet | ✅ PASS (inherited) | The picker is rendered inside parent Sheets (`visit-person-sidebar`, provider sidebars). The picker itself is not a Sheet; it must coexist with the Sheet's focus trap, which Popover + Command already does (`VehicleBrandSelect` ships inside the same sidebars today). |

**Result**: Initial gate PASSES — no violations. **Complexity Tracking section is intentionally empty.**

Post-design re-check (after Phase 1 artifacts): all principles still PASS. Design did not introduce new DTOs, new direct DB paths, new `any`, or per-app duplicates.

## Project Structure

### Documentation (this feature)

```text
specs/018-resident-select-combobox/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature spec (pre-existing)
├── research.md          # Phase 0 — decisions R1–R7
├── data-model.md        # Phase 1 — entity + picker-local state
├── quickstart.md        # Phase 1 — manual and automated verification steps
├── contracts/
│   ├── residents-api.md        # API: existing GET /residents + new GET /residents/:id
│   └── resident-select-ui.md   # UI component contract (props, render shape, i18n keys, a11y)
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created here)
```

### Source Code (repository root)

Paths touched by this feature, grounded in the current monorepo:

```text
packages/features/
├── src/
│   ├── shared/
│   │   └── resident-select/
│   │       ├── index.tsx                    # REWRITE — Popover + Command + TanStack Query (list + resolver)
│   │       └── resident-select.test.tsx     # NEW — vitest unit suite (see research R6 matrix)
│   ├── adapters/                            # unchanged — consumes useTransport, useI18n, useRole
│   └── test/
│       └── harness.tsx                      # unchanged — reused

packages/i18n/
└── src/messages/
    ├── en.json                              # ADD: residents.select.{placeholder,searchPlaceholder,empty,loading,error,ariaLabel}
    └── es.json                              # ADD same keys (Spanish)
    # …any other active locales in the repo get the same additions

apps/api/src/modules/residents/
├── residents.controller.ts                  # ADD: @Get(":id") handler
├── residents.service.ts                     # ADD: getById(id, tenantId) that delegates to UsersService.getById
└── __tests__/                               # ADD: resolver-endpoint test (happy path, 404 for non-resident, tenant isolation)

apps/web/src/features/providers/components/
├── provider-form.tsx                        # NO CHANGE — existing call site
└── provider-edit-form.tsx                   # NO CHANGE — existing call site

packages/features/src/visitors/components/
├── visit-person-form.tsx                    # NO CHANGE — existing call site
└── visit-person-edit-form.tsx               # NO CHANGE — existing call site
```

**Structure Decision**: This is a cross-app shared UI feature (`visitors` is bi-app; `providers` is currently web-only but both consume from the same shared module). The picker therefore lives in `packages/features/src/shared/resident-select/` (single source of truth) and is consumed verbatim by both `@ramcar/features/visitors` components and the `apps/web/providers` components. The only backend touch is one new handler method inside the existing `residents` NestJS module — no new module, no migration, no shared-package split. This matches the existing topology for `vehicle-brand-select`, `vehicle-form`, and `visit-person-status-select`.

## Complexity Tracking

> *No Constitution Check violations. This section is intentionally empty.*
