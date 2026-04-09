# Quickstart: Catalog Users — API-First Refactor

**Branch**: `009-refactor-users-api-first`

## Prerequisites

- Node.js 22 LTS
- pnpm installed
- Local Supabase running (`pnpm db:start`)
- Database seeded (`pnpm db:reset`)

## Setup

```bash
# 1. Switch to the feature branch
git checkout 009-refactor-users-api-first

# 2. Install dependencies
pnpm install

# 3. Ensure env vars are set (add NEXT_PUBLIC_API_URL)
# .env.development should contain:
#   NEXT_PUBLIC_API_URL=http://localhost:3001

# 4. Start local Supabase
pnpm db:start

# 5. Reset and seed the database (includes mock super admin + user groups)
pnpm db:reset

# 6. Start all apps in development
pnpm dev
```

## Development Workflow

### Running the NestJS API

```bash
# API runs on port 3001 by default
cd apps/api && pnpm dev
```

### Running the Web App

```bash
# Web runs on port 3000 by default
cd apps/web && pnpm dev
```

### Testing

```bash
# Unit tests (all workspaces)
pnpm test

# API tests only
cd apps/api && pnpm test

# Web tests only
cd apps/web && pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Key Files to Work With

### Backend (changes)
- `apps/api/src/modules/users/users.repository.ts` — update create() for optional password
- `apps/api/src/modules/users/users.service.ts` — pass password through
- `apps/api/src/modules/users/dto/create-user.dto.ts` — add password field
- `apps/api/src/modules/tenants/` — NEW module (entire directory)
- `apps/api/src/app.module.ts` — register TenantsModule

### Shared (changes)
- `packages/shared/src/validators/user.ts` — update required fields, add password

### Frontend (changes)
- `apps/web/src/shared/lib/api-client.ts` — NEW: fetch wrapper with JWT auth
- `apps/web/src/features/users/hooks/` — rewrite all hooks to call API
- `apps/web/src/features/users/actions/` — DELETE entire directory
- `apps/web/src/features/users/components/user-form.tsx` — add password fields, update required fields

### Environment
- `.env`, `.env.development`, `.env.example` — add `NEXT_PUBLIC_API_URL`

## Login Credentials (local dev)

After `pnpm db:reset`, a mock super admin exists in the seed data. Check `supabase/seed.sql` for the credentials.

## Verification Checklist

After implementation, verify:

1. `grep -r "supabase.from\|\.rpc(\|\.storage" apps/web/src/features/users/` → zero results
2. `grep -r '"use server"' apps/web/src/features/users/` → zero results
3. Navigate to Catalogs > Users → table loads from API (check network tab for `GET /api/users`)
4. Create a user → network tab shows `POST /api/users`
5. Edit a user → network tab shows `GET /api/users/:id` then `PUT /api/users/:id`
6. Deactivate a user → network tab shows `PATCH /api/users/:id/status`
7. User groups dropdown → network tab shows `GET /api/user-groups`
8. Tenant selector → network tab shows `GET /api/tenants`
