# API-First Data Access Guideline — Design Spec

**Date**: 2026-04-09
**Status**: Approved

## Problem

No explicit guideline exists in CLAUDE.md, the Constitution, agents, or speckit templates to prevent frontend apps from accessing the database directly via the Supabase client. The 008-catalog-users branch demonstrates the consequence: 6 Next.js Server Actions perform full CRUD against `profiles` and `user_groups` tables, duplicating business logic already present in the NestJS API. This bypasses NestJS guards, interceptors, and the repository pattern — undermining tenant isolation, RBAC, and the modular monolith architecture.

## Decisions

| Question | Decision |
|----------|----------|
| Auth on frontend? | Allowed — `supabase.auth.*` for login, logout, session, `getUser()` |
| Realtime on frontend? | Allowed — `supabase.channel()`, `.on()` for live updates |
| DB operations on frontend? | Prohibited — `supabase.from()`, `.rpc()`, `.storage` must go through NestJS API |
| Server Actions for data? | Prohibited — no `"use server"` actions with DB queries/mutations |
| Frontend data fetching? | `fetch`/TanStack Query calling NestJS REST endpoints |
| Desktop sync direction? | Realtime for receiving updates; writes go through NestJS API |
| Supabase client files? | Add `// AUTH & REALTIME ONLY` header comments; defer file renaming to 008 refactor |
| Enforcement approach? | Documentation + agent updates + code-level comments (Approach B) |
| Scope | Guidelines only — no code refactoring of existing 008 server actions |

## Changes

### 1. Constitution — New Principle VIII: API-First Data Access (NON-NEGOTIABLE)

File: `.specify/memory/constitution.md`

- All database operations (`supabase.from()`, `.rpc()`, `.storage`) MUST go through the NestJS API. Frontend apps MUST NOT query or mutate database tables directly.
- Allowed frontend Supabase usage: Authentication (`supabase.auth.*`) and Realtime subscriptions (`supabase.channel()`, `.on()`). Nothing else.
- Next.js Server Actions MUST NOT contain database queries or mutations. Frontend data operations use `fetch` or TanStack Query to call NestJS REST endpoints.
- Frontend Supabase client files MUST be named to reflect auth/realtime purpose and include a header comment: `// AUTH & REALTIME ONLY — no .from(), .rpc(), .storage`.
- The NestJS API is the single source of truth for business logic, validation, tenant isolation, and RBAC enforcement. Duplicating these concerns in frontend code is prohibited.
- Desktop app data sync: Supabase Realtime for receiving live updates; all write operations go through NestJS API endpoints.

### 2. CLAUDE.md Updates

File: `CLAUDE.md`

**2a. New "Data Access Rules" section** under Architecture:
- API-first: all DB operations through NestJS API
- Allowed frontend Supabase: auth + realtime only
- No Server Actions for data
- Client naming convention with `// AUTH & REALTIME ONLY` comment
- Desktop sync pattern

**2b. Update State management** to add:
- "Data fetching: TanStack Query v5 calls NestJS API endpoints — never direct Supabase DB queries"

**2c. Update "Adding New Features" step 1** to reinforce:
- "Data fetching via TanStack Query against NestJS API endpoints. No direct Supabase DB access."

### 3. Agent Updates

**3a. Frontend Developer Agent** (`.claude/agents/frontend-developer-agent.md`)

Add to Constraints:
- No direct Supabase database access — all data operations go through NestJS API via fetch/TanStack Query
- No Server Actions for data queries or mutations — only for auth-related operations
- Supabase client usage restricted to auth and Realtime

Add to Responsibilities:
- Enforce API-first data access: all data fetching/mutations use TanStack Query hooks calling NestJS REST endpoints

**3b. Backend Developer Agent** (`.claude/agents/backend-developer-agent.md`)

Add to Constraints:
- The NestJS API is the single entry point for all database operations — frontend apps must never bypass it

Add to Responsibilities:
- Ensure every frontend data need has a corresponding API endpoint

### 4. Speckit Spec Template

File: `.specify/templates/spec-template.md`

New "Data Access Architecture" section after Requirements (mandatory for features involving data):
- Table mapping each operation to an API endpoint, HTTP method, request DTO, and response DTO
- Explicit statement of frontend data flow: TanStack Query -> NestJS API -> Repository -> Supabase
- Reminder of allowed frontend Supabase usage

### 5. Supabase Client File Comments

Add `// AUTH & REALTIME ONLY` header comments to:
- `apps/web/src/shared/lib/supabase/server.ts`
- `apps/web/src/shared/lib/supabase/client.ts`
- `apps/web/src/shared/lib/supabase/middleware.ts` (AUTH ONLY variant)
- `apps/desktop/src/shared/lib/supabase.ts`

File renaming deferred to the 008 refactor task to avoid breaking existing imports.

## Files Modified

| File | Change |
|------|--------|
| `.specify/memory/constitution.md` | Add Principle VIII |
| `CLAUDE.md` | Add Data Access Rules section, update state management, update Adding New Features |
| `.claude/agents/frontend-developer-agent.md` | Add constraints + responsibility |
| `.claude/agents/backend-developer-agent.md` | Add constraint + responsibility |
| `.specify/templates/spec-template.md` | Add Data Access Architecture section |
| `apps/web/src/shared/lib/supabase/server.ts` | Add AUTH & REALTIME ONLY header comment |
| `apps/web/src/shared/lib/supabase/client.ts` | Add AUTH & REALTIME ONLY header comment |
| `apps/web/src/shared/lib/supabase/middleware.ts` | Add AUTH ONLY header comment |
| `apps/desktop/src/shared/lib/supabase.ts` | Add AUTH & REALTIME ONLY header comment |

## Out of Scope

- Refactoring existing 008-catalog-users server actions (separate follow-up task)
- Renaming Supabase client files (deferred to 008 refactor to avoid import breakage)
- Custom ESLint rule for automated enforcement (future enhancement)
- TypeScript wrapper restricting Supabase client methods (rejected as premature)
