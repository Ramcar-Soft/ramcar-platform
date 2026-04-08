# Research: Authentication — Web & Desktop

**Feature Branch**: `001-auth-login`  
**Date**: 2026-04-07

## Codebase State Assessment

All apps (web, desktop, api) and shared packages are blank scaffolds with no existing auth code.
- `apps/web`: Next.js 16 + App Router, React 19, Tailwind CSS 4. Empty `features/` and `shared/`.
- `apps/desktop`: Electron 30 + Vite + React 18. Preload exposes only `ping()`. Empty `services/`, `repositories/`, `ipc/`.
- `apps/api`: NestJS v11, single hello-world controller. Empty `common/`, `infrastructure/`, `modules/`.
- `supabase/`: config.toml configured (auth enabled, JWT 3600s expiry, email signup). `seed.sql` is empty. No migrations.
- `packages/shared`: Zod dep installed, empty `types/`, `validators/`, `utils/`.
- `packages/store`: Zustand with StoreProvider, no slices.
- `packages/ui`: Button, Card, Input components (Radix + Tailwind CSS 4 + OKLch).
- `packages/db-types`: Placeholder, no generated types yet.

---

## Decision 1: Supabase Client Strategy per Platform

**Decision**: Use `@supabase/ssr` for web (Next.js), `@supabase/supabase-js` for desktop (renderer) and API (server).

**Rationale**:
- `@supabase/ssr` is Supabase's official package for server-rendered frameworks. It handles cookie-based session management with Next.js middleware, supporting both server and client components seamlessly.
- The desktop renderer is a browser context — `@supabase/supabase-js` works natively with `localStorage` for session persistence, which survives Electron app restarts.
- The API uses `@supabase/supabase-js` with service-role key for admin operations and JWT verification.

**Alternatives considered**:
- Running Supabase client in Electron main process + IPC: Over-engineered for auth. The renderer is a browser; Supabase JS works there natively. Main process auth can be added later for offline-first features.
- Using Passport.js or custom JWT validation in NestJS: Unnecessary abstraction. Supabase provides JWT verification. A lightweight guard that verifies Supabase JWTs directly is simpler and avoids extra dependencies.

---

## Decision 2: User Role Storage

**Decision**: Store user role in a `profiles` table linked to `auth.users` via foreign key. Also mirror role in `app_metadata` for JWT availability.

**Rationale**:
- A `profiles` table is the standard Supabase pattern for extending `auth.users` with app-specific data (role, tenant_id, full_name).
- Storing role in `app_metadata` makes it available in the JWT token without an extra DB query on every API request. The JWT payload includes `app_metadata`, so guards can extract the role directly.
- The `profiles` table is the source of truth; `app_metadata` is a cached projection set during user creation and updated via triggers or admin operations.
- RLS policies on `profiles` enforce tenant isolation at the database layer.

**Alternatives considered**:
- Role only in `app_metadata`: No table to query, but harder to manage, no RLS, no tenant scoping at DB level. Violates Constitution Principle I (tenant isolation).
- Role only in `profiles` table: Requires a DB query on every authenticated request to resolve the role. Less performant.
- Separate `roles` table with many-to-many: Over-engineered for a fixed 4-role hierarchy.

---

## Decision 3: Session Persistence — Desktop

**Decision**: Use `@supabase/supabase-js` in the Electron renderer with default `localStorage` persistence.

**Rationale**:
- Electron's renderer has full browser APIs including `localStorage`. Supabase JS client uses `localStorage` by default for session storage.
- `localStorage` persists across Electron app restarts (stored in the app's user data directory).
- This approach requires zero custom storage code and behaves identically to a web app.
- The Supabase client handles token refresh automatically using the stored refresh token.

**Alternatives considered**:
- `electron-store` in main process: More secure (encrypted), but requires IPC for every auth check. Premature for this feature; can migrate when offline-first is implemented.
- `safeStorage` + main process: Most secure, but complex. Deferred to offline-first feature.

---

## Decision 4: Protected Route Strategy — Web

**Decision**: Use Next.js middleware + route groups `(auth)` and `(protected)`.

**Rationale**:
- Next.js middleware intercepts every request before rendering, making it the right place to check session validity and redirect.
- Route groups `(auth)` for login page (public) and `(protected)` for authenticated pages keep the routing clean.
- The middleware refreshes the Supabase session on every request (using `@supabase/ssr`), ensuring tokens stay valid.
- Server-side session check in the `(protected)` layout provides a second layer of defense.

**Alternatives considered**:
- Client-side auth check only: Flashes protected content before redirect. Poor UX and security.
- Separate middleware per route: Over-fragmented. A single middleware with path matching is cleaner.

---

## Decision 5: Protected Route Strategy — Desktop

**Decision**: Auth state in Zustand store (via `@ramcar/store` auth slice). `App.tsx` renders login or home based on session state.

**Rationale**:
- The desktop app is a single-page application. There's no server-side routing or middleware.
- A Zustand auth slice holds `user`, `session`, `isLoading` state. On app start, check for existing Supabase session and hydrate the store.
- `App.tsx` conditionally renders `<LoginPage />` or `<HomePage />` based on the auth slice.
- This is the simplest pattern for an Electron SPA.

**Alternatives considered**:
- React Router with protected routes: Adds routing library dependency for a single protected route. Unnecessary for this feature.
- Main process auth check via IPC: Over-engineered for this stage.

---

## Decision 6: Mock User Seeding

**Decision**: Use Supabase seed.sql with direct SQL inserts into `auth.users` + `profiles` table, plus a test tenant.

**Rationale**:
- Supabase local dev exposes the full Postgres instance. Direct SQL inserts into `auth.users` are the standard pattern for seeding Supabase Auth users locally.
- Passwords must be hashed with bcrypt (Supabase Auth's format) for `signInWithPassword()` to work.
- A test tenant must be created first, then profiles linked to it.
- `pnpm db:reset` already runs `seed.sql` after applying migrations, so the workflow is: reset → migrate → seed.

**Alternatives considered**:
- Supabase Admin API (`supabase.auth.admin.createUser`): Requires a running Supabase instance and a script runner. More complex than SQL inserts in seed.
- Manual user creation in Supabase Studio: Not reproducible, not automatable.

---

## Decision 7: API Auth Infrastructure

**Decision**: Create a Supabase module in `infrastructure/`, a JWT auth guard and tenant guard in `common/guards/`, and a minimal `auth` module with `GET /auth/me` endpoint.

**Rationale**:
- The Supabase module provides a singleton client for server-side operations.
- The JWT auth guard verifies the Supabase JWT on incoming requests by calling `supabase.auth.getUser()` with the Bearer token.
- The tenant guard extracts `tenant_id` from the verified JWT's `app_metadata`.
- `GET /auth/me` is a minimal endpoint that returns the current user's profile, validating the full auth chain works.
- Following Constitution Principle VI: guards + decorators, no hardcoded role checks.

**Alternatives considered**:
- Passport.js JWT strategy: Extra dependency. Supabase JWT verification is simpler and more direct.
- No API auth in this feature: Violates FR-009 ("session token for all subsequent API requests"). At minimum, the guard infrastructure must exist.

---

## Decision 8: Database Schema — Minimal for Auth

**Decision**: Create two tables in the first migration: `tenants` and `profiles`. Enable RLS on both.

**Rationale**:
- `tenants` is a dependency of `profiles` (every user belongs to a tenant) and is required by Constitution Principle I.
- `profiles` extends `auth.users` with `role`, `tenant_id`, and `full_name`.
- A trigger on `auth.users` insert can auto-create a `profiles` row (useful for future sign-up flows, not needed for seeding).
- RLS policies: users can read their own profile; admins can read profiles within their tenant.

**Alternatives considered**:
- Skip tenants table, hardcode tenant_id: Violates Constitution Principle I. Not viable.
- Create all planned tables now: Scope creep. Only auth-related tables for this feature.
