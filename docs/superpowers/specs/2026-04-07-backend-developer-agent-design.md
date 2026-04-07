# Backend Developer Agent — Design Spec

**Date**: 2026-04-07
**Status**: Approved

## Summary

A guidance-only Claude agent for NestJS API and Supabase backend work in the Ramcar Platform monorepo. Mirrors the `frontend-developer-agent.md` structure with responsibilities grouped into two domains: NestJS API patterns and Supabase patterns.

## Decisions

| Question | Decision |
|----------|----------|
| Target scope | `apps/api`, `supabase/`, `packages/shared` (backend-facing), `packages/db-types` (regen guidance only) |
| Supabase scope | Full — RLS, migrations, Auth, Storage, Realtime, infrastructure client |
| Autonomy level | Guidance-only (patterns, snippets, steps — no full autonomous implementation) |
| Convention source | CLAUDE.md only — no extra invented rules |
| Prerequisites | Spec + plan must exist before the agent provides guidance |
| Electron main process | Out of scope (different runtime, SQLite, offline-first) |
| Responsibility grouping | Two groups within one agent: NestJS API patterns + Supabase patterns |
| Escalation | code-reviewer, planner, frontend-developer-agent, orchestrator |
| Approach | Single agent with grouped responsibilities (Approach B) |

## Agent Structure

### Frontmatter

Standard agent frontmatter: name, expertise-domain (`backend-development`), status, version, prerequisites, supported-tasks, escalates-to.

### Sections

1. **Role** — NestJS/Supabase expert for Ramcar monorepo backend architecture
2. **Activation** — Triggered by NestJS, API endpoint, Supabase, migration, RLS, repository, guard, tenant, RBAC, database schema questions
3. **Prerequisites** — CLAUDE.md reviewed, target module identified, spec + plan exist
4. **Constraints** — Guidance-only, backend-only, no db-types manual edits, no frontend code, no Electron main process, no unscoped queries, no import rule deviations
5. **Responsibilities — NestJS API Patterns** — Modular monolith architecture, request flow, simple vs complex modules, guards/decorators, RBAC, tenant isolation, Zod validation, BullMQ queues
6. **Responsibilities — Supabase Patterns** — Migrations, RLS policies, Auth, Storage, Realtime, infrastructure client, schema design
7. **Scope** — Explicit list of apps/packages covered and excluded
8. **Output Format** — Code snippets + CLAUDE.md compliance + numbered steps + spec references
9. **Honest Challenge** — Same framework as frontend agent, grounded in CLAUDE.md conventions
10. **Escalation** — Routes to code-reviewer, planner, frontend-developer-agent, or orchestrator

## Scope Boundaries

### In Scope

- `apps/api` — NestJS modular monolith (modules, controllers, services, repositories, guards, interceptors, pipes)
- `supabase/` — Migrations, seed data, Supabase CLI config
- `packages/shared` — Zod validators, TypeScript types (backend-facing: DTOs, API contracts)
- `packages/db-types` — Regeneration guidance only (never edit manually)

### Supabase Concerns

- Database migrations (SQL, schema design)
- Row Level Security policies
- Auth (JWT, 2FA TOTP, Supabase Auth config)
- Storage (buckets, policies)
- Realtime (subscriptions, broadcast)
- Infrastructure client singleton (`src/infrastructure/`)

### Out of Scope

- `apps/web`, `apps/www`, `apps/desktop` — all frontend (→ frontend-developer-agent)
- `packages/ui`, `packages/store` — frontend packages (→ frontend-developer-agent)
- Electron main process — services, repositories, SQLite, SyncEngine, IPC
- Direct `packages/db-types` edits — auto-generated from Supabase schema

## Constraints

- Guidance-only — provides patterns/snippets/steps, not full autonomous implementation
- No `packages/db-types` manual edits (auto-generated from Supabase schema)
- No frontend code (no React, no App Router pages, no Zustand, no TanStack Query)
- No Electron main process code (no SQLite, no IPC, no SyncEngine)
- No deviations from CLAUDE.md architecture without explicit justification
- Every query MUST include tenant_id filtering — no unscoped queries
- Cross-module communication through NestJS DI (exported services), never direct file imports

## Responsibilities — NestJS API Patterns

- Guide NestJS module creation following modular monolith architecture (`src/modules/[domain]/`)
- Enforce CLAUDE.md request flow: `Controller → Service → Repository → Supabase/Postgres`
- Simple vs complex module decisions: when to add `use-cases/` directory and repository interfaces
- Guard and decorator patterns: `JwtAuthGuard`, `RolesGuard`, `TenantGuard`, `@CurrentTenant()`, `@Roles()`
- RBAC enforcement: `SuperAdmin > Admin > Guard > Resident` hierarchy
- Tenant isolation: TenantGuard extracts tenant_id from JWT, every query filtered
- Zod validation pipe for DTOs (`packages/shared` validators reused from frontend)
- Common module patterns: interceptors, exception filters, custom decorators
- BullMQ queue patterns (`src/infrastructure/`)

## Responsibilities — Supabase Patterns

- Migration authoring: SQL conventions, `pnpm db:new`, `pnpm db:migrate`, `pnpm db:types` workflow
- RLS policy design: tenant-scoped policies matching RBAC roles
- Supabase Auth integration: JWT validation, 2FA TOTP setup, session management
- Storage bucket configuration and access policies
- Realtime subscription patterns (channels, broadcast, presence)
- Infrastructure client singleton guidance (`src/infrastructure/`)
- Schema design: table relationships, indexes, constraints, naming conventions

## Escalation Paths

- → `code-reviewer-agent`: Review existing backend code for convention violations
- → `planner-agent`: Architectural decisions spanning multiple modules or packages
- → `frontend-developer-agent`: Backend change has frontend implications (new endpoint needs TanStack Query hook, changed DTO affects forms, shared Zod schema updates)
- → `orchestrator`: Task requires speckit workflow guidance

## Orchestrator Routing Entry

| User Intent Signal | Routes To | Via Command |
|---|---|---|
| "NestJS", "API endpoint", "Supabase", "migration", "RLS", "repository", "guard", "tenant", "RBAC", "backend module", "database schema" | `backend-developer-agent` | (direct invocation) |

## Differences from Frontend Agent

| Aspect | Frontend Agent | Backend Agent |
|--------|---------------|---------------|
| Stack | React/Next.js/Tailwind/shadcn | NestJS/Supabase/PostgreSQL |
| Architecture | Feature-based + App Router | Modular monolith + Repository pattern |
| State management | TanStack Query + Zustand | Tenant isolation + RBAC guards |
| Responsibility structure | Flat list | Two groups (NestJS + Supabase) |
| Multi-app awareness | 3 apps + 3 packages | 1 app + supabase/ + 2 packages |
| Cross-agent escalation | code-reviewer, planner, orchestrator | code-reviewer, planner, frontend-developer-agent, orchestrator |

## File Location

`.claude/agents/backend-developer-agent.md`
