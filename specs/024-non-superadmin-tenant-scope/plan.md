# Implementation Plan: Single-Tenant UI Scope for Admins and Guards (v1)

**Branch**: `024-non-superadmin-tenant-scope` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-non-superadmin-tenant-scope/spec.md`

## Summary

Walk back the multi-tenant UI surfaces introduced in specs 020/021 for two roles only — Admin and Guard — at the v1 product layer, while preserving every primitive in the API, the database, the JWT, and the SuperAdmin experience. Three concerns, one source-of-truth function each, all consumed from existing host-app surfaces:

1. **Selector visibility (FR-001/FR-002)** — `<TenantSelector />` returns a static, non-interactive display when the role is not SuperAdmin, regardless of how many `tenant_ids` the JWT grants. Today the shared component already takes the static branch when `tenantIds.length <= 1`; we widen that branch to also cover `role !== SuperAdmin`. Same component is consumed by `apps/web` and `apps/desktop`, so the change ships in both apps with one edit.
2. **Tenant-create gating (FR-008–FR-013)** — the Tenants-catalog Create button (web-only, Admin/SuperAdmin) gets a single policy gate. SuperAdmin always opens the Sheet from spec 020. Admin with zero existing tenants opens the Sheet (first-tenant onboarding). Admin with one or more existing tenants opens a new info-only `ContactSupportDialog` that explains the v1 limit; no bypass, no form. Re-evaluated on every click (no cached state).
3. **User-form tenant field (FR-014–FR-019)** — the multi-select-with-chips `TenantMultiSelect` introduced in spec 020 user story 6 is removed from the v1 user-creation/edit form for admin/guard roles. Replaced with the same single-select control already used for residents, with two behaviors keyed off the **creator's** role: SuperAdmin picks freely from all tenants; Admin sees the field pre-selected to their current tenant and locked (`disabled`). The HTTP payload still ships `tenant_ids: [oneTenantId]` + `primary_tenant_id: oneTenantId` for admin/guard roles so the spec-020 API contract remains untouched (FR-022).

The three rules are the only behaviors this spec adds. They are wired through a new tiny `policy/` module inside `packages/features/src/tenant-selector/` so that subsequent work (subscription tiers, per-account permissions) can replace `role === "SuperAdmin"` with `tier.allowsMultiTenantUI` in three small functions instead of editing every consumer (FR-025, SC-008). No API change, no DB change, no JWT change, no desktop SQLite change. `TenantMultiSelect` becomes dead code and is deleted (with its tests).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS

**Primary Dependencies**:
- Next.js 16 (App Router, web), `next-intl` v4 (web i18n adapter)
- Electron 30 + Vite + React 18 (desktop), `react-i18next` (desktop i18n adapter)
- `@ramcar/features` — extends the existing `tenant-selector/` shared module (new `policy/` namespace + a small ContactSupportDialog primitive)
- `@ramcar/ui` — reuses existing `Dialog` family and `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` from spec 020; **no new shadcn primitives**
- `@ramcar/store` — `authSlice` from spec 020/021 (`tenantIds`, `activeTenantId`, `activeTenantName`, `setActiveTenant`, `hydrateActiveTenant`); no schema change to the slice
- `@ramcar/shared` — existing `Role` type and `getAssignableRoles` helper; no new Zod schemas (FR-022 forbids API surface changes)
- `@ramcar/i18n` — message catalog gains 4 keys (`tenants.contactSupport.{title,body,close}`, `users.form.tenantLockedHint`); both web (`next-intl`) and desktop (`react-i18next`) consume the same JSON
- TanStack Query v5 — already used by the consumers; no key changes (FR-022)

**Storage**: N/A — purely UI policy. No PostgreSQL change. No Supabase Storage change. No SQLite change. No outbox column.

**Testing**:
- **Unit (Vitest, `@ramcar/features`)** — three pure-function tests: `canShowTenantSelector(role)`, `canCreateAnotherTenant(role, tenantsCount)`, `canEditUserTenantField(role)`. Branches: SuperAdmin/Admin/Guard/Resident × edge counts.
- **Component (Vitest + RTL, `apps/web`)** — `TenantsTable` create-button test for both branches (Sheet vs. ContactSupportDialog) for Admin role; `UserForm` test that the tenant `<Select>` is rendered for admin/guard roles AND is `disabled` when the creator is Admin AND pre-selected to the Admin's `activeTenantId`.
- **Component (Vitest, `packages/features`)** — `TenantSelector` test: returns the static span (no popover trigger, no `Command`) when `useRole().role !== "SuperAdmin"` even with `tenantIds.length > 1`; preserves existing static-display path; preserves the popover for SuperAdmin.
- **E2E (Playwright, `apps/web`)** — three scripts:
  1. Sign in as Admin with one tenant → confirm no selector + no cross-tenant data + Tenants-create opens ContactSupportDialog.
  2. Sign in as Admin with zero tenants → click Create Tenant → fill Sheet → save → click Create Tenant again → ContactSupportDialog appears (no manual reload).
  3. Sign in as SuperAdmin → confirm selector renders, all-tenants list, Tenants-create always opens Sheet.
- **API regression (Jest, `apps/api`)** — re-run the spec-020 access-matrix tests for `/api/users` create/update without modification; this spec must not change them. CI gate: any failure here means we accidentally edited the API.
- **Desktop (Vitest + JSDOM, `apps/desktop`)** — selector hide test for Guard. No outbox tests change.

**Target Platform**:
- Web: Next.js 16 SSR + client on modern evergreen browsers
- Desktop: Electron 30 (macOS/Windows), offline-first
- API: unchanged

**Project Type**: Turborepo monorepo with web + desktop + api + shared packages. Touches three packages (`@ramcar/features`, `@ramcar/i18n`, no `@ramcar/shared` since no Zod change) and two apps (`apps/web` for tenant-create gating + user-form rollback; `apps/desktop` only inherits the selector change via the shared module).

**Performance Goals**:
- Selector render is unchanged in cost (a single role check before the existing render path).
- User-form render drops one Popover + Command list when the creator is Admin/Guard — strictly faster than v0.
- Contact-support Dialog open: < 100 ms from click to visible (matches existing Dialog open timing — same primitive). Verified manually in quickstart.

**Constraints**:
- **No API change** (FR-022). The user-creation endpoint still expects `tenant_ids: [string]` + `primary_tenant_id` for admin/guard roles; the v1 frontend always sends an array of length 1 from the locked single-select.
- **No DB / RLS change** — the policies from spec 020 still allow N tenants per Admin/Guard. Server is a strict superset of what the v1 UI exposes.
- **No Zustand-slice change** — FR-024 says enforce through the existing role adapter, not by editing the auth slice or the API.
- **Single source of truth** (FR-025) — three policy functions live in one file; consumers import them by name.
- **i18n through `@ramcar/i18n`** (FR-023) — strings consumed via the existing `useI18n()` adapter from the shared feature module (web wires `next-intl`, desktop wires `react-i18next`).
- **No new file routes** (CLAUDE.md UI Patterns) — the contact-support Dialog is opened from the existing Tenants table component; no `/contact` page, no `/upgrade` page.

**Scale/Scope**:
- Files modified: 1 in `packages/features/`, 2 new + 0 modified in `packages/features/src/tenant-selector/policy/`, 2 in `packages/i18n/`, 4 in `apps/web/src/features/{tenants,users}/`. Estimated total surface: ~10 files; ~250 lines added; ~180 lines removed (the deletion of `TenantMultiSelect` and its associated tests/strings is a net subtract).
- The three policy functions are < 5 lines each; they are deliberately small to make the future tier/permission swap mechanical.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | ✅ Strengthens | The v1 UI exposes one tenant per Admin/Guard session; the API and RLS continue to enforce tenant scope. A tampered client that bypasses the read-only field still hits the spec-020/021 server-side checks (FR-026 from spec 021). No new DB queries, no new unscoped queries. |
| **II. Feature-Based Architecture** | ✅ Compliant | Selector logic stays in `packages/features/src/tenant-selector/` (cross-app). Tenant-create gating + user-form changes stay in `apps/web/src/features/{tenants,users}/`. No domain logic in `src/app/` routes. |
| **III. Strict Import Boundaries (NON-NEGOTIABLE)** | ✅ Compliant | The shared `tenant-selector/policy/` module is pure functions over `Role` and `number`; no Next.js, no React. The web `TenantsTable` imports policy by name from `@ramcar/features/tenant-selector`. No `features/A → features/B` imports introduced. |
| **IV. Offline-First Desktop (NON-NEGOTIABLE)** | ✅ No impact | No SQLite schema change. No new outbox kind. The selector hide rule is read-only state (role from JWT) and works fully offline. The user-creation form is portal-only; desktop is not affected by Story 3. |
| **V. Shared Validation via Zod** | ✅ N/A | No new DTOs. The existing `createUserSchema` / `updateUserSchema` from `@ramcar/shared` already accept `tenant_ids: string[]` + `primary_tenant_id`; v1 sends `[oneId]` and `oneId` respectively. No schema edit. |
| **VI. Role-Based Access Control** | ✅ Strengthens | Three v1-specific UI restrictions are layered on top of the existing four-role hierarchy. Frontend hides UI per role; the API rejects multi-tenant payloads from non-SuperAdmin actors via the spec-020 server checks unchanged. UI policy is the *additional* layer, not the *only* layer. |
| **VII. TypeScript Strict Mode** | ✅ Compliant | All three policy functions are typed `(role: Role) => boolean` or `(role: Role, tenantsCount: number) => boolean`. No `any`. Removing `TenantMultiSelect` removes one Popover + Command tree but keeps the form fully typed. |
| **VIII. API-First Data Access (NON-NEGOTIABLE)** | ✅ Compliant | No new `supabase.from()/.rpc()/.storage` from frontend. No new endpoints. Tenants list / Tenants create / Users create still go through the NestJS API. |

**Cross-App Shared Feature Modules (CLAUDE.md)** — ✅ Compliant. The selector hide rule lives in the existing shared `packages/features/src/tenant-selector/` module (extended with `policy/`); the rule applies uniformly to both `apps/web` and `apps/desktop` from one place. The contact-support Dialog is web-only because the Tenants catalog is web-only — Guards do not have access on desktop, and Admins manage tenants from the portal. No per-app duplication of Story 1 or Story 3 logic.

**UI Patterns (CLAUDE.md)** — ✅ Compliant. The contact-support Dialog is a `Dialog` from `@ramcar/ui`, not a Sheet — correct primitive for confirm/info flows. The user-form Sheet from spec 015 is reused (no new `/new`/`/[id]/edit` route). No catalog form regresses to a dedicated page.

**Gate result (pre-research)**: PASS. No violations; Complexity Tracking section omitted.

**Gate result (post-design re-check)**: PASS — no design discoveries forced changes. Same evaluation holds after Phase 1 artifacts (research.md / data-model.md / contracts/).

## Project Structure

### Documentation (this feature)

```text
specs/024-non-superadmin-tenant-scope/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (resolves all NEEDS CLARIFICATION)
├── data-model.md        # Phase 1 output (no DB tables; documents the
│                        #   "current tenant" computation + the three
│                        #   policy functions as the data-shape contract)
├── quickstart.md        # Phase 1 output (manual verification script)
├── contracts/
│   ├── tenant-selector-visibility.md     # UI contract: when the selector renders
│   ├── tenant-create-gating.md           # UI contract: Sheet vs ContactSupportDialog
│   └── user-form-tenant-field.md         # UI contract: single-select rules per role
├── spec.md
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
packages/features/
└── src/
    └── tenant-selector/
        ├── components/
        │   ├── tenant-selector.tsx                          # UPDATE — gate popover render on canShowTenantSelector(role)
        │   └── contact-support-dialog.tsx                   # NEW — small info-only Dialog used by tenant-create gating
        ├── hooks/
        │   ├── use-active-tenant.ts                         # (no change)
        │   ├── use-tenant-list.ts                           # (no change)
        │   └── use-tenant-switch.ts                         # (no change)
        ├── policy/                                          # NEW — single source of truth for the three v1 rules
        │   ├── can-show-tenant-selector.ts                  # NEW — (role) => role === "SuperAdmin"
        │   ├── can-create-another-tenant.ts                 # NEW — (role, tenantsCount) => …
        │   ├── can-edit-user-tenant-field.ts                # NEW — (role) => role === "SuperAdmin"
        │   ├── policy.test.ts                               # NEW — Vitest
        │   └── index.ts                                     # NEW — barrel
        └── index.ts                                         # UPDATE — re-export ContactSupportDialog + policy/

packages/i18n/
└── src/
    └── messages/
        ├── en.json                                          # UPDATE — add 4 keys (see Contracts)
        └── es.json                                          # UPDATE — add 4 keys

apps/web/
└── src/
    └── features/
        ├── tenants/
        │   └── components/
        │       └── tenants-table.tsx                        # UPDATE — branch handleCreate via canCreateAnotherTenant
        └── users/
            └── components/
                ├── user-form.tsx                            # UPDATE — replace TenantMultiSelect branch with locked single-select
                ├── tenant-multi-select.tsx                  # DELETE — dead code in v1
                ├── user-sidebar.tsx                         # (no change — passes tenants list down unchanged)
                └── __tests__/
                    ├── user-form-validation.test.tsx        # UPDATE — drop multi-tenant array assertions; add single-tenant locked assertions
                    ├── user-form-role-lock.test.tsx         # UPDATE — add Admin tenant-field-locked case
                    └── user-form-user-group.test.tsx       # (no change)

apps/desktop/
└── (no app-specific changes — desktop receives the selector hide rule
   transitively from the shared feature module change.)
```

**Structure Decision**: This feature lives where its consumers already live. The single shared concern (selector visibility) is in `packages/features/src/tenant-selector/`. The two web-only concerns (tenant-create gating + user-form rollback) are in `apps/web/src/features/{tenants,users}/`. The single-source-of-truth policy functions are co-located with the selector module so a future tier/permission system can replace the body of three small files without scattering across the codebase. No new `apps/`, no new `packages/`, no migrations, no new routes.

## Complexity Tracking

> Constitution Check passed without violations; this section intentionally left empty.
