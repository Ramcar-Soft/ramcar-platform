# Implementation Plan: Authentication — Web & Desktop

**Branch**: `001-auth-login` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-auth-login/spec.md`

## Summary

Implement email/password authentication across the web portal (Next.js) and desktop app (Electron) using Supabase Auth. Create the foundational database schema (tenants + profiles), auth infrastructure on the NestJS API (JWT guard, tenant guard, role decorators), seed mock users for local development, and provide temporary home pages that display the authenticated user's name and role. This is the first feature on a blank scaffold — all auth code is new.

## Technical Context

**Language/Version**: TypeScript (strict mode across all workspaces)  
**Primary Dependencies**: Next.js 16 (App Router), Electron 30 + Vite + React, NestJS v11, Supabase JS v2, @supabase/ssr  
**Storage**: PostgreSQL via Supabase (local dev on port 54322), localStorage (desktop session)  
**Testing**: Manual verification against mock users (automated tests deferred to testing feature)  
**Target Platform**: Web (browser), Desktop (macOS/Windows/Linux via Electron), API (Node.js server)  
**Project Type**: Multi-platform monorepo (web-service + desktop-app + api)  
**Performance Goals**: Login flow < 10 seconds end-to-end  
**Constraints**: Multi-tenant isolation (every query scoped by tenant_id), offline login deferred  
**Scale/Scope**: 3 mock users, 1 test tenant, 2 client platforms, 1 API

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | PASS | `profiles` table scoped by `tenant_id`. RLS policies enforce tenant boundaries. JWT carries `tenant_id` in `app_metadata`. API TenantGuard extracts tenant from JWT. |
| II. Feature-Based Architecture | PASS | Web: `src/features/auth/`. Desktop renderer: `src/features/auth/`. Desktop main: `electron/services/`. API: `src/modules/auth/`. |
| III. Strict Import Boundaries | PASS | No cross-feature imports. Shared types in `@ramcar/shared`. Supabase client utilities in each app's own `shared/lib/`. |
| IV. Offline-First Desktop | DEFERRED | Auth requires network. Offline session persistence is out of scope per spec assumptions. Supabase client uses localStorage for session which persists across restarts. |
| V. Shared Validation via Zod | PASS | Login DTO (email + password) defined as Zod schema in `@ramcar/shared`. Reused by web form, desktop form, and API validation. |
| VI. Role-Based Access Control | PASS | Roles stored in `profiles` and mirrored in JWT `app_metadata`. NestJS `@Roles()` decorator + `RolesGuard`. SuperAdmin excluded from this feature per spec. |
| VII. TypeScript Strict Mode | PASS | All new code in strict TypeScript. No `any` types. |

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-login/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 dev quickstart guide
├── contracts/
│   └── api-auth.md      # API endpoint contracts
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   └── 20260407000000_auth_schema.sql    # tenants + profiles + RLS + triggers
└── seed.sql                               # Test tenant + 3 mock users

packages/shared/src/
├── types/
│   └── auth.ts                            # Role enum, UserProfile type, AuthSession type
├── validators/
│   └── auth.ts                            # loginSchema (Zod: email + password)
└── index.ts                               # Re-exports

packages/store/src/
├── slices/
│   └── auth-slice.ts                      # AuthSlice: user, session, isLoading, actions
├── index.ts                               # Updated exports
└── store.ts                               # Updated to include auth slice

apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx               # Login page (public)
│   │   ├── (protected)/
│   │   │   ├── layout.tsx                 # Server-side session check
│   │   │   └── page.tsx                   # Temporary home page
│   │   ├── layout.tsx                     # Root layout (updated)
│   │   └── globals.css
│   ├── features/
│   │   └── auth/
│   │       ├── components/
│   │       │   └── login-form.tsx         # Client component: email/password form
│   │       └── actions/
│   │           └── login.ts               # Server action: signInWithPassword
│   └── shared/
│       └── lib/
│           └── supabase/
│               ├── client.ts              # Browser Supabase client
│               ├── server.ts              # Server component Supabase client
│               └── middleware.ts           # Middleware Supabase client
├── middleware.ts                           # Next.js middleware (session refresh + redirect)
└── .env.example                           # Supabase URL + anon key template

apps/desktop/
├── electron/
│   ├── preload.ts                         # Updated: expose auth IPC channels
│   ├── ipc/
│   │   └── auth.handler.ts               # IPC handlers: onLogin, onLogout, onGetSession
│   └── services/
│       └── auth.service.ts                # Supabase client + auth operations (main process)
├── src/
│   ├── features/
│   │   └── auth/
│   │       ├── components/
│   │       │   └── login-form.tsx         # Login form component
│   │       └── pages/
│   │           ├── login-page.tsx         # Login page
│   │           └── home-page.tsx          # Temporary home page
│   ├── shared/
│   │   └── hooks/
│   │       └── use-auth.ts               # Hook wrapping IPC auth calls
│   └── App.tsx                            # Updated: auth routing (login vs home)
├── .env.example                           # Supabase URL + anon key template
└── env.d.ts                               # Updated: VITE_SUPABASE_* env types

apps/api/src/
├── infrastructure/
│   └── supabase/
│       ├── supabase.module.ts             # Global module: Supabase client provider
│       └── supabase.service.ts            # Supabase client singleton
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts             # Verifies Supabase JWT
│   │   ├── roles.guard.ts                # Checks role from JWT app_metadata
│   │   └── tenant.guard.ts               # Extracts tenant_id from JWT
│   └── decorators/
│       ├── current-user.decorator.ts     # @CurrentUser() param decorator
│       ├── current-tenant.decorator.ts   # @CurrentTenant() param decorator
│       └── roles.decorator.ts            # @Roles(...) metadata decorator
├── modules/
│   └── auth/
│       ├── auth.module.ts
│       ├── auth.controller.ts            # GET /auth/me, POST /auth/logout
│       └── auth.service.ts               # Profile lookup, session management
├── app.module.ts                          # Updated: register new modules
├── .env.example                           # Supabase URL + keys template
└── main.ts                                # Updated: CORS, validation pipe
```

**Structure Decision**: Follows the existing monorepo architecture defined in CLAUDE.md. Each app has its own Supabase client setup (no shared Supabase package) because each platform requires different client creation patterns (SSR cookies vs localStorage vs service-role). Shared types and validators live in `@ramcar/shared`. Auth state for the desktop app uses a Zustand slice in `@ramcar/store`.

## Complexity Tracking

No constitution violations requiring justification. All principles are satisfied.
