# Implementation Plan: Catalog Users Management

**Branch**: `008-catalog-users` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-catalog-users/spec.md`

## Summary

Implement a Users submodule within the Catalogs section of the web portal. This includes extending the database schema (profiles table + new user_groups table), building NestJS API endpoints for CRUD operations with role-based access, and a Next.js frontend with a searchable/sortable/filterable user list and create/edit forms. Soft-delete is used via status field (active/inactive). Role hierarchy enforces that Admins cannot modify Super Admins. A mock Super Admin is added to seed data. Unit and E2E tests cover web, API, and shared packages.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS  
**Primary Dependencies**: Next.js 16 (App Router), NestJS v11, Supabase JS v2, @supabase/ssr, shadcn/ui, TanStack Query v5, Zustand, next-intl v4, Zod  
**Storage**: PostgreSQL via Supabase (profiles table extension, new user_groups table)  
**Testing**: Vitest (web + packages), Jest + @nestjs/testing (API), Playwright (E2E)  
**Target Platform**: Web (Next.js), API (NestJS), shared packages consumed by Desktop  
**Project Type**: Multi-tenant web application (monorepo)  
**Performance Goals**: User list loads in <2s, search results in <500ms  
**Constraints**: All queries scoped by tenant_id, role hierarchy enforcement, soft-delete only  
**Scale/Scope**: 2 new pages (list + create/edit), 1 API module, 1 migration, seed update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | PASS | All user queries scoped by tenant_id. Super Admin queries across tenants. RLS policies will enforce boundaries. |
| II. Feature-Based Architecture | PASS | Web: `src/features/users/`. API: `src/modules/users/`. Shared: validators + types in `@ramcar/shared`. |
| III. Strict Import Boundaries | PASS | Users feature imports only from `@ramcar/shared`, `@ramcar/store`, `@ramcar/ui`. No cross-feature imports. |
| IV. Offline-First Desktop | N/A | Users submodule is web-only. Desktop involvement limited to shared package tests. |
| V. Shared Validation via Zod | PASS | Zod schemas for user create/edit DTOs defined in `@ramcar/shared`, reused by API validation pipe and frontend forms. |
| VI. Role-Based Access Control | PASS | API: JwtAuthGuard + TenantGuard + RolesGuard. Role hierarchy enforced in service layer. Frontend hides controls per role. |
| VII. TypeScript Strict Mode | PASS | All new code under strict: true. No `any` types. |

**Gate Result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/008-catalog-users/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-endpoints.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Database
supabase/
├── migrations/
│   └── 2026MMDD000000_users_module.sql   # Alter profiles + create user_groups
└── seed.sql                               # Add super_admin mock user + user_groups seed

# Shared packages
packages/shared/src/
├── types/
│   └── user.ts                            # User, UserGroup types, PhoneType, UserStatus
├── validators/
│   └── user.ts                            # createUserSchema, updateUserSchema, userFiltersSchema
└── navigation/
    └── sidebar-config.ts                  # Add "users" sub-item under "catalogs"

packages/store/src/
└── slices/
    └── users-slice.ts                     # (optional) Client-side state for user list filters

packages/i18n/src/messages/
├── es.json                                # Spanish translations for users module
└── en.json                                # English translations for users module

# API (NestJS)
apps/api/src/modules/
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    ├── users.repository.ts
    ├── dto/
    │   ├── create-user.dto.ts
    │   ├── update-user.dto.ts
    │   └── user-filters.dto.ts
    └── __tests__/
        ├── users.controller.spec.ts
        ├── users.service.spec.ts
        └── users.repository.spec.ts

apps/api/src/modules/
└── user-groups/
    ├── user-groups.module.ts
    ├── user-groups.controller.ts
    ├── user-groups.service.ts
    └── user-groups.repository.ts

# Web (Next.js)
apps/web/src/features/
└── users/
    ├── components/
    │   ├── users-table.tsx                # Searchable/sortable/filterable table
    │   ├── users-table-columns.tsx        # Column definitions with actions
    │   ├── user-form.tsx                  # Create/edit form (shared component)
    │   ├── user-filters.tsx               # Search input + tenant filter + status filter
    │   └── user-status-badge.tsx          # Active/inactive badge
    ├── hooks/
    │   ├── use-users.ts                   # TanStack Query hook for user list
    │   ├── use-user.ts                    # TanStack Query hook for single user
    │   ├── use-create-user.ts             # Mutation hook
    │   ├── use-update-user.ts             # Mutation hook
    │   ├── use-toggle-user-status.ts      # Mutation hook (deactivate/reactivate)
    │   └── use-user-groups.ts             # TanStack Query hook for groups list
    ├── actions/
    │   ├── get-users.ts                   # Server action: fetch users
    │   ├── get-user.ts                    # Server action: fetch single user
    │   ├── create-user.ts                 # Server action: create user
    │   ├── update-user.ts                 # Server action: update user
    │   └── toggle-user-status.ts          # Server action: deactivate/reactivate
    └── types/
        └── index.ts                       # Feature-specific types/interfaces

apps/web/src/app/[locale]/(dashboard)/catalogs/
├── page.tsx                               # Redirect to /catalogs/users (or catalog landing)
└── users/
    ├── page.tsx                           # Users list page
    ├── new/
    │   └── page.tsx                       # Create user page
    └── [id]/
        └── edit/
            └── page.tsx                   # Edit user page

# Web tests
apps/web/src/features/users/__tests__/
├── users-table.test.tsx
├── user-form.test.tsx
└── user-filters.test.tsx

apps/web/e2e/
└── users.spec.ts                          # Playwright E2E for users CRUD flows

# Shared package tests
packages/shared/src/validators/
└── user.test.ts                           # Zod schema validation tests

# Desktop shared package tests (no UI)
packages/store/src/slices/
└── users-slice.test.ts                    # (if slice created)
```

**Structure Decision**: Follows established monorepo patterns — feature-based frontend (`src/features/users/`), modular backend (`src/modules/users/`), shared schemas in `@ramcar/shared`. Routes nested under existing `/catalogs` path. API follows controller → service → repository pattern per CLAUDE.md.

## Complexity Tracking

> No constitution violations. No complexity justifications needed.
