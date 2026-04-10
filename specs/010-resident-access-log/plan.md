# Implementation Plan: Resident Access Log

**Branch**: `010-resident-access-log` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-resident-access-log/spec.md`

## Summary

Implement the "Residentes" submodule under the visits-and-residents sidebar group. Guards, admins, and super_admins use this page to log resident entry/exit access events. The page displays a searchable, keyboard-navigable table of residents. Clicking a row (or pressing Enter) opens an animated right sidebar (Sheet) with an access event form showing the resident's last event as context, direction (defaulting to "Entry"), access mode (vehicle/pedestrian), and conditional vehicle selection with inline registration. Saving creates an append-only access event and closes the sidebar with a toast. The feature spans web, desktop, and API layers, requiring new database tables (`vehicles`, `access_events`), three new API modules, shared Zod validators, and i18n translations.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS  
**Primary Dependencies**: Next.js 16 (App Router), NestJS v11, Electron 30 + Vite + React 18, shadcn/ui (Sheet, Table, Select, Button, Input, Badge, Skeleton), TanStack Query v5, Zustand, Supabase JS v2, @supabase/ssr, Zod, next-intl v4, react-i18next, lucide-react  
**Storage**: PostgreSQL via Supabase (`vehicles`, `access_events` tables — new), SQLite (desktop offline cache)  
**Testing**: Vitest (frontend + packages), Jest + ts-jest (api), Playwright (E2E)  
**Target Platform**: Web (Next.js), Desktop (Electron), API (NestJS)  
**Project Type**: Multi-app monorepo (pnpm workspaces + Turborepo)  
**Performance Goals**: Sub-500ms search response, sub-30s full workflow  
**Constraints**: Offline-capable desktop (Outbox pattern + SQLite), multi-tenant isolation (RLS + TenantGuard), API-first data access  
**Scale/Scope**: 500+ residents per community, append-only access events

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Multi-Tenant Isolation (NON-NEGOTIABLE) | PASS | `vehicles` and `access_events` tables include `tenant_id` column. RLS policies enforce tenant boundaries. TenantGuard on all API endpoints. |
| II. Feature-Based Architecture | PASS | Frontend: `src/features/residents/`. Backend: `src/modules/residents/`, `src/modules/vehicles/`, `src/modules/access-events/`. Desktop: `electron/services/`, `electron/repositories/`, `electron/ipc/`. |
| III. Strict Import Boundaries (NON-NEGOTIABLE) | PASS | Reusable vehicle form placed in `src/shared/components/` (not in any feature directory). Backend cross-module communication via NestJS DI (ResidentsModule imports UsersModule, VehiclesModule). |
| IV. Offline-First Desktop (NON-NEGOTIABLE) | PASS | Desktop stores access events in SQLite via Outbox pattern with UUID `event_id` for idempotent sync. SyncSlice states reflected in UI. Vehicle cache in SQLite for offline vehicle selection. |
| V. Shared Validation via Zod | PASS | `createAccessEventSchema`, `createVehicleSchema`, `residentFiltersSchema` defined in `@ramcar/shared/validators/`. Reused by NestJS validation pipe and frontend forms. |
| VI. Role-Based Access Control | PASS | API endpoints protected with `@Roles("guard", "admin", "super_admin")`. RLS policies mirror role restrictions. Frontend hides based on role but does not rely on it as sole auth. |
| VII. TypeScript Strict Mode | PASS | All new code under `strict: true`. No `any` types. |
| VIII. API-First Data Access (NON-NEGOTIABLE) | PASS | All DB operations through NestJS API. Frontend uses TanStack Query -> API endpoints. Desktop writes through API (online) or SQLite outbox (offline). |

**Result**: All 8 principles pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/010-resident-access-log/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── residents-api.md
│   ├── vehicles-api.md
│   └── access-events-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# ── Database Migration ──────────────────────────────────────────
supabase/migrations/
└── {timestamp}_create_vehicles_and_access_events.sql

# ── Shared Packages ─────────────────────────────────────────────
packages/shared/src/
├── types/
│   ├── vehicle.ts                    # Vehicle types + enums
│   └── access-event.ts              # AccessEvent types + enums
├── validators/
│   ├── vehicle.ts                    # createVehicleSchema, vehicleFiltersSchema
│   └── access-event.ts              # createAccessEventSchema
└── index.ts                          # Re-export new types + validators

packages/i18n/src/messages/
├── en.json                           # Add "residents" + "vehicles" + "accessEvents" sections
└── es.json                           # Add "residents" + "vehicles" + "accessEvents" sections

# ── Navigation Config ───────────────────────────────────────────
packages/shared/src/navigation/
└── sidebar-config.ts                 # Update visits-and-residents: add sub-items, update roles

# ── API Backend ─────────────────────────────────────────────────
apps/api/src/
├── app.module.ts                     # Register ResidentsModule, VehiclesModule, AccessEventsModule
└── modules/
    ├── residents/
    │   ├── residents.module.ts       # Imports UsersModule, VehiclesModule
    │   ├── residents.controller.ts   # GET /residents, GET /residents/:id/vehicles
    │   ├── residents.service.ts      # Thin wrapper filtering users by role=resident
    │   └── dto/
    │       └── resident-filters.dto.ts
    ├── vehicles/
    │   ├── vehicles.module.ts
    │   ├── vehicles.controller.ts    # POST /vehicles
    │   ├── vehicles.service.ts
    │   ├── vehicles.repository.ts    # Supabase queries on vehicles table
    │   └── dto/
    │       ├── create-vehicle.dto.ts
    │       └── vehicle-response.dto.ts
    └── access-events/
        ├── access-events.module.ts
        ├── access-events.controller.ts  # POST /access-events, GET /access-events/last/:userId
        ├── access-events.service.ts
        ├── access-events.repository.ts  # Supabase queries on access_events table
        └── dto/
            ├── create-access-event.dto.ts
            └── access-event-response.dto.ts

# ── Web Frontend ────────────────────────────────────────────────
apps/web/src/
├── app/[locale]/(dashboard)/visits-and-residents/
│   ├── page.tsx                      # Redirect or index for visits-and-residents
│   └── residents/
│       └── page.tsx                  # Route entry point (server component)
├── features/residents/
│   ├── components/
│   │   ├── residents-page-client.tsx # Client orchestrator (state, keyboard, sidebar)
│   │   ├── residents-table.tsx       # Table with search, pagination, row click
│   │   ├── residents-table-columns.tsx
│   │   ├── access-event-sidebar.tsx  # Sheet wrapper (animated right panel)
│   │   ├── access-event-form.tsx     # Direction, mode, vehicle select + save
│   │   └── last-event-badge.tsx      # Read-only last access event display
│   ├── hooks/
│   │   ├── use-residents.ts          # TanStack Query: GET /residents
│   │   ├── use-resident-vehicles.ts  # TanStack Query: GET /residents/:id/vehicles
│   │   ├── use-last-access-event.ts  # TanStack Query: GET /access-events/last/:userId
│   │   ├── use-create-access-event.ts # TanStack Mutation: POST /access-events
│   │   ├── use-create-vehicle.ts     # TanStack Mutation: POST /vehicles
│   │   └── use-keyboard-navigation.ts # B-key, arrow keys, Enter key handling
│   └── types/
│       └── index.ts                  # Feature-local type re-exports if needed
└── shared/components/
    └── vehicle-form/
        ├── vehicle-form.tsx          # Reusable vehicle registration form
        └── vehicle-type-select.tsx   # Vehicle type dropdown (from enum)

# ── Desktop App ─────────────────────────────────────────────────
apps/desktop/
├── electron/
│   ├── ipc/
│   │   ├── residents-handlers.ts     # IPC handlers for resident queries
│   │   ├── vehicles-handlers.ts      # IPC handlers for vehicle CRUD
│   │   └── access-events-handlers.ts # IPC handlers for access event CRUD
│   ├── services/
│   │   ├── residents.service.ts      # Online: API call. Offline: SQLite cache
│   │   ├── vehicles.service.ts       # Online: API call. Offline: SQLite cache
│   │   └── access-events.service.ts  # Online: API call. Offline: SQLite outbox
│   └── repositories/
│       ├── vehicles.repository.ts    # SQLite CRUD for vehicles cache
│       └── access-events.repository.ts # SQLite CRUD + outbox for access events
├── src/
│   ├── features/residents/           # Same component/hook structure as web
│   │   ├── components/
│   │   │   ├── residents-page.tsx
│   │   │   ├── residents-table.tsx
│   │   │   ├── residents-table-columns.tsx
│   │   │   ├── access-event-sidebar.tsx
│   │   │   ├── access-event-form.tsx
│   │   │   └── last-event-badge.tsx
│   │   ├── hooks/
│   │   │   ├── use-residents.ts      # Calls window.api.getResidents()
│   │   │   ├── use-resident-vehicles.ts
│   │   │   ├── use-last-access-event.ts
│   │   │   ├── use-create-access-event.ts
│   │   │   ├── use-create-vehicle.ts
│   │   │   └── use-keyboard-navigation.ts
│   │   └── types/
│   │       └── index.ts
│   └── shared/components/
│       └── vehicle-form/
│           ├── vehicle-form.tsx
│           └── vehicle-type-select.tsx
└── electron/preload.ts              # Add residents, vehicles, access-events bridges
```

**Structure Decision**: Follows the established monorepo patterns. Three new API modules (residents, vehicles, access-events) follow the existing controller → service → repository pattern. The `residents` module is a thin facade that imports `UsersModule` for user queries filtered by role. The reusable vehicle form lives in `src/shared/components/` in both web and desktop apps, satisfying the cross-feature reuse requirement (FR-010) without violating import boundaries.

## Complexity Tracking

> No constitution violations detected. This section is intentionally empty.
