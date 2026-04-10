# Quickstart: Resident Access Log

**Branch**: `010-resident-access-log`  
**Prerequisites**: Node.js 22 LTS, pnpm, Supabase CLI, Docker (for local Supabase)

## Setup

```bash
# Switch to feature branch
git checkout 010-resident-access-log

# Install dependencies
pnpm install

# Start local Supabase (requires Docker)
pnpm db:start

# Apply migrations (after creating the new migration)
pnpm db:migrate:dev

# Regenerate TypeScript types from schema
pnpm db:types

# Start all apps in development
pnpm dev
```

## Key Development Paths

### Database Migration

```bash
# Create migration file
pnpm db:new create_vehicles_and_access_events

# Edit the generated file at supabase/migrations/{timestamp}_create_vehicles_and_access_events.sql
# See data-model.md for table schemas

# Apply migration
pnpm db:migrate:dev

# Regenerate types
pnpm db:types
```

### API Development (apps/api)

```bash
# Run API only
pnpm --filter @ramcar/api dev

# Run API tests
pnpm --filter @ramcar/api test

# Test endpoints with curl
# List residents
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/residents?search=garcia

# Create vehicle
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"userId":"uuid","vehicleType":"car","brand":"Toyota","model":"Corolla","plate":"ABC-1234","color":"White"}' \
  http://localhost:3001/api/vehicles

# Create access event
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"personType":"resident","userId":"uuid","direction":"entry","accessMode":"pedestrian","source":"web"}' \
  http://localhost:3001/api/access-events

# Get last access event
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/access-events/last/{userId}
```

### Web Frontend (apps/web)

```bash
# Run web only
pnpm --filter @ramcar/web dev

# Navigate to: http://localhost:3000/en/visits-and-residents/residents
# Login as a guard user to see the Residents page
```

### Desktop App (apps/desktop)

```bash
# Run desktop in development
pnpm --filter @ramcar/desktop dev

# Build desktop
pnpm --filter @ramcar/desktop build
```

### Shared Packages

```bash
# Run shared package tests
pnpm --filter @ramcar/shared test

# Typecheck all workspaces
pnpm typecheck

# Lint all workspaces
pnpm lint
```

## Key Files to Edit

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase/migrations/{ts}_create_vehicles_and_access_events.sql` | Database tables |
| 2 | `packages/shared/src/types/vehicle.ts` | Vehicle TypeScript types |
| 3 | `packages/shared/src/types/access-event.ts` | AccessEvent TypeScript types |
| 4 | `packages/shared/src/validators/vehicle.ts` | Vehicle Zod schemas |
| 5 | `packages/shared/src/validators/access-event.ts` | AccessEvent Zod schemas |
| 6 | `packages/shared/src/index.ts` | Re-export new types + validators |
| 7 | `packages/shared/src/navigation/sidebar-config.ts` | Add residents sub-item |
| 8 | `packages/i18n/src/messages/en.json` + `es.json` | i18n keys |
| 9 | `apps/api/src/modules/vehicles/*` | Vehicles API module |
| 10 | `apps/api/src/modules/access-events/*` | Access Events API module |
| 11 | `apps/api/src/modules/residents/*` | Residents API module (facade) |
| 12 | `apps/api/src/app.module.ts` | Register new modules |
| 13 | `apps/web/src/shared/components/vehicle-form/*` | Reusable vehicle form |
| 14 | `apps/web/src/features/residents/*` | Web frontend feature |
| 15 | `apps/web/src/app/[locale]/(dashboard)/visits-and-residents/residents/page.tsx` | Route entry |
| 16 | `apps/desktop/electron/repositories/*` | SQLite repositories |
| 17 | `apps/desktop/electron/services/*` | Desktop services |
| 18 | `apps/desktop/electron/ipc/*` | IPC handlers |
| 19 | `apps/desktop/electron/preload.ts` | IPC bridge |
| 20 | `apps/desktop/src/features/residents/*` | Desktop frontend feature |

## Test Accounts

Use the seed data from `supabase/seed.sql` for local development. Default test accounts:

- Super Admin, Admin, Guard, and Resident users are seeded per tenant
- Login via Supabase Auth with the seeded email/password combinations
