# Implementation Plan: Active Tenant Scoping from the Top-Bar Selector

**Branch**: `021-tenant-selector-scope` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-tenant-selector-scope/spec.md`

## Summary

Make the top-bar tenant selector the single, authoritative scope for every read and write in the portal and the guard booth, with an explicit confirmation dialog before switching. The primitives added by spec 020 (authSlice `activeTenantId`, the shared `<TenantSelector />` component, and the multi-tenant RLS) are already in place; this feature makes them load-bearing. The technical approach is: (1) every HTTP request from web, desktop, and the shared transport adapter attaches `X-Active-Tenant-Id` derived from the authSlice; (2) the NestJS `TenantGuard` reads that header, validates it against `tenant_ids` in the JWT, and drives `@CurrentTenant()` from it instead of falling back to ambient route params; (3) every TanStack Query key used by a scoped feature includes `activeTenantId` so the cache partitions per tenant; (4) the tenant-selector `onSelect` handler is routed through a new `<ConfirmSwitchDialog />` that also warns about unsaved work before the switch applies; (5) Bitacora seeds its in-page dropdown from `activeTenantId` on mount (and on top-bar change) while keeping its URL `tenant_id` param as the authoritative filter; (6) the desktop SyncOutbox gains a `tenant_id` column stamped at capture time so queued writes land under the tenant that was active when the guard captured, not the one active at flush.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS
**Primary Dependencies**: Next.js 16 (App Router, web), Electron 30 + Vite + React 18 (desktop), NestJS v11 (API), TanStack Query v5, Zustand via `@ramcar/store` (`authSlice`: `activeTenantId`, `activeTenantName`, `tenantIds`, `setActiveTenant`, `hydrateActiveTenant`), `@ramcar/features` (shared `tenant-selector` module + transport/i18n/role adapters), `@ramcar/ui` (`Dialog` family for the confirmation dialog), next-intl v4 (web) / react-i18next (desktop), `@ramcar/i18n` (shared catalogs), Supabase JS v2 (auth + realtime only per Principle VIII), better-sqlite3 (desktop outbox)
**Storage**: PostgreSQL via Supabase — **no schema changes**. Reuses `public.tenants`, `public.user_tenants`, and RLS policies from spec 020. SQLite on desktop — **one additive column**: `sync_outbox.tenant_id TEXT NOT NULL` (new outbox rows only; spec covers only forward traffic since the outbox is drained at release).
**Testing**: Vitest (frontend + shared packages), Jest + ts-jest (`apps/api`), Playwright (`apps/web` E2E), better-sqlite3 in-memory harness for desktop main-process tests. Contract tests live in `specs/021-tenant-selector-scope/contracts/` and are asserted from Jest (API) and Vitest (client) suites.
**Target Platform**: Web (Next.js 16 SSR + client on modern evergreen browsers), Desktop (Electron 30 on macOS/Windows, offline-first), API (NestJS v11 on Node.js 22)
**Project Type**: Monorepo (Turborepo + pnpm) — `apps/web` + `apps/desktop` + `apps/api` + `packages/features` + `packages/store` + `packages/ui` + `packages/i18n` + `packages/shared`
**Performance Goals**: Attaching `X-Active-Tenant-Id` is O(1) per request (no extra round-trip). SC-001: after a confirmed switch, every open scoped view reflects the new tenant within 1 second — achieved by TanStack Query refetch on key change (no page reload, no network stampede beyond the N visible queries). SC-007: under 15 s to switch and capture once.
**Constraints**: Principle I (multi-tenant isolation — every DB query scoped by `tenant_id`); Principle VIII (API-first — client never calls `.from()/.rpc()/.storage`); Principle IV (offline-first — outbox preserves capture-time tenant regardless of later switches); FR-026 (server never trusts the client header blindly — validates membership); FR-027 (no cross-tenant flicker during switch or load). No new external endpoints. No new DB tables. Backward compatibility with super-admin Bitacora "ALL" sentinel (spec 019).
**Scale/Scope**: One shared `<TenantSelector />` component (spec 020); one new `<ConfirmSwitchDialog />` in `packages/features`; two HTTP clients (`apps/web/src/shared/lib/api-client.ts`, `apps/desktop/src/shared/lib/api-client.ts`); one NestJS guard + one decorator; ~10 TanStack Query key families to audit and extend with `activeTenantId`; one SQLite migration; one desktop outbox service + sync engine update. No new API endpoints; no new DTOs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | ✅ Strengthens | Feature explicitly enforces tenant scoping on every read/write. Server re-derives scope from the validated active tenant via `TenantGuard`; never trusts raw client header. RLS policies from spec 020 remain the last line of defense. Integration tests will prove no Tenant A data leaks to a session with Tenant B active. |
| **II. Feature-Based Architecture** | ✅ Compliant | Cross-app tenant-selector logic lives in `packages/features/src/tenant-selector/`. Web-only form-unsaved registry lives in `apps/web/src/shared/hooks/`. Desktop outbox changes live in `apps/desktop/electron/services/` and `electron/repositories/`. No domain logic in `src/app/`. |
| **III. Strict Import Boundaries (NON-NEGOTIABLE)** | ✅ Compliant | Shared tenant-selector module imports only from `@ramcar/ui`, `@ramcar/i18n`, adapters (`transport`, `role`, `i18n`), and `@ramcar/store` — never from host-app `src/features/*`. The logbook seeding hook lives inside `apps/web/src/features/logbook/` and imports `useActiveTenant` from `@ramcar/features`, not the other way around. |
| **IV. Offline-First Desktop (NON-NEGOTIABLE)** | ✅ Compliant | `sync_outbox.tenant_id` stamped at capture time (FR-010). SyncEngine sends each outbox entry with `X-Active-Tenant-Id: <row.tenant_id>` — never with the currently active UI tenant. Switching tenants mid-sync never re-tags queued writes. |
| **V. Shared Validation via Zod** | N/A | No new DTOs. Existing request bodies are reused verbatim. |
| **VI. Role-Based Access Control** | ✅ Compliant | The selector is hidden (static display) for single-tenant users (FR-004) and residents (FR-024). Super-admin sees the full list via `tenants/selector` endpoint (existing). The guard already filters selector membership by `tenant_ids` from the JWT. |
| **VII. TypeScript Strict Mode** | ✅ Compliant | All new code is strict TS; `tenantId` is typed `string` (never `string \| undefined`) after the guard validates the header. |
| **VIII. API-First Data Access (NON-NEGOTIABLE)** | ✅ Compliant | No new `supabase.from()/.rpc()/.storage` calls. All new client→server traffic goes through existing REST endpoints. The NestJS API remains the single source of truth for scope enforcement. |

**Cross-App Shared Feature Modules (CLAUDE.md)** — ✅ Compliant. The tenant-selector and confirmation-dialog live in `packages/features/src/tenant-selector/` and are consumed by both apps. i18n strings go into `@ramcar/i18n`. No per-app duplication.

**UI Patterns (CLAUDE.md)** — N/A. No catalog create/edit forms are introduced, so the right-side Sheet rule does not apply. The confirmation uses a small centered `Dialog` (not a Sheet), which is the correct primitive for confirm/cancel flows.

**Gate result**: PASS. No violations; Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/021-tenant-selector-scope/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (client state + outbox row shape; no DB tables)
├── quickstart.md        # Phase 1 output (manual verification script for reviewers)
├── contracts/
│   ├── http-active-tenant-header.md   # X-Active-Tenant-Id wire contract
│   ├── endpoint-scoping-matrix.md     # Per-endpoint read/write scope rules
│   └── confirm-switch-dialog.md       # UI contract for the confirmation flow
├── spec.md
└── tasks.md             # Phase 2 output (/speckit.tasks — not created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/features/
└── src/
    ├── tenant-selector/
    │   ├── components/
    │   │   ├── tenant-selector.tsx                    # UPDATE — route onSelect through useTenantSwitch
    │   │   └── confirm-switch-dialog.tsx              # NEW — composed from @ramcar/ui Dialog
    │   ├── hooks/
    │   │   ├── use-tenant-switch.ts                   # NEW — dialog state, confirm/cancel, cache invalidation
    │   │   └── use-active-tenant.ts                   # NEW — thin read hook over authSlice (re-exported to hosts)
    │   └── index.ts                                   # UPDATE — export ConfirmSwitchDialog + hooks
    ├── adapters/
    │   ├── transport.tsx                              # (no change — transport already forwards headers)
    │   ├── unsaved-changes.tsx                        # NEW — port: hasUnsavedChanges() hook, per-host adapter
    │   └── role.tsx                                   # (no change)
    └── shared/
        └── i18n-keys.ts                               # UPDATE — add tenantSelector.confirm.* keys reference

packages/store/
└── src/
    └── slices/
        └── auth-slice.ts                              # (no change expected — already has setActiveTenant/hydrate)

packages/i18n/
└── src/
    └── messages/
        ├── en.ts                                      # UPDATE — add tenantSelector.confirm.* strings
        └── es.ts                                      # UPDATE — add tenantSelector.confirm.* strings

apps/web/
└── src/
    ├── shared/
    │   ├── lib/
    │   │   └── api-client.ts                          # UPDATE — attach X-Active-Tenant-Id from authSlice
    │   └── hooks/
    │       ├── use-form-persistence.ts                # (existing — used by unsaved-changes adapter)
    │       └── use-unsaved-forms-registry.ts          # NEW — Zustand slice + hook for registry
    └── features/
        ├── logbook/
        │   ├── hooks/
        │   │   ├── use-logbook-filters.ts             # UPDATE — seed tenant_id URL param from activeTenantId
        │   │   └── use-logbook.ts                     # (no change — scopeKey already in queryKey)
        │   └── components/
        │       └── tenant-select.tsx                  # UPDATE — re-seed on activeTenantId change (FR-020)
        ├── users/hooks/                               # UPDATE — queryKey audit (add activeTenantId)
        ├── residents/hooks/                           # UPDATE — queryKey audit
        ├── access-log/hooks/                          # UPDATE — queryKey audit (if non-logbook list exists)
        └── navigation/
            └── components/top-bar.tsx                 # (no change — already mounts <TenantSelector />)

apps/desktop/
├── electron/
│   ├── services/
│   │   └── sync-engine.ts                             # UPDATE — stamp tenant_id on enqueue, send header on flush
│   ├── repositories/
│   │   ├── database.ts                                # UPDATE — SQLite schema bump: outbox.tenant_id TEXT NOT NULL
│   │   └── sync-outbox-repository.ts                  # UPDATE — carry tenant_id through queue/dequeue
│   └── ipc/
│       └── sync.handlers.ts                           # UPDATE — pass activeTenantId into enqueue calls
└── src/
    ├── shared/
    │   └── lib/
    │       └── api-client.ts                          # UPDATE — attach X-Active-Tenant-Id (mirror web)
    └── features/
        └── navigation/
            └── components/top-bar.tsx                 # (no change — already mounts <TenantSelector />)

apps/api/
└── src/
    └── common/
        ├── guards/
        │   └── tenant.guard.ts                        # UPDATE — read X-Active-Tenant-Id header first, validate
        └── decorators/
            └── current-tenant.decorator.ts            # (no change — still returns scope; scope.tenantId strict)
```

**Structure Decision**: Continue the monorepo + feature-based layout already established by specs 014 (cross-app modules), 015 (users sidebar), and 020 (tenants catalog). All cross-app UI (selector, confirmation dialog, switch hook, active-tenant read hook, unsaved-changes port) lives in `packages/features/src/tenant-selector/` and adapters under `packages/features/src/adapters/`. Host apps (`apps/web`, `apps/desktop`) provide adapter implementations and app-level concerns only (HTTP client header attach, web-only `useFormPersistence` bridge, desktop-only SQLite outbox column). The API change is a single guard update — no new modules, no new endpoints.

## Complexity Tracking

> No constitution violations — this section intentionally left blank.
