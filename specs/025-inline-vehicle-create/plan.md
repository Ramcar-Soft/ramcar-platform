# Implementation Plan: Inline Vehicle Creation in Person Create Form

**Branch**: `025-inline-vehicle-create` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-inline-vehicle-create/spec.md`

## Summary

Today, registering a vehicle-borne visitor or provider at a booth takes three steps: save the visitor → screen switches to the access-event step → notice "no vehicles" → open a separate vehicle form → save the vehicle → return to the access-event step. The same multi-step pain exists for residents on the web portal: create the resident, then open a separate vehicle management surface. This feature folds the vehicle entry into the same right-side `Sheet` as the person create form so the user perceives one Save action.

The work splits cleanly along the existing single-app vs. cross-app boundary:

- **Visitors and providers (cross-app)**: Add a shared `<InlineVehicleSection />` component plus a `useInlineVehicleSubmissions()` hook to `packages/features/src/shared/vehicle-form/`. The shared module already houses `VehicleForm` and `VehicleManageList`; the new section reuses `VehicleForm`'s field set verbatim by composing it inside a draft-row container that adds/removes entries before the first Save. Wire into `VisitPersonForm` (shared, in `@ramcar/features/visitors`) and `ProviderForm` (currently per-app in `apps/web/src/features/providers/components/` and `apps/desktop/src/features/providers/components/`). After a successful create with exactly one inline vehicle, the existing `justCreatedVehicleId` plumbing in `VisitPersonSidebar` / `ProviderSidebar` pre-selects it in the access-event vehicle picker (FR-004) — no new state machine is required for that hop.
- **Residents (single-app, web only)**: Add the same `<InlineVehicleSection />` to `UserForm` in `apps/web/src/features/users/components/user-form.tsx`, gated to `formData.role === "resident"` (FR-002). Existing `useFormPersistence` is extended to capture the inline-vehicle drafts so web reload still recovers the form (FR-013).

The orchestration logic for "save person, then save N vehicles, surface partial-failure per entry without recreating the person" (FR-007 + edge cases) lives in the new shared hook so the same retry/state model is reused across all three call sites. All vehicle writes go through `POST /api/vehicles` — the existing endpoint and `createVehicleSchema` discriminated union are unchanged. The existing API-level `ForbiddenException` in `VehiclesService.create` already rejects guard-on-resident vehicle writes (`apps/api/src/modules/vehicles/vehicles.service.ts:21-23`), so FR-008 is enforced server-side without API changes; the UI gate is defense in depth.

This is a presentation-layer feature: zero schema changes, zero new endpoints, zero new Zod validators (the existing `createVehicleSchema` is reused), no providers migration, and no desktop offline/outbox work because visitor/provider create is already online-only (per spec 013 and the spec's Assumptions section).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS
**Primary Dependencies**:
- Web (`apps/web`): Next.js 16 (App Router), `next-intl` v4, TanStack Query v5, `@ramcar/ui` (`Sheet`, `Button`, `Input`, `Label`, `Separator`), `@ramcar/features/shared/vehicle-form`, `@ramcar/features/visitors`, `@ramcar/store` (Zustand auth slice for actor role).
- Desktop (`apps/desktop`): Electron 30 + Vite + React 18, `react-i18next`, TanStack Query v5, `@ramcar/ui`, `@ramcar/features/shared/vehicle-form`, `@ramcar/features/visitors`.
- Shared (`packages/features/src/shared/vehicle-form`): React 18 + TanStack Query v5 + `@ramcar/shared` (`createVehicleSchema`, `CreateVehicleInput`, `Vehicle` types — all unchanged) + adapter hooks (`useI18n`, `useTransport`, `useRole`).
- API (`apps/api`): No changes. Existing NestJS `VehiclesService.create` enforces FR-008 server-side.
**Storage**: N/A — presentation-only. Existing `vehicles` table reused via existing `POST /api/vehicles`. Existing `profiles` and `visit_persons` tables reused via existing `POST /api/users` and `POST /api/visit-persons`. No PostgreSQL schema change. No SQLite change. No outbox column. The web user form's `useFormPersistence` already persists to `localStorage` under keys `user-create` / `user-edit-<id>`; we extend the persisted snapshot to include the inline vehicle draft list — no new storage location.
**Testing**: Vitest (+ `@testing-library/react`, `@testing-library/jest-dom`) for unit/integration tests in `packages/features/src/shared/vehicle-form/__tests__/`, `packages/features/src/visitors/__tests__/`, `apps/web/src/features/users/__tests__/`, `apps/web/src/features/providers/__tests__/`, `apps/desktop/src/features/providers/__tests__/`. Optional Playwright happy-path E2E at `apps/web/e2e/inline-vehicle-create.spec.ts`. Jest at `apps/api/src/modules/vehicles/__tests__/` (existing — not changed by this spec, but the existing 403-on-guard-resident-vehicle test is the load-bearing API-level safety net for FR-008).
**Target Platform**: Web (Next.js portal, authenticated, responsive — Sheet at `w-[400px] sm:w-[800px]`) + Desktop (Electron on macOS / Windows / Linux for guard booths). The mobile app is unaffected (lives in the separate `ramcar-mobile` repo).
**Project Type**: Multi-app web/desktop monorepo (Turborepo + pnpm workspaces). Cross-app shared feature module pattern per `CLAUDE.md` and spec 014.
**Performance Goals**: Inline-add → field interactivity in < 100 ms (no network call until Save). Save action with one inline vehicle: total wall-clock < the sum of `POST /visit-persons` + `POST /vehicles` p95 in the current sequential-form flow (i.e., no slower than today, since the same two requests are issued; the win is the eliminated screen transitions and re-renders, not request latency). Save with 5 inline vehicles for a resident: vehicle requests are issued sequentially (not in parallel) so server-side plate-uniqueness errors surface against the right entry; UI must remain responsive during the in-flight period (per-entry pending state shown inline).
**Constraints**:
- Right-side `Sheet` only — no dedicated `/new` or `/[id]/edit` page route added (per the "Create / Edit forms — right-side Sheet, never a dedicated page" non-negotiable in `CLAUDE.md`).
- Shared inline-vehicle component MUST live in `packages/features/src/shared/` and MUST NOT import `next/*`, `"use client"`, `window.electron`, or any concrete i18n library (per "Cross-App Shared Feature Modules" non-negotiable).
- All vehicle writes go through `POST /api/vehicles` — no direct Supabase `.from()`/`.rpc()`/`.storage` calls from the frontend (Constitution Principle VIII).
- Existing `createVehicleSchema` is reused without modification (Constitution Principle V — no per-app validation duplication).
- The web user form's existing `useFormPersistence` draft-recovery key namespace (`user-create`, `user-edit-<id>`) MUST remain stable; the inline-vehicle draft list is folded into the existing snapshot, not stored under a new key.
- Guard-on-resident vehicle writes MUST be rejected by both UI and API (FR-008). The API-level reject already lives in `VehiclesService.create`; we add only the UI-side hide + the test that exercises both layers.
**Scale/Scope**:
- 1 new shared component (`InlineVehicleSection`) + 1 new shared hook (`useInlineVehicleSubmissions`) in `packages/features/src/shared/vehicle-form/`.
- 5 component edits (`VisitPersonForm` shared, `ProviderForm` web, `ProviderForm` desktop, `UserForm` web, plus the matching three `*Sidebar` orchestrations to thread the new submission state).
- 4 hook edits to thread inline vehicle creates through the existing person-create handlers (`handleCreatePerson` in `VisitorsView`, the equivalent in web/desktop providers page-clients, and the `onSubmit` callback in `UserSidebar`).
- 1 i18n key set added to `packages/i18n/src/messages/{en,es}.json` under a new `vehicles.inline.*` namespace (≤ 8 strings).
- 0 NestJS edits, 0 DB migrations, 0 schema changes, 0 new packages, 0 new dependencies.
- Estimated total: ~6 new tests, ~4 existing tests updated, ~12 component-level edits.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-Tenant Isolation** | ✅ Pass | No new DB queries. Existing `POST /api/vehicles` and `POST /api/visit-persons` and `POST /api/users` are already scoped via `TenantGuard` + `@CurrentTenant()`. The TanStack Query keys for vehicles already include `tenantId` (see `vehicle-form.tsx:111`). Inline submissions use the same keys, so cache invalidation respects the active tenant. |
| **II. Feature-Based Architecture** | ✅ Pass | Shared inline vehicle logic lives in `packages/features/src/shared/vehicle-form/` — co-located with the existing `VehicleForm` and `VehicleManageList`. Per-app integrations stay inside the relevant `features/[domain]/` directories. No business logic added to `app/` route files. |
| **III. Strict Import Boundaries** | ✅ Pass | `<InlineVehicleSection />` is consumed by `visitors`, `providers`, and `users` features through the shared package — no `features/A/` → `features/B/` direct import is introduced. The shared module imports only from `@ramcar/ui`, `@ramcar/shared`, and the existing adapter ports — no host-app imports flow back into shared. |
| **IV. Offline-First Desktop** | ✅ Pass | Visitor/provider create is already online-only (per spec 013 + this spec's Assumptions). Inline vehicle creation in those flows is therefore also online-only at the booth, matching today. No SQLite changes, no outbox column changes. The desktop residents access-event surface is untouched (it does not include resident creation). |
| **V. Shared Validation via Zod** | ✅ Pass | `createVehicleSchema` (the existing discriminated union on `ownerType`) is reused verbatim. No new schema added in `packages/shared/src/validators/`. Each inline draft row is validated through the same `safeParse` call already used by `VehicleForm`. |
| **VI. Role-Based Access Control** | ✅ Pass | The UI gate hides `<InlineVehicleSection />` for `role === "guard"` when the parent person is a resident (FR-008). The API-level reject in `VehiclesService.create` is the authoritative enforcement (defense in depth — `apps/api/src/modules/vehicles/vehicles.service.ts:21-23`). Visitor/provider inline-add is permitted for all roles, matching today's vehicle-creation permissions. |
| **VII. TypeScript Strict Mode** | ✅ Pass | All touched files live in strict-mode workspaces. No new `any`. The hook's `InlineVehicleEntry` discriminated union encodes the per-entry status (`"draft" \| "saving" \| "saved" \| "error"`) so consumers cannot mis-handle a partial state. |
| **VIII. API-First Data Access** | ✅ Pass | All vehicle writes go through `transport.post<Vehicle>("/vehicles", …)` (existing adapter). All person writes go through `apiClient.post("/users", …)` (web users hook) or `transport.post("/visit-persons", …)` (shared visitors hook). Zero `supabase.from()`/`.rpc()`/`.storage` introduced. |

**Result**: No violations. Proceeding to Phase 0. Re-evaluation after Phase 1 design expected to produce the same result (the design adds no new dependencies, no new data flows, and no cross-boundary imports).

## Project Structure

### Documentation (this feature)

```text
specs/025-inline-vehicle-create/
├── plan.md                  # This file (/speckit.plan output)
├── research.md              # Phase 0 output — orchestration decisions, partial-failure UX, role-gate placement
├── data-model.md            # Phase 1 output — Inline Vehicle Entry (UI state) + reused entity inventory
├── quickstart.md            # Phase 1 output — manual verification walkthrough across web + desktop
├── contracts/
│   └── inline-vehicle-section.md   # Phase 1 output — UI prop contracts for <InlineVehicleSection /> and useInlineVehicleSubmissions
├── checklists/              # (populated by /speckit.checklist if desired — not required for this presentation-only feature)
└── tasks.md                 # Phase 2 output (created by /speckit.tasks — NOT by this command)
```

### Source Code (repository root)

Changes are **edits + 2 new files in the shared package + 1 new test file per host app**. Touched paths:

```text
packages/features/src/shared/vehicle-form/
├── inline-vehicle-section.tsx                   # NEW — list of draft vehicle rows + add/remove + per-entry submit status
├── use-inline-vehicle-submissions.ts            # NEW — hook: orchestrates POST /vehicles per entry; tracks {draft|saving|saved|error}
├── vehicle-form.tsx                             # unchanged — fields/validation source of truth (composed inside InlineVehicleSection rows)
├── vehicle-manage-list.tsx                      # unchanged — used in edit/manage flows, not in create
├── vehicle-type-select.tsx                      # unchanged
├── index.ts                                     # EDIT — add `export { InlineVehicleSection } from "./inline-vehicle-section"` and `export { useInlineVehicleSubmissions } from "./use-inline-vehicle-submissions"`
└── __tests__/
    ├── inline-vehicle-section.test.tsx          # NEW — add row, remove row, per-row error, multi-row mixed status
    └── use-inline-vehicle-submissions.test.ts   # NEW — orchestration: success, single failure, retry-without-recreate

packages/features/src/visitors/
├── components/
│   ├── visit-person-form.tsx                    # EDIT — render <InlineVehicleSection /> below the existing fields; thread inlineVehicleDrafts to onSave
│   ├── visit-person-sidebar.tsx                 # EDIT — pass inline submissions state to VisitPersonForm; on success-with-one-vehicle, set justCreatedVehicleId so AccessEventForm pre-selects it
│   └── visitors-view.tsx                        # EDIT — handleCreatePerson now also drives useInlineVehicleSubmissions; on partial failure, keep sidebar open and surface per-entry errors
├── hooks/
│   └── use-create-visit-person.ts               # unchanged — single-record mutation; vehicle inserts are issued by the new shared hook after this resolves
└── __tests__/
    ├── visit-person-form.test.tsx               # EDIT — add coverage: inline section visible in create mode, hidden in edit
    └── visitors-view-inline-vehicle.test.tsx    # NEW — full happy-path + partial-failure + cancel-after-person-saved

apps/web/src/features/providers/
├── components/
│   ├── provider-form.tsx                        # EDIT — render <InlineVehicleSection /> below the existing fields; thread drafts to onSave
│   ├── provider-sidebar.tsx                     # EDIT — same pattern as VisitPersonSidebar; pre-select just-created vehicle
│   └── providers-page-client.tsx                # EDIT — handleCreatePerson drives useInlineVehicleSubmissions
└── __tests__/
    └── provider-inline-vehicle.test.tsx         # NEW — provider-side happy path

apps/desktop/src/features/providers/
├── components/
│   ├── provider-form.tsx                        # EDIT — symmetric with web ProviderForm
│   ├── provider-sidebar.tsx                     # EDIT — symmetric with web ProviderSidebar
│   └── providers-page-client.tsx                # EDIT — symmetric with web providers-page-client
└── __tests__/
    └── provider-inline-vehicle.test.tsx         # NEW — desktop-side happy path (uses react-i18next adapter)

apps/web/src/features/users/
├── components/
│   ├── user-form.tsx                            # EDIT — render <InlineVehicleSection /> when formData.role === "resident"; gate hide for guard role; thread drafts to onSubmit
│   ├── user-sidebar.tsx                         # EDIT — handleSubmit now creates the user, then drives useInlineVehicleSubmissions
│   └── users-table.tsx                          # unchanged — already opens the sidebar
├── hooks/
│   └── use-create-user.ts                       # unchanged — single-record mutation
└── __tests__/
    └── user-form-inline-vehicle.test.tsx        # NEW — resident path: adds vehicles inline; non-resident path: section hidden; guard role: section hidden

apps/web/src/shared/hooks/
└── use-form-persistence.ts                      # EDIT (additive) — accept the inline-vehicle draft list inside the persisted snapshot (no key change; just widen the serialized shape so {…userFormFields, inlineVehicles} round-trips)

packages/i18n/src/messages/
├── en.json                                      # +vehicles.inline.{addEntry, removeEntry, savingEntry, savedEntry, retryEntry, sectionTitle, sectionTitleResident, errorPlateInUse}
├── es.json                                      # mirror of en.json additions
├── en.ts                                        # +type entries (if `as const` re-exports are used)
└── es.ts                                        # mirror

# Nothing else touched.
# No changes in apps/api/.
# No changes in packages/shared, packages/store, packages/ui, packages/db-types.
# No changes in apps/desktop residents/visits/access-log (residents on desktop don't have create — it's an access-event sidebar).
# No DB migrations.
# No new package installs.
# No update to shared-features.json (the inline section is a new export inside the existing `vehicle-form` shared primitive — the manifest already covers `vehicle-form` indirectly through the `visitors` migration entry).
```

**Structure Decision**: This is a **mixed-surface presentation feature** — bi-app for visitors + providers, single-app web for residents. The shared inline-vehicle UI lives in `packages/features/src/shared/vehicle-form/` so all three surfaces consume one implementation, satisfying the FR-012 requirement that vehicle field rendering and validation are not forked. The orchestration hook `useInlineVehicleSubmissions` also lives in the shared package so the partial-failure / retry-per-entry / no-recreate-person state machine is identical at all three call sites. The web-only resident integration adds a single conditional render gate inside `user-form.tsx` and folds the inline drafts into the existing `useFormPersistence` snapshot, satisfying FR-013 without introducing a new persistence key.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
