# Quickstart: 011 Visitor & Provider Access Logging

## Prerequisites

- Node.js 22 LTS, pnpm
- Supabase CLI running locally (`pnpm db:start`)
- All existing migrations applied (`pnpm db:migrate:dev`)
- API dev server (`pnpm --filter @ramcar/api dev`)

## Development Order

### 1. Database Migration

```bash
pnpm db:new create_visit_persons_and_images
```

Write the migration SQL (see data-model.md):
- CREATE TABLE visit_persons + trigger for code auto-generation
- CREATE TABLE visit_person_images
- ALTER TABLE vehicles — add FK constraint on visit_person_id, tighten chk_vehicle_owner
- ALTER TABLE access_events — add FK constraint on visit_person_id
- ADD UPDATE RLS policy on access_events (for PATCH support)
- Create Supabase Storage bucket: `visit-person-images` (private)

```bash
pnpm db:migrate:dev
pnpm db:types
```

### 2. Shared Types & Validators

Files to create/modify in `packages/shared/src/`:

```
types/visit-person.ts          # NEW: VisitPerson, VisitPersonStatus, VisitPersonType
types/visit-person-image.ts    # NEW: VisitPersonImage, ImageType
types/vehicle.ts               # MODIFY: Add visitPersonId field (nullable)
validators/visit-person.ts     # NEW: createVisitPersonSchema, updateVisitPersonSchema, visitPersonFiltersSchema
validators/visit-person-image.ts  # NEW: imageTypeEnum
validators/vehicle.ts          # MODIFY: Discriminated union with ownerType
validators/access-event.ts     # MODIFY: Support visitPersonId for visitor/provider personTypes
index.ts                       # MODIFY: Export new types and validators
```

### 3. API Module — visit-persons

```bash
# Create module structure in apps/api/src/modules/visit-persons/
mkdir -p apps/api/src/modules/visit-persons/dto
```

Files:
- `visit-persons.module.ts` — NestJS module, imports UsersModule for resident lookup
- `visit-persons.controller.ts` — CRUD + search endpoints
- `visit-persons.service.ts` — Business logic, code generation delegation to DB
- `visit-persons.repository.ts` — Supabase queries with tenant isolation

Register in AppModule.

### 4. API Module — visit-person-images

```bash
mkdir -p apps/api/src/modules/visit-person-images
```

Files:
- `visit-person-images.module.ts`
- `visit-person-images.controller.ts` — Multipart upload, list, delete
- `visit-person-images.service.ts` — Storage upload/delete, replacement logic
- `visit-person-images.repository.ts` — DB metadata CRUD

Install NestJS multer support if not present: `pnpm --filter @ramcar/api add @nestjs/platform-express`

### 5. API Extensions

- `vehicles.controller.ts` — Add GET with query params (visitPersonId)
- `vehicles.repository.ts` — Add `findByVisitPersonId()`, modify `create()` for visitPersonId
- `access-events.controller.ts` — Add PATCH /:id, GET /recent-visit-person/:id
- `access-events.repository.ts` — Add `update()`, `findRecentByVisitPersonId()`
- `access-events.service.ts` — Add update and visitPerson query methods

### 6. Sidebar Navigation

Modify `packages/shared/src/navigation/sidebar-config.ts`:
- Add `{ key: "visitors", route: "/visits-and-residents/visitors" }` sub-item
- Add `{ key: "providers", route: "/visits-and-residents/providers" }` sub-item

### 7. Web Routes

Create in `apps/web/src/app/[locale]/(dashboard)/visits-and-residents/`:
- `visitors/page.tsx`
- `providers/page.tsx`

### 8. Web Features

Create `apps/web/src/features/visitors/` mirroring the residents feature:
- `types/index.ts`
- `hooks/use-visit-persons.ts`, `use-create-visit-person.ts`, `use-update-visit-person.ts`
- `hooks/use-visit-person-vehicles.ts`, `use-visit-person-images.ts`
- `hooks/use-keyboard-navigation.ts` (reuse/adapt from residents)
- `components/visitors-page-client.tsx`, `visitors-table.tsx`, `visitors-table-columns.tsx`
- `components/visit-person-sidebar.tsx`, `visit-person-form.tsx`
- `components/image-capture.tsx` (file upload for web)

Create `apps/web/src/features/providers/` — same structure, different form fields.

Modify `apps/web/src/shared/components/vehicle-form/vehicle-form.tsx`:
- Accept optional `visitPersonId` prop (alternative to `userId`)

### 9. Desktop Features

Mirror web features in `apps/desktop/src/features/`:
- `visitors/` and `providers/` directories
- Use `react-i18next` (`useTranslation`) instead of `next-intl` (`useTranslations`)
- Add webcam capture component for image capture

Update `apps/desktop/src/shared/components/page-router.tsx`:
- Add routes for `/visits-and-residents/visitors` and `/visits-and-residents/providers`

### 10. Desktop Offline Infrastructure

This is significant new infrastructure:
- Install `better-sqlite3` in desktop app
- Create `electron/repositories/database.ts` — SQLite connection singleton
- Create local cache tables: `visit_persons`, `vehicles`, `access_events`, `visit_person_images`, `sync_outbox`
- Create `electron/services/sync-engine.ts` — outbox processor
- Create `electron/ipc/visit-persons-handlers.ts` — IPC bridge
- Update `electron/preload.ts` with new API surface

### 11. i18n

Add translation keys for:
- `visitPersons.*` (list, form, status labels)
- `providers.*` (company, phone labels)
- `images.*` (capture, upload, types)

In both web (`messages/es.json`, `messages/en.json`) and desktop (`public/locales/es/`, `public/locales/en/`).

## Verification

```bash
pnpm typecheck    # All workspaces compile
pnpm lint         # No lint errors
pnpm test         # Unit tests pass
pnpm dev          # Start all apps and test manually:
                  # 1. Navigate to Visitante page
                  # 2. Register new visitor
                  # 3. Log access event
                  # 4. Search and keyboard navigation
                  # 5. Image upload
                  # 6. Repeat for Proveedor
```
