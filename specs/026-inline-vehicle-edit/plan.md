# Implementation Plan: Inline Vehicle Edit and Delete in Person Sidebars

**Branch**: `026-inline-vehicle-edit` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-inline-vehicle-edit/spec.md`

## Summary

Spec 025 folded vehicle creation into the person create sidebar. The natural follow-up — fixing a typo on a vehicle the user just created, or deleting a vehicle that should no longer exist — is impossible from the same sidebar today: vehicle edit/delete only lives in the residents access-event flow on the web (`apps/web/src/features/residents/components/access-event-sidebar.tsx`). This feature carries that surface to:

1. **Visit-person sidebar (cross-app, web + desktop)** — view mode (post-creation, the access-event step) and edit mode. Reuses the same shared `VehicleManageList` component and the same `<VehicleForm mode="edit" />`. Guards see edit-only on visit-person rows; admins/super-admins see edit + delete (FR-006/FR-007).
2. **User edit sidebar (web-only)** — gated to `role === "resident"` users. Admins/super-admins see edit + delete; the section is not rendered for guards or for non-resident users (FR-003/FR-008).

The work is **mostly orchestration in the parent sidebars**: the `VehicleManageList` already exists and already handles list rendering, the trash confirmation dialog, the soft-delete mutation, the toast taxonomy, and cache invalidation. Two presentation-layer changes are required:

- **Generalize `VehicleManageList`'s owner prop** from `residentId: string` to a discriminated union `owner: { kind: "resident"; userId: string } | { kind: "visitPerson"; visitPersonId: string }`. The cache key already follows the `["vehicles", tenantId, ownerKind, ownerId]` shape used by the existing fetch hooks (`useResidentVehicles`, `useVisitPersonVehicles`), so invalidation works for both owner kinds with one code path.
- **Add a `canDelete` prop** (default `true`) so the parent can hide the trash icon for guards on visit-person vehicles (FR-007). The component does not check `useRole()` itself — the parent computes `canDelete` from role + owner kind, the same way the existing residents access-event-sidebar gates the entire `view === "manage"` branch on `canManageVehicles`. Keeps role logic in one explicit place per surface.

Three sidebars (`visit-person-sidebar`, `provider-sidebar` on web + desktop, web `user-sidebar`) gain the same `default | manage | edit-vehicle | create-vehicle` view-state machine that `access-event-sidebar` already uses. The transition wiring is symmetric across surfaces and is the bulk of the diff; the existing pattern is the template.

The single API change is **FR-012**: `VehiclesService.remove` (`apps/api/src/modules/vehicles/vehicles.service.ts:62-75`) currently rejects guard deletes only when `existing.user_id !== null`. The condition becomes "any guard delete is forbidden" (drop the resident-owner check). Update the existing service spec to add the symmetric "forbids guards deleting visit-person-owned vehicles" test (currently missing — the spec only covers guard-on-resident).

This is otherwise a presentation-layer feature: zero schema changes, zero new endpoints, zero new Zod validators (the existing `updateVehicleSchema` is reused), no new desktop offline operations, no new packages. Edit and delete go through `PATCH /api/vehicles/:id` and `DELETE /api/vehicles/:id` — the endpoints already exist with role guards.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS
**Primary Dependencies**:
- Web (`apps/web`): Next.js 16 (App Router), `next-intl` v4, TanStack Query v5, `@ramcar/ui` (`Sheet`, `AlertDialog`, `Button`), `@ramcar/features/shared/vehicle-form` (`VehicleForm`, `VehicleManageList`), `@ramcar/features/visitors`, `@ramcar/features/adapters` (`useRole` for role-gated UI), Zustand via `@ramcar/store` for actor identity.
- Desktop (`apps/desktop`): Electron 30 + Vite + React 18, `react-i18next`, TanStack Query v5, `@ramcar/ui`, same shared modules as web. Visitor/provider edit + access-event surfaces are already on desktop; this spec extends the same view-state machine that the desktop access-event-sidebar for residents already uses.
- Shared (`packages/features/src/shared/vehicle-form`): React 18 + TanStack Query v5 + `@ramcar/shared` (`Vehicle`, `updateVehicleSchema` — unchanged) + adapter ports (`useI18n`, `useTransport`, `useRole`).
- API (`apps/api`): NestJS v11. Single behavioral change in `VehiclesService.remove` per FR-012; no new endpoints, controllers, or DTOs.
**Storage**: N/A — this feature does not introduce or modify any persisted entity. No PostgreSQL change. No Supabase Storage change. No SQLite change. No outbox column. The TanStack Query cache keys already in use (`["vehicles", tenantId, "resident", id]` and `["vehicles", tenantId, "visit-person", id]`) carry through unchanged.
**Testing**:
- Vitest (+ `@testing-library/react`, `@testing-library/jest-dom`) for the shared component change in `packages/features/src/shared/vehicle-form/__tests__/vehicle-manage-list.test.tsx` (extend existing) and for the four host-app sidebar wirings (`visit-person-sidebar`, `provider-sidebar` web + desktop, web `user-sidebar`).
- Jest + ts-jest at `apps/api/src/modules/vehicles/__tests__/vehicles.service.spec.ts` (extend existing — add a "forbids guards deleting visit-person vehicles" test; verify admin still passes).
- Optional Playwright happy-path E2E at `apps/web/e2e/inline-vehicle-edit.spec.ts` covering: open a resident in the user catalog, edit a vehicle plate, confirm the list refreshes, then delete a vehicle from the same sidebar and confirm it disappears.
- The existing residents access-event-sidebar Vitest suite (`apps/web/src/features/residents/__tests__/`) acts as the SC-006 regression net — must continue to pass after the `VehicleManageList` prop generalization.
**Target Platform**: Web (Next.js portal, authenticated, responsive — Sheet at `w-[400px] sm:w-[800px]`) + Desktop (Electron on macOS / Windows / Linux for guard booths). Mobile (`ramcar-mobile`) is unaffected.
**Project Type**: Multi-app web/desktop monorepo (Turborepo + pnpm workspaces). Cross-app shared feature module pattern per `CLAUDE.md` and spec 014.
**Performance Goals**:
- Edit-pencil click → vehicle form rendered with fields populated: < 100 ms (no network call; the vehicle is already in the cached list).
- Delete confirm → list refresh: bounded by `DELETE /api/vehicles/:id` p95 + the cache invalidation cycle. The existing component already invalidates by exact key so unrelated lists are not refetched.
- View-mode "manage vehicles" entry on the visit-person sidebar must not introduce an extra round-trip — the vehicle list is already fetched (`useVisitPersonVehicles` runs as soon as the sidebar opens for a person). The new view is rendered against the existing cache.
**Constraints**:
- Right-side `Sheet` only — no dedicated `/manage` or `/[id]/edit` page route added (per the "Create / Edit forms — right-side Sheet, never a dedicated page" non-negotiable in `CLAUDE.md`). The existing `default | create | manage | edit` view-state machine is a sub-state inside the same Sheet; no `router.push` added.
- The shared component generalization MUST keep `VehicleManageList` strictly inside `packages/features/src/shared/`. No `next/*`, no `"use client"`, no `window.electron`, no concrete i18n library. The only dependencies it adds (`useRole` for the optional internal defense-in-depth check) are already adapter ports.
- All vehicle writes go through `PATCH /api/vehicles/:id` and `DELETE /api/vehicles/:id` (Constitution Principle VIII). Frontend code MUST NOT bypass the API.
- `updateVehicleSchema` is reused without modification (Principle V — no per-app validation duplication).
- The existing API-level guard rejection on resident-owned vehicle deletes (`vehicles.service.ts:69`) MUST remain in force; FR-012 _extends_ it to all guard deletes (drop the `user_id !== null` qualifier). Existing service spec covering guard-on-resident must continue to pass.
- The existing residents access-event-sidebar surface (`apps/web/src/features/residents/components/access-event-sidebar.tsx` + the symmetric desktop file) MUST render and behave identically for the resident access-event flow after the `VehicleManageList` prop change (SC-006). The two call sites are updated in lockstep with the prop change.
**Scale/Scope**:
- 1 shared component edit (`vehicle-manage-list.tsx`: prop change `residentId` → `owner` discriminated union + `canDelete` flag).
- 5 sidebar component edits to add the `default | manage | edit-vehicle | create-vehicle` view-state machine where it doesn't yet exist:
  - `packages/features/src/visitors/components/visit-person-sidebar.tsx` (cross-app — covers visitors on web + desktop in one shot).
  - `apps/web/src/features/providers/components/provider-sidebar.tsx`.
  - `apps/desktop/src/features/providers/components/provider-sidebar.tsx`.
  - `apps/web/src/features/users/components/user-sidebar.tsx` (gated to `role === "resident"`).
  - Plus: `apps/web/src/features/residents/components/access-event-sidebar.tsx` and `apps/desktop/src/features/residents/components/access-event-sidebar.tsx` — small edits to update the prop name (`residentId` → `owner`).
- 1 NestJS service edit (`apps/api/src/modules/vehicles/vehicles.service.ts:62-75` — drop the `user_id !== null` qualifier on the guard-delete check) + 1 new test in the existing spec.
- 0 new packages, 0 new dependencies, 0 DB migrations, 0 new endpoints, 0 new DTOs, 0 new i18n keys (every user-facing string this feature needs already exists — `vehicles.manageTitle`, `vehicles.manage.empty`, `vehicles.manage.editAction`, `vehicles.manage.deleteAction`, `vehicles.deleteConfirm.*`, `vehicles.messages.{updated, deleted, errorUpdating, errorDeleting, forbidden}`).
- Estimated total: ~3 new tests, ~2 existing tests updated, ~7 component-level edits, ~1 service edit.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-Tenant Isolation** | ✅ Pass | No new DB queries. Existing `PATCH /api/vehicles/:id` and `DELETE /api/vehicles/:id` are scoped via `TenantGuard` + `@CurrentTenant()`. The TanStack Query keys for vehicles already include `tenantId` (per `vehicle-manage-list.tsx:44` and `useVisitPersonVehicles`/`useResidentVehicles`). Cross-tenant cache pollution is impossible. |
| **II. Feature-Based Architecture** | ✅ Pass | Shared list/edit logic stays in `packages/features/src/shared/vehicle-form/`. Visit-person orchestration stays in `packages/features/src/visitors/`. Provider orchestration stays in `apps/{web,desktop}/src/features/providers/`. User-residents orchestration stays in `apps/web/src/features/users/`. No business logic added to `app/` route files. |
| **III. Strict Import Boundaries** | ✅ Pass | All consumers import the generalized `VehicleManageList` from `@ramcar/features/shared/vehicle-form` — no `features/A/` → `features/B/` direct import is introduced. The shared module imports only from `@ramcar/ui`, `@ramcar/shared`, `lucide-react`, `sonner`, `@tanstack/react-query`, and the adapter ports. |
| **IV. Offline-First Desktop** | ✅ Pass | Edit and delete on the desktop go through whatever transport adapter the desktop already wires for `vehicle.update` and `vehicle.delete`. This spec does not introduce new offline operations: if the desktop adapter currently routes these through the outbox, the action queues; if it routes them through HTTP, the action requires connectivity. Either way, behavior matches the existing residents access-event-sidebar surface (which already uses `VehicleManageList` on desktop today) — same offline gap, no regression introduced. |
| **V. Shared Validation via Zod** | ✅ Pass | `updateVehicleSchema` (existing, in `@ramcar/shared`) is reused verbatim by the existing `<VehicleForm mode="edit" />`. No new validator added. |
| **VI. Role-Based Access Control** | ✅ Pass | UI gate: `canDelete` prop on `VehicleManageList` is computed at the parent from `role` + owner kind. Per FR-007, guards on visit-person rows pass `canDelete={false}` and the trash icon is not rendered. Per FR-008, the user edit sidebar does not mount the section for guards or for non-resident users. API-level enforcement: existing `RolesGuard` on `VehiclesController` (lines 27-28) plus the in-service check in `VehiclesService.remove` (line 69) — extended by FR-012 to cover all guard deletes regardless of owner type. Defense in depth at both layers. |
| **VII. TypeScript Strict Mode** | ✅ Pass | All touched files live in strict-mode workspaces. No new `any`. The `VehicleManageList` owner prop becomes a discriminated union — TypeScript narrowing will force every consumer to pick one variant explicitly. The `canDelete` flag defaults to `true` to preserve existing call-site semantics on the residents access-event-sidebar without requiring a code change there beyond the owner-shape rename. |
| **VIII. API-First Data Access** | ✅ Pass | All vehicle writes go through `transport.patch<Vehicle>("/vehicles/${id}", …)` (already used by the existing `<VehicleForm mode="edit" />`) and `transport.delete<void>("/vehicles/${id}")` (already used by `VehicleManageList`). All vehicle reads go through `transport.get<Vehicle[]>("/vehicles", …)` (already used by `useVisitPersonVehicles` / `useResidentVehicles`). Zero `supabase.from()`/`.rpc()`/`.storage` introduced. |

**Result**: No violations. Proceeding to Phase 0. Re-evaluation after Phase 1 design expected to produce the same result (the design adds no new dependencies, no new data flows, and no cross-boundary imports).

### Post-Design Re-check (2026-04-29)

After Phase 0 (`research.md`) and Phase 1 (`data-model.md`, `contracts/vehicle-manage-list.md`, `contracts/api-vehicles.md`, `quickstart.md`), the design adds:

- One discriminated-union prop type (`VehicleOwner`) and one new optional boolean prop (`canDelete`) inside an existing shared component — no new package, no new module boundary.
- One service-layer rule tightening (`VehiclesService.remove` — drop the `user_id !== null` qualifier) — same exception, same status, fewer permitted paths.
- A `useEffect` in two existing pickers to clear stale selection — no new component.
- Sidebar view-state machines that are isomorphic to the one already in `apps/web/src/features/residents/components/access-event-sidebar.tsx`.

No new dependencies. No new endpoints. No new DTOs. No new i18n keys. No DB or Storage or SQLite changes.

| Principle | Status (post-design) | Notes |
|-----------|---------------------|-------|
| **I. Multi-Tenant Isolation** | ✅ Pass | Cache keys still include `tenantId`. No new query path. |
| **II. Feature-Based Architecture** | ✅ Pass | Shared list logic stays in `packages/features/src/shared/`. Per-app orchestration in `apps/[web,desktop]/src/features/`. |
| **III. Strict Import Boundaries** | ✅ Pass | Generalized component is consumed via the existing shared package import. No `features/A/` → `features/B/` introduced. |
| **IV. Offline-First Desktop** | ✅ Pass | Per D7: no new outbox kinds; behavior matches the existing residents access-event-sidebar surface on desktop. |
| **V. Shared Validation via Zod** | ✅ Pass | `updateVehicleSchema` reused as-is. |
| **VI. Role-Based Access Control** | ✅ Pass | UI gate at the parent (D2); API gate tightened in `VehiclesService.remove` (FR-012). |
| **VII. TypeScript Strict Mode** | ✅ Pass | Discriminated union forces narrowing at every call site. No new `any`. |
| **VIII. API-First Data Access** | ✅ Pass | All writes through `PATCH`/`DELETE /api/vehicles/:id`. No `supabase.from()` introduced. |

**Result**: No violations introduced by the Phase 1 design. The "Complexity Tracking" table remains empty. Phase 2 (`/speckit.tasks`) may proceed.

## Project Structure

### Documentation (this feature)

```text
specs/026-inline-vehicle-edit/
├── plan.md                  # This file (/speckit.plan output)
├── research.md              # Phase 0 output — three resolved decisions: (1) prop generalization shape, (2) role-gate placement, (3) sidebar view-state machine reuse
├── data-model.md            # Phase 1 output — entity inventory (Vehicle is reused, no new state shape)
├── quickstart.md            # Phase 1 output — manual verification walkthrough (guard fix-typo, admin delete, role-gate visibility) across web + desktop
├── contracts/
│   ├── vehicle-manage-list.md   # Phase 1 output — UI prop contract for the generalized component (owner discriminated union + canDelete)
│   └── api-vehicles.md          # Phase 1 output — DELETE /api/vehicles/:id behavior change (FR-012) + the unchanged PATCH endpoint contract for reference
├── checklists/              # Already populated (requirements.md exists from /speckit.checklist)
└── tasks.md                 # Phase 2 output (created by /speckit.tasks — NOT by this command)
```

### Source Code (repository root)

Changes are **edits in seven files + 1 NestJS service edit + extensions to two existing test files**. Touched paths:

```text
packages/features/src/shared/vehicle-form/
├── vehicle-manage-list.tsx                       # EDIT — prop shape: residentId:string  →  owner: {kind:"resident"; userId} | {kind:"visitPerson"; visitPersonId}; add canDelete?: boolean (default true); cache key derives from owner.kind; trash icon and confirm dialog gated on canDelete
├── vehicle-manage-list.test.tsx                  # EDIT — add: (a) renders for visit-person owner with the right cache key, (b) hides trash icon when canDelete={false}, (c) keeps existing resident behavior unchanged
├── index.ts                                      # unchanged — VehicleManageList already exported

packages/features/src/visitors/
├── components/
│   └── visit-person-sidebar.tsx                  # EDIT — add view-state machine: default | manage | edit-vehicle | create-vehicle (existing showVehicleForm boolean folded into it). View mode renders manage entry; edit mode renders manage block beneath VisitPersonEditForm for admins/super-admins. Guards on visit-person see manage with canDelete={false}.
└── __tests__/
    └── visit-person-sidebar-manage.test.tsx      # NEW — covers: open visit-person sidebar in view mode, open manage list, edit a vehicle, confirm picker refreshes; guard sees no trash icon; admin in edit mode sees the inline manage block.

apps/web/src/features/providers/
├── components/
│   └── provider-sidebar.tsx                      # EDIT — symmetric with visit-person-sidebar (same view-state machine, same role gate)
└── __tests__/
    └── provider-sidebar-manage.test.tsx          # NEW — same coverage shape as visitors

apps/desktop/src/features/providers/
└── components/
    └── provider-sidebar.tsx                      # EDIT — symmetric with web provider-sidebar

apps/web/src/features/users/
├── components/
│   └── user-sidebar.tsx                          # EDIT — for edit-mode + role==="resident", render VehicleManageList beneath UserForm (or a sub-view). Owner = {kind:"resident", userId: userData.id}. Gated to admin/super-admin (canDelete=true). Hidden for non-resident users and for guards.
└── __tests__/
    └── user-sidebar-manage.test.tsx              # NEW — covers: admin opens resident edit, sees vehicle list with edit + delete; admin opens admin/guard edit, no vehicle section; deletion confirm flow; edit pencil opens VehicleForm in edit mode and persists.

apps/web/src/features/residents/components/
└── access-event-sidebar.tsx                      # EDIT (small) — call-site update for the VehicleManageList prop rename: residentId={resident.id}  →  owner={{ kind: "resident", userId: resident.id }}

apps/desktop/src/features/residents/components/
└── access-event-sidebar.tsx                      # EDIT (small) — symmetric prop-rename with web

apps/api/src/modules/vehicles/
├── vehicles.service.ts                           # EDIT — line 69: remove the `(existing as { user_id }).user_id !== null` qualifier; check becomes `if (role === "guard") throw new ForbiddenException(...)` regardless of owner. Same exception class and message.
└── __tests__/
    └── vehicles.service.spec.ts                  # EDIT — add a "forbids guards deleting visit-person-owned vehicles" test in the VehiclesService.remove block; existing "forbids guards deleting resident vehicles" test continues to pass.

# Nothing else touched.
# No DB migrations.
# No package.json or tsconfig changes.
# No new dependencies.
# No changes in @ramcar/i18n (every string this feature needs already exists from spec 010 / spec 022).
# No changes in @ramcar/shared, @ramcar/store, @ramcar/ui, @ramcar/db-types.
# No update to shared-features.json (the shared module's exported surface widens its prop type — not a new export).
# No changes in apps/desktop visitors directory (the visitors flow is consumed via the shared @ramcar/features/visitors package — visit-person-sidebar above covers desktop too).
```

**Structure Decision**: This is a **mixed-surface presentation feature** — bi-app for visit-persons (visitors + providers) and single-app web for resident catalog edit. The shared list+delete UI lives in `packages/features/src/shared/vehicle-form/` so all four surfaces (residents access-event web, residents access-event desktop, visitors/providers web+desktop, web user-residents) consume one implementation, satisfying FR-004 / FR-016. The role gate is placed at the parent sidebar (computing `canDelete` from role + owner kind) for explicitness — exactly the pattern the existing `access-event-sidebar` already uses for `canManageVehicles`. The sidebar view-state machine (`default | manage | edit-vehicle | create-vehicle`) is the established `access-event-sidebar.tsx` template; the new sidebars adopt it verbatim with one addition for edit-mode embedding (the user-sidebar shows the manage block beneath the user edit form rather than as a sub-view, since the user edit form has multiple non-vehicle fields the admin may also be editing — this matches the existing visit-person-sidebar edit-mode layout pattern of stacking sections within the same Sheet body).

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
