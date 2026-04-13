# Implementation Plan: Visitor & Service Provider Access Logging

**Branch**: `011-visitor-provider-access` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-visitor-provider-access/spec.md`

## Summary

Add "Visitante" and "Proveedor" submodules under the visits-and-residents sidebar menu. Guards select or register a visitor/provider from a searchable list, then log their entry/exit via a right sidebar form — same UX pattern as the existing residents submodule. Includes image capture (webcam on desktop, file upload on web), inline vehicle registration, keyboard shortcuts, access event editing, and full desktop offline support via SQLite + outbox sync. Spans all three platforms: web (Next.js), desktop (Electron), and API (NestJS).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS  
**Primary Dependencies**: Next.js 16 (web), Electron 30 + Vite + React 18 (desktop), NestJS v11 (API), TanStack Query v5, Zustand, shadcn/ui (Radix + Tailwind), Zod, Supabase JS v2, next-intl v4 (web), react-i18next (desktop), better-sqlite3 (desktop offline)  
**Storage**: PostgreSQL via Supabase (visit_persons, visit_person_images, vehicles, access_events), Supabase Storage private bucket (image files), SQLite (desktop offline cache)  
**Testing**: Vitest (web, desktop, packages), Jest + ts-jest (API), Playwright (E2E)  
**Target Platform**: Web (browser), Desktop (Electron — macOS/Windows/Linux)  
**Project Type**: Multi-platform monorepo (web + desktop + API)  
**Performance Goals**: <10s existing person access event, <30s new registration, <1s search results  
**Constraints**: Offline-capable desktop (SQLite + outbox), multi-tenant isolation (RLS + TenantGuard), RBAC (guard/admin/super_admin)  
**Scale/Scope**: Hundreds of visit persons per tenant, dozens of access events per guard shift, ~4 image types per person

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | PASS | All new tables have tenant_id + RLS. All queries scoped via @CurrentTenant(). |
| II. Feature-Based Architecture | PASS | New features in `src/features/visitors/` and `src/features/providers/`. API in `src/modules/visit-persons/`. |
| III. Strict Import Boundaries | PASS | visitors/ and providers/ features don't import each other. Shared logic via `@ramcar/shared`. |
| IV. Offline-First Desktop | PASS | Full offline support: SQLite cache + outbox sync + local image storage. New infrastructure required. |
| V. Shared Validation via Zod | PASS | All new schemas in `@ramcar/shared`, reused by API validation and frontend forms. |
| VI. Role-Based Access Control | PASS | @Roles('super_admin', 'admin', 'guard') on all API endpoints. RLS policies mirror. |
| VII. TypeScript Strict Mode | PASS | All new code under strict: true. |
| VIII. API-First Data Access | PASS | Frontend → NestJS API → Supabase. No direct DB access from web/desktop. Storage uploads through API. |

**Post-Phase 1 re-check**: All principles remain satisfied. Image upload goes through NestJS API (not direct Supabase Storage from frontend). Desktop offline writes are queued in outbox and synced through NestJS API on reconnect.

## Project Structure

### Documentation (this feature)

```text
specs/011-visitor-provider-access/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: development guide
├── contracts/           # Phase 1: API contracts
│   ├── visit-persons-api.md
│   ├── access-events-api-extensions.md
│   └── vehicles-api-extensions.md
├── checklists/
│   └── requirements.md  # Spec quality validation
└── tasks.md             # Phase 2: task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Database
supabase/migrations/
└── {timestamp}_create_visit_persons_and_images.sql    # NEW

# Shared packages
packages/shared/src/
├── types/
│   ├── visit-person.ts          # NEW
│   ├── visit-person-image.ts    # NEW
│   ├── vehicle.ts               # MODIFIED (add visitPersonId)
│   └── access-event.ts          # UNCHANGED (already has visitPersonId)
├── validators/
│   ├── visit-person.ts          # NEW
│   ├── visit-person-image.ts    # NEW
│   ├── vehicle.ts               # MODIFIED (discriminated union)
│   └── access-event.ts          # MODIFIED (visitPersonId support)
├── navigation/
│   └── sidebar-config.ts        # MODIFIED (add visitors, providers sub-items)
└── index.ts                     # MODIFIED (export new types/validators)

# API (NestJS)
apps/api/src/modules/
├── visit-persons/               # NEW MODULE
│   ├── visit-persons.module.ts
│   ├── visit-persons.controller.ts
│   ├── visit-persons.service.ts
│   ├── visit-persons.repository.ts
│   └── dto/
│       ├── create-visit-person.dto.ts
│       ├── update-visit-person.dto.ts
│       └── visit-person-filters.dto.ts
├── visit-person-images/         # NEW MODULE
│   ├── visit-person-images.module.ts
│   ├── visit-person-images.controller.ts
│   ├── visit-person-images.service.ts
│   └── visit-person-images.repository.ts
├── vehicles/                    # MODIFIED
│   ├── vehicles.controller.ts       # Add GET with query, modify POST
│   ├── vehicles.repository.ts       # Add findByVisitPersonId
│   └── dto/create-vehicle.dto.ts    # Re-exports updated shared schema
├── access-events/               # MODIFIED
│   ├── access-events.controller.ts  # Add PATCH, GET recent-visit-person
│   ├── access-events.service.ts     # Add update, visitPerson queries
│   └── access-events.repository.ts  # Add update, findRecentByVisitPersonId
└── app.module.ts                # MODIFIED (register new modules)

# Web (Next.js)
apps/web/src/
├── app/[locale]/(dashboard)/visits-and-residents/
│   ├── visitors/page.tsx        # NEW
│   └── providers/page.tsx       # NEW
├── features/
│   ├── visitors/                # NEW FEATURE
│   │   ├── types/index.ts
│   │   ├── hooks/
│   │   │   ├── use-visit-persons.ts
│   │   │   ├── use-create-visit-person.ts
│   │   │   ├── use-update-visit-person.ts
│   │   │   ├── use-visit-person-vehicles.ts
│   │   │   ├── use-visit-person-images.ts
│   │   │   ├── use-upload-visit-person-image.ts
│   │   │   └── use-keyboard-navigation.ts
│   │   └── components/
│   │       ├── visitors-page-client.tsx
│   │       ├── visitors-table.tsx
│   │       ├── visitors-table-columns.tsx
│   │       ├── visit-person-sidebar.tsx
│   │       ├── visit-person-form.tsx
│   │       ├── visit-person-access-event-form.tsx
│   │       ├── visit-person-status-badge.tsx
│   │       └── image-section.tsx
│   └── providers/               # NEW FEATURE (mirrors visitors, different fields)
│       ├── types/index.ts
│       ├── hooks/               # Same hooks, different type filter
│       └── components/
│           ├── providers-page-client.tsx
│           ├── providers-table.tsx
│           ├── providers-table-columns.tsx
│           └── provider-sidebar.tsx
└── shared/
    ├── components/
    │   ├── vehicle-form/vehicle-form.tsx   # MODIFIED (accept visitPersonId)
    │   └── image-capture/                  # NEW
    │       ├── image-upload.tsx            # File upload component
    │       └── image-grid.tsx             # Display existing images
    └── lib/
        └── api-client.ts                  # MODIFIED (add upload method)

# Desktop (Electron)
apps/desktop/
├── electron/
│   ├── repositories/
│   │   ├── database.ts                    # NEW (SQLite singleton)
│   │   ├── visit-persons-repository.ts    # NEW
│   │   ├── vehicles-repository.ts         # NEW
│   │   ├── access-events-repository.ts    # NEW
│   │   ├── images-repository.ts           # NEW
│   │   └── sync-outbox-repository.ts      # NEW
│   ├── services/
│   │   └── sync-engine.ts                 # NEW
│   ├── ipc/
│   │   ├── visit-persons-handlers.ts      # NEW
│   │   └── sync-handlers.ts              # NEW
│   └── preload.ts                         # MODIFIED (add new API surface)
└── src/
    ├── features/
    │   ├── visitors/                      # NEW (mirrors web, react-i18next)
    │   │   ├── hooks/
    │   │   ├── components/
    │   │   └── pages/visitors-page.tsx
    │   └── providers/                     # NEW (mirrors web, react-i18next)
    │       ├── hooks/
    │       ├── components/
    │       └── pages/providers-page.tsx
    └── shared/
        ├── components/
        │   ├── vehicle-form/vehicle-form.tsx  # MODIFIED
        │   ├── image-capture/
        │   │   ├── webcam-capture.tsx         # NEW (Electron webcam)
        │   │   ├── image-upload.tsx           # NEW (file fallback)
        │   │   └── image-grid.tsx             # NEW
        │   └── page-router.tsx                # MODIFIED (add routes)
        └── lib/
            └── api-client.ts                  # MODIFIED (add upload method)
```

**Structure Decision**: Feature-based architecture with separate `visitors/` and `providers/` feature directories (following existing `residents/` pattern). Shared components (vehicle form, image capture) in `shared/`. API follows modular-monolith with separate `visit-persons/` and `visit-person-images/` NestJS modules. Desktop offline infrastructure uses `better-sqlite3` in main process with IPC bridge.

## Complexity Tracking

| Aspect | Complexity | Notes |
|--------|-----------|-------|
| Desktop offline infrastructure | HIGH | SQLite + outbox + sync engine must be built from scratch. No existing pattern in codebase. |
| Image upload pipeline | MEDIUM | New NestJS multipart handling + Supabase Storage integration. No existing file upload pattern. |
| Webcam capture (desktop) | MEDIUM | getUserMedia in Electron renderer. New component, but standard web API. |
| Feature duplication (visitors vs providers) | LOW | ~80% shared structure. Different form fields and type filters. |
| Schema extensions | LOW | Tables designed for this from the start. visit_person_id columns already exist as bare columns. |

## Implementation Phases

### Phase 1: Foundation (Database + Shared Types)

**Goal**: Database tables exist, shared types/validators compile, no app-level code yet.

1. **Database migration**: Create `visit_persons` table with code auto-generation trigger, `visit_person_images` table, add FK constraints on existing `vehicles.visit_person_id` and `access_events.visit_person_id`, tighten `chk_vehicle_owner` constraint, add UPDATE RLS policy on `access_events`, create `visit-person-images` storage bucket.

2. **Shared types**: Create `VisitPerson`, `VisitPersonImage` types. Extend `Vehicle` type (userId nullable, add visitPersonId). Verify `AccessEvent` type already has `visitPersonId`.

3. **Shared validators**: Create `createVisitPersonSchema`, `updateVisitPersonSchema`, `visitPersonFiltersSchema`, `imageTypeEnum`. Modify `createVehicleSchema` (discriminated union by ownerType). Modify `createAccessEventSchema` (support visitPersonId for visitor/provider personTypes). Create `updateAccessEventSchema`.

4. **Regenerate DB types**: `pnpm db:types` after migration.

5. **Sidebar config**: Add `visitors` and `providers` sub-items under `visits-and-residents`.

**Verification**: `pnpm typecheck` passes. `pnpm db:types` generates types matching new tables.

### Phase 2: API — Visit Persons CRUD

**Goal**: Full CRUD API for visit persons with search, filtering, and pagination.

1. **visit-persons module**: Create NestJS module with controller, service, repository, DTOs. Endpoints: GET / (list with type filter + free-text search), GET /:id, POST /, PATCH /:id.

2. **Search implementation**: Repository uses `ILIKE` across full_name, code, phone, company columns. Joined `residentName` field from profiles table for display.

3. **Register in AppModule**: Import and register the new module.

**Verification**: API endpoints respond correctly via manual testing or API client. Tenant isolation verified.

### Phase 3: API — Image Upload + Vehicle/Event Extensions

**Goal**: Complete API surface for all feature operations.

1. **visit-person-images module**: NestJS module with multipart upload controller (Multer), Supabase Storage upload/delete, metadata CRUD, signed URL generation, image replacement logic.

2. **Vehicles extensions**: Add `GET /vehicles?visitPersonId=` endpoint. Modify `POST /vehicles` to accept discriminated union with ownerType. Add `findByVisitPersonId` to repository.

3. **Access events extensions**: Add `PATCH /access-events/:id`. Add `GET /access-events/recent-visit-person/:visitPersonId`. Add `update()` and `findRecentByVisitPersonId()` to repository.

**Verification**: Image upload/download works. Vehicle creation with visitPersonId works. Access event PATCH works. All endpoints tenant-scoped.

### Phase 4: Web — Visitors Feature

**Goal**: Complete visitors submodule on the web app.

1. **Route**: Create `visits-and-residents/visitors/page.tsx`.

2. **Feature hooks**: `useVisitPersons` (list with type=visitor filter), `useCreateVisitPerson`, `useUpdateVisitPerson`, `useVisitPersonVehicles`, `useVisitPersonImages`, `useUploadVisitPersonImage`, `useKeyboardNavigation` (adapted from residents).

3. **Feature components**: `VisitorsPageClient` (mirrors ResidentsPageClient), `VisitorsTable` + columns, `VisitPersonSidebar` (Sheet with person info header, images section, recent events, access event form), `VisitPersonForm` (registration fields for new visitors), status badge component.

4. **Shared components**: Image upload component (`ImageUpload` — file input for web), image grid (display thumbnails with signed URLs). Extend `VehicleForm` to accept optional `visitPersonId`.

5. **API client**: Add `upload()` method to `apiClient` for multipart/form-data.

6. **i18n**: Add `visitPersons`, `providers`, `images` translation keys to web message files.

**Verification**: Navigate to Visitante page, search/filter, select person, fill sidebar form, save access event. Register new visitor. Upload image. Keyboard shortcuts work.

### Phase 5: Web — Providers Feature

**Goal**: Complete providers submodule, mirroring visitors with different fields.

1. **Route**: Create `visits-and-residents/providers/page.tsx`.

2. **Feature hooks**: Same as visitors but with `type=service_provider` filter.

3. **Feature components**: `ProvidersPageClient`, `ProvidersTable` + columns (includes company, phone columns), `ProviderSidebar` (resident_id field shown but optional).

**Verification**: Navigate to Proveedor page. Full workflow including provider-specific fields (company, phone). Resident field optional.

### Phase 6: Desktop — Visitors & Providers Features

**Goal**: Desktop (Electron) mirrors web visitors and providers features.

1. **Feature directories**: Create `visitors/` and `providers/` in desktop features, mirroring web structure with `react-i18next`.

2. **Route registration**: Add routes in `page-router.tsx`.

3. **Webcam capture component**: `WebcamCapture` component using `getUserMedia` — live preview, capture button, retake. Outputs JPEG blob.

4. **Image components**: `ImageUpload` (file fallback), `ImageGrid` (display existing).

5. **API client extension**: Add `upload()` method.

**Verification**: Desktop app shows visitors/providers pages. Webcam capture works. Full workflow matches web.

### Phase 7: Desktop — Offline Infrastructure

**Goal**: Full offline support for desktop app.

1. **SQLite setup**: Install `better-sqlite3`. Create database singleton in `electron/repositories/database.ts`. Define local schema (visit_persons, vehicles, access_events, visit_person_images, sync_outbox tables).

2. **Local repositories**: CRUD operations on SQLite tables. Read-through cache: check local first, fall back to API.

3. **Sync engine**: Outbox processor that runs on reconnect. FIFO order, idempotent via event_id. Handles: create/update visit_persons, create vehicles, create access_events, upload images.

4. **IPC bridge**: Register handlers in `electron/ipc/`. Update `electron/preload.ts` with new API surface. Renderer calls `window.api.visitPersons.*`.

5. **SyncSlice**: Zustand slice tracking `idle | syncing | error | offline` state. UI indicator in top bar.

6. **Local image cache**: Store captured images in `{userData}/images/...` before upload. Sync engine uploads files via API multipart endpoint on reconnect.

**Verification**: Disconnect network. Create visit person, log access event, capture image. Reconnect. Verify data syncs to server. No data loss.

### Phase 8: Testing

**Goal**: Unit tests, integration tests, E2E coverage.

1. **API tests**: Jest tests for visit-persons service (CRUD, search, tenant isolation), access-events update, vehicle creation with visitPersonId, image upload/replace.

2. **Frontend tests**: Vitest tests for hooks (useVisitPersons, useCreateVisitPerson), component rendering (table, sidebar, form). Test keyboard navigation hook.

3. **E2E tests**: Playwright tests for visitors and providers full workflows (list → search → select → fill form → save → toast confirmation).

**Verification**: `pnpm test` passes. `pnpm test:e2e` passes.
