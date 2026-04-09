# Quickstart: Catalog Users Management

**Feature**: 008-catalog-users | **Date**: 2026-04-09

## Prerequisites

- Node.js 22 LTS
- pnpm installed
- Local Supabase running (`pnpm db:start`)
- Environment variables set (`.env.local` in web/api)

## Local Development Setup

```bash
# 1. Switch to feature branch
git checkout 008-catalog-users

# 2. Install dependencies
pnpm install

# 3. Start local Supabase
pnpm db:start

# 4. Run migration (after migration file is created)
pnpm db:migrate

# 5. Reset database with seed data (includes new super admin user)
pnpm db:reset

# 6. Regenerate TypeScript types from schema
pnpm db:types

# 7. Start all apps in development
pnpm dev
```

## Test Credentials (after db:reset)

| User         | Email              | Password    | Role        |
|--------------|--------------------|-------------|-------------|
| Super Admin  | superadmin@ramcar.dev | password123 | super_admin |
| Admin        | admin@ramcar.dev   | password123 | admin       |
| Guard        | guard@ramcar.dev   | password123 | guard       |
| Resident     | resident@ramcar.dev | password123 | resident    |

## Key URLs

- **Web App**: http://localhost:3000
- **Users List**: http://localhost:3000/catalogs/users
- **Create User**: http://localhost:3000/catalogs/users/new
- **API**: http://localhost:4000 (or configured API port)
- **Supabase Studio**: http://localhost:54323

## Running Tests

```bash
# Unit tests (all workspaces)
pnpm test

# Unit tests with coverage
pnpm test:cov

# API tests only
cd apps/api && pnpm test

# Web tests only
cd apps/web && pnpm test

# Shared package tests
cd packages/shared && pnpm test

# E2E tests (requires dev server running)
pnpm test:e2e
```

## Verification Checklist

1. Log in as Super Admin → navigate to Catalogs > Users → see user list
2. Create a new user with role "admin" → verify user appears in list
3. Log in as Admin → navigate to Catalogs > Users → verify cannot assign super_admin role
4. Edit a user → change phone and address → verify changes persist
5. Deactivate a user → verify they cannot log in → reactivate → verify they can log in again
6. Search for a user by name → verify results filter correctly
7. Sort by role column → verify ordering changes

## Files to Watch

| Area | Key Files |
|------|-----------|
| Migration | `supabase/migrations/YYYYMMDD_users_module.sql` |
| Seed | `supabase/seed.sql` |
| Shared types | `packages/shared/src/types/user.ts` |
| Zod schemas | `packages/shared/src/validators/user.ts` |
| API module | `apps/api/src/modules/users/` |
| Web feature | `apps/web/src/features/users/` |
| Routes | `apps/web/src/app/[locale]/(dashboard)/catalogs/users/` |
| Navigation | `packages/shared/src/navigation/sidebar-config.ts` |
| i18n | `packages/i18n/src/messages/{es,en}.json` |
