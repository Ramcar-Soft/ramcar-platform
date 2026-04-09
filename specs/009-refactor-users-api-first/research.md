# Research: Catalog Users — API-First Refactor

**Date**: 2026-04-09  
**Branch**: `009-refactor-users-api-first`

## R1: Tenants API Endpoint

**Decision**: Create a new `TenantsModule` in `apps/api/src/modules/tenants/` with a `GET /tenants` endpoint.

**Rationale**: No tenants endpoint exists. The frontend needs a tenant list for the Super Admin filter and the create/edit user form's tenant selector. Currently, the Server Action (`getTenants()` in `get-users.ts`) queries `supabase.from("tenants")` directly — this must be replaced with an API call.

**Alternatives considered**:
- Embed tenant list in the users API response → rejected: tenants are needed independently (filter dropdown loads before users list)
- Return tenants as part of user metadata → rejected: different cache lifecycle, different access pattern

**Implementation notes**:
- Controller: `GET /tenants` — protected by `JwtAuthGuard`, `TenantGuard`, `RolesGuard` with `@Roles("super_admin", "admin")`
- Service: `findAll()` — Super Admins see all tenants, Admins see only their own tenant
- Repository: `supabase.from("tenants").select("id, name").order("name")`
- Register `TenantsModule` in `app.module.ts`

## R2: API Base URL Configuration

**Decision**: Add `NEXT_PUBLIC_API_URL` environment variable to `.env`, `.env.development`, and `.env.example`.

**Rationale**: No API base URL is configured anywhere in the frontend environment files. The NestJS API runs on a separate port (default `3001` per `apps/api` config). The frontend needs a known base URL to make HTTP requests.

**Alternatives considered**:
- Hardcode `localhost:3001` → rejected: breaks in non-local environments
- Use Next.js rewrites/proxy → rejected: adds unnecessary complexity; direct API calls are simpler and more explicit

**Implementation notes**:
- `.env.example`: `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `.env.development`: `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `.env`: set to actual development value
- The `NEXT_PUBLIC_` prefix makes it available in client-side code (required for browser-side TanStack Query calls)

## R3: Frontend API Client (fetch wrapper)

**Decision**: Create a shared `api-client.ts` in `apps/web/src/shared/lib/` that wraps `fetch` with JWT auth headers.

**Rationale**: Every API call needs the Supabase JWT in the `Authorization: Bearer <token>` header. A shared client avoids duplicating token retrieval logic across every hook. The JWT Auth Guard in NestJS (`apps/api/src/common/guards/jwt-auth.guard.ts`) extracts the token from this header and validates via `supabase.auth.getUser(token)`.

**Alternatives considered**:
- Use Axios → rejected: `fetch` is native, no extra dependency needed; TanStack Query works well with `fetch`
- Pass token per-hook → rejected: duplicates `supabase.auth.getSession()` call in every hook

**Implementation notes**:
- Exports an `apiClient` object with `get`, `post`, `put`, `patch`, `delete` methods
- Each method: gets session via `supabase.auth.getSession()`, attaches `Authorization: Bearer ${session.access_token}`, calls `fetch` with `NEXT_PUBLIC_API_URL` as base
- Throws on non-2xx responses with parsed error body
- All TanStack Query hooks import from this single client

## R4: TanStack Query Setup

**Decision**: No changes needed — QueryClientProvider already exists and is wired up.

**Rationale**: 
- `apps/web/src/shared/lib/query-provider.tsx` exists with TanStack Query v5.97.0
- It's wired into `apps/web/src/app/[locale]/(dashboard)/dashboard-shell.tsx`
- Default `staleTime: 60 * 1000` (1 minute)
- Uses `useRef` to avoid re-creation on renders

**Implementation notes**:
- Existing hooks (`use-users.ts`, `use-create-user.ts`, `use-update-user.ts`, `use-user-groups.ts`) already use TanStack Query patterns — they just need to swap Server Action calls for `apiClient` calls
- Query key pattern should follow Constitution: `[resource, tenantId, modifier, filters]`

## R5: Password Handling in API

**Decision**: Update `UsersRepository.create()` to accept an optional `password` parameter. When provided, use it instead of generating a random one. When omitted, generate random password AND send recovery link (existing behavior).

**Rationale**: The current repository (`apps/api/src/modules/users/users.repository.ts` lines 60-113) generates a random temporary password and creates a recovery link. The spec requires the admin to optionally set a password on creation. The conditional logic is minimal.

**Alternatives considered**:
- Always require password → rejected: spec says optional with fallback to reset link
- Handle in service layer instead of repository → rejected: auth account creation is a repository concern; the repository already calls `supabase.auth.admin.createUser()`

**Implementation notes**:
- `CreateUserDto` (API): add optional `password?: string`
- `UsersRepository.create()`: if `dto.password` exists, use it; else generate random + send recovery link
- `UsersService.create()`: pass password through to repository
- `@ramcar/shared` `createUserSchema`: add optional `password` and `confirmPassword` with `.refine()` for match validation

## R6: Shared Schema Updates

**Decision**: Update `@ramcar/shared` validators to make address/username/phone required on create, and add optional password/confirmPassword.

**Rationale**: The spec (FR-007, FR-008a, FR-019) mandates these fields as required. The current `createUserSchema` has them as optional. The `updateUserSchema` (currently all optional) also needs address/username/phone required per the clarification that edit form enforces same required fields.

**Current state** (`packages/shared/src/validators/user.ts`):
- `createUserSchema`: fullName, email, role, tenantId required; address, username, phone, phoneType, userGroupIds, observations optional
- `updateUserSchema`: all fields optional

**Target state**:
- `createUserSchema`: fullName, email, role, tenantId, address, username, phone required; password, confirmPassword, phoneType, userGroupIds, observations optional. Add `.refine()` for password match.
- `updateUserSchema`: fullName, email, role, tenantId, address, username, phone required; phoneType, userGroupIds, observations optional. No password fields.

## R7: Existing Hook Rewrite Pattern

**Decision**: Rewrite all 4 existing hooks in-place, swapping Server Action calls for `apiClient` calls. Add 2 new hooks.

**Rationale**: The hooks already follow TanStack Query patterns (`useQuery`/`useMutation`). The change is mechanical: replace `getUsers(filters)` with `apiClient.get('/users', { params: filters })`.

**Hooks to rewrite**:
| Hook | Current Source | New Source | Query Key |
|------|---------------|------------|-----------|
| `use-users.ts` | `getUsers()` Server Action | `GET /api/users` | `["users", tenantId, "list", filters]` |
| `use-user-groups.ts` | `getUserGroups()` Server Action | `GET /api/user-groups` | `["user-groups"]` |
| `use-create-user.ts` | `createUser()` Server Action | `POST /api/users` | invalidates `["users"]` |
| `use-update-user.ts` | `updateUser()` Server Action | `PUT /api/users/:id` | invalidates `["users"]`, `["users", id]` |

**New hooks**:
| Hook | Source | Query Key |
|------|--------|-----------|
| `use-toggle-status.ts` | `PATCH /api/users/:id/status` | invalidates `["users"]` |
| `use-tenants.ts` | `GET /api/tenants` | `["tenants"]` |

## R8: Server Actions Removal

**Decision**: Delete the entire `apps/web/src/features/users/actions/` directory after all hooks are rewritten.

**Rationale**: All 6 files in this directory use `"use server"` with `supabase.from()` calls, violating Constitution Principle VIII. Once hooks call the API directly, these files have no consumers.

**Files to delete**:
- `actions/create-user.ts` — `supabase.from("profiles").insert()`
- `actions/get-users.ts` — `supabase.from("profiles").select()`, `supabase.from("user_groups").select()`, `supabase.from("tenants").select()`
- `actions/get-user.ts` — `supabase.from("profiles").select()`
- `actions/get-user-groups.ts` — `supabase.from("user_groups").select()`
- `actions/update-user.ts` — `supabase.from("profiles").update()`
- `actions/toggle-user-status.ts` — `supabase.from("profiles").update()`
