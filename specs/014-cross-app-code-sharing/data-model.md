# Phase 1 — Data Model: Cross-App Shared Feature Modules

**Feature**: 014-cross-app-code-sharing
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Date**: 2026-04-17

## Overview

This feature introduces **no new data entities**. It preserves the existing DTOs, API endpoints, and database schema. See spec "Data Access Architecture" and Constitution Principle VIII — shared hooks call the existing NestJS API.

What this feature does introduce is a small set of **compile-time contracts** that govern how `@ramcar/features` interacts with its host apps: adapter interfaces, slot prop conventions, a feature-scoped Zustand slice shape, and a JSON manifest schema for the CI drift check. These are the "entities" this document captures.

The authoritative TypeScript source lives under [`contracts/`](./contracts/). This file describes the shape, the fields, the relationships, and the validation rules in prose, so reviewers don't have to read TS to understand the design.

---

## Entity map

```text
@ramcar/features
├── adapters/
│   ├── TransportPort          ◄── implemented by apps/web WebTransportProvider
│   │                          ◄── implemented by apps/desktop DesktopTransportProvider
│   ├── I18nPort               ◄── implemented by apps/web WebI18nProvider (next-intl)
│   │                          ◄── implemented by apps/desktop DesktopI18nProvider (react-i18next)
│   └── RolePort               ◄── implemented by each host from its session source
├── visitors/
│   ├── hooks/*                ──► depend on TransportPort + RolePort
│   ├── components/*           ──► depend on I18nPort + slot props
│   └── types.ts               ──► re-exports @ramcar/shared types (no duplication)
└── shared/<primitive>/*       ──► depend on I18nPort, occasionally on TransportPort

@ramcar/store
├── AppState
├── visitorsSlice              (NEW)
└── existing slices            (unchanged)

shared-features.json           (NEW at workspace root)
└── features: [{ name, migratedAt, package }]
```

Each adapter is a *port* (interface only, defined in `@ramcar/features`). Each host app supplies a concrete adapter (the *adapter implementation*) that satisfies the port. Shared code depends on the ports; it never imports from a host app.

---

## 1. TransportPort

**Purpose**: Abstract the act of calling the NestJS API so the shared module is free from any online/offline assumption.

**Fields (methods)**:

| Method | Signature | Semantics |
|---|---|---|
| `get<T>` | `(path: string, opts?: { params?, signal? }) => Promise<T>` | Reads typed JSON DTO from the API |
| `post<T>` | `(path: string, data?: unknown, opts?: { signal? }) => Promise<T>` | Writes JSON body; host may route through outbox (desktop) or direct HTTP (web) |
| `patch<T>` | same as `post` | Partial update |
| `put<T>` | same as `post` | Full replacement |
| `delete<T>` | `(path: string, opts?: { signal? }) => Promise<T>` | Delete |
| `upload<T>` | `(path: string, formData: FormData, opts?: { signal? }) => Promise<T>` | multipart upload |

**Relationships**:
- Host app must provide exactly one `TransportPort` via `<TransportProvider value={impl}>` at its root, above `<StoreProvider>` and `<QueryClientProvider>`.
- Every TanStack Query hook in `@ramcar/features` receives the port via `useTransport()`.

**Validation rules**:
- `path` MUST be a path (starts with `/`), not a full URL. The adapter handles base URL resolution.
- `signal` MUST be forwarded to the underlying `fetch` so TanStack Query cancellation works.
- Errors thrown MUST satisfy the existing `ApiError` contract (`name: "ApiError"`, `status: number`, `body: unknown`) so shared hooks can do conditional error handling (e.g., 409 → "already exists").

**State transitions**: None (stateless service).

---

## 2. I18nPort

**Purpose**: Provide a library-agnostic way for shared components to look up translated strings.

**Fields**:

| Method / prop | Signature | Semantics |
|---|---|---|
| `t` | `(key: string, values?: Record<string, string \| number>) => string` | Look up a translation by dotted key and interpolate values |
| `locale` | `"en" \| "es"` (`Locale` from `@ramcar/i18n`) | Current locale identifier |

**Relationships**:
- Host must provide `I18nPort` via `<I18nProvider value={impl}>` at its root.
- All shared components consume strings via `const { t } = useI18n()`.
- Message catalogs remain in `@ramcar/i18n`; both hosts load them (web via `next-intl`, desktop via `react-i18next`).

**Validation rules**:
- `t(key)` MUST return the key unchanged if the key is missing (both `next-intl` and `react-i18next` do this by default). Shared components MUST NOT fall back to hardcoded strings.
- Keys MUST be the full dotted path (e.g., `"visitPersons.form.fullName"`), not a scoped suffix. Scoping is a host-specific convenience; the shared module standardizes on full keys.
- `values` object MAY omit entries; unused placeholders remain untouched.

**State transitions**: Locale changes are host-driven; shared components re-render when the provider's `locale` value changes.

---

## 3. RolePort

**Purpose**: Give shared hooks the tenant + user + role context they need for query-key composition and (rarely) conditional logic.

**Fields**:

| Field | Type | Semantics |
|---|---|---|
| `role` | `"SuperAdmin" \| "Admin" \| "Guard" \| "Resident"` (from `@ramcar/shared`) | Current user's role |
| `tenantId` | `string` (UUID) | Current tenant for query-key composition |
| `userId` | `string` (UUID) | Current user id for ownership filters |

**Relationships**:
- Each host resolves these from its session (`supabase.auth.getSession()` + user metadata) and injects via `<RoleProvider>`.
- Shared hooks call `const { tenantId } = useRole()` to build keys like `["visit-persons", tenantId, "list", filters]`.
- Shared components MUST NOT render role-gated UI themselves; they accept slot props instead (see §5).

**Validation rules**:
- `tenantId` MUST never be an empty string inside an authenticated render tree. Enforcing non-empty is the host's job (the shared port type is `string`, trusting the host).
- Role MUST be one of the four enum values; unknown values fall back to `"Resident"` (least privilege) at the host level, not inside `@ramcar/features`.

**State transitions**: None (read-only from the shared module's perspective).

---

## 4. Slot prop conventions

**Purpose**: Give shared components named extension points for platform-specific UI without duplicating the component.

**Canonical slot names** (each shared component documents which subset it supports in TSDoc):

| Slot | Type | Typical position | Typical use |
|---|---|---|---|
| `topRightSlot` | `ReactNode` | Header/toolbar right | Sync badge (desktop), export CSV (web) |
| `trailingAction` | `ReactNode` | Row/card right edge | Admin-only re-assign (web) |
| `afterFields` | `ReactNode` | Below last form field, above submit bar | `useFormPersistence` draft banner (web) |
| `emptyState` | `ReactNode` | When table/list is empty | App-specific illustration |
| `headerSlot` | `ReactNode` | Above a content section | Platform banner |

**Relationships**:
- Slots are plain React props — optional, defaulting to `null`/`undefined`.
- Slot content can read host adapters (role, session) because it is rendered by the host, not by the shared module.

**Validation rules (by convention, enforced by TSDoc + code review)**:
- Slots are reserved for **UI injection**. Behavior injection uses typed callback props (e.g., the `onDraftChange` / `initialDraft` pair on `VisitPersonForm`).
- Cross-cutting concerns (i18n, data transport, role/tenant) MUST flow through React context adapters, not through slots.
- A new slot added to a shared component MUST be documented in TSDoc at the component and in [`contracts/slot-prop-conventions.md`](./contracts/slot-prop-conventions.md) at the package level.

---

## 5. `visitorsSlice` — feature-scoped client state

**Purpose**: Hold UI state that the shared `visitors` feature needs (sidebar open/close, currently selected row, active tab). Lives in `@ramcar/store`, not in `@ramcar/features`.

**Shape** (authoritative TS in `packages/store/src/slices/visitors-slice.ts`, created during implementation):

| Field | Type | Default | Semantics |
|---|---|---|---|
| `sidebarMode` | `"closed" \| "create" \| "edit" \| "view"` | `"closed"` | Which sidebar variant is open |
| `selectedVisitPersonId` | `string \| null` | `null` | Currently selected visit-person row |
| `activeTab` | `"details" \| "images" \| "events"` | `"details"` | Active tab inside the sidebar |

**Actions**:

| Action | Signature | Effect |
|---|---|---|
| `openCreateSidebar` | `() => void` | Sets `sidebarMode = "create"`, clears selection |
| `openEditSidebar` | `(id: string) => void` | Sets `sidebarMode = "edit"`, `selectedVisitPersonId = id` |
| `openViewSidebar` | `(id: string) => void` | Sets `sidebarMode = "view"`, `selectedVisitPersonId = id` |
| `closeSidebar` | `() => void` | Sets `sidebarMode = "closed"`, clears selection |
| `setActiveTab` | `(tab) => void` | Updates `activeTab` |

**Relationships**:
- Registered in `AppState` in `packages/store/src/index.tsx` alongside existing slices.
- Consumed by shared components via `useAppStore((s) => s.sidebarMode)` etc.
- No persistence (unlike `sidebarSlice.collapsed`); rehydrated each session.

**Validation rules**:
- All transitions are synchronous and atomic.
- No hydration from `localStorage` (ephemeral per session).
- Follow-on slices (`residentsSlice`, `providersSlice`) will mirror this shape when those features migrate.

**State transitions** (diagram):

```text
                 ┌──────────┐
                 │  closed  │ ──openCreateSidebar──▶ create
                 └──────────┘
                   ▲      ▲  ──openEditSidebar(id)──▶ edit
                   │      │
              closeSidebar ──openViewSidebar(id)──▶ view
                   │      │
                   └──────┘◀───── closeSidebar ────  (any non-closed state)
```

---

## 6. `shared-features.json` manifest

**Purpose**: Authoritative list of features that have been migrated to `@ramcar/features`. Drives the CI duplication check.

**Schema** (full JSON Schema in [`contracts/shared-features-manifest.schema.json`](./contracts/shared-features-manifest.schema.json)):

| Field | Type | Required | Semantics |
|---|---|---|---|
| `$schema` | `string` | yes | JSON Schema reference for editor tooling |
| `features` | `Feature[]` | yes | List of migrated features |
| `allowList` | `string[]` | no | Paths under `apps/*/src/features/<X>/` that are exempted from the check (e.g., page-only wiring that must stay in-app) |

**`Feature` object**:

| Field | Type | Required | Semantics |
|---|---|---|---|
| `name` | `string` | yes | Directory name under `apps/*/src/features/` that the check watches (e.g., `"visitors"`) |
| `migratedAt` | `string` (date, `YYYY-MM-DD`) | yes | Day the feature was moved to `@ramcar/features` |
| `package` | `string` | yes | Subpath import where the feature is now available (e.g., `"@ramcar/features/visitors"`) |
| `notes` | `string` | no | Free-form rationale |

**Example** (post-pilot state):

```json
{
  "$schema": "./specs/014-cross-app-code-sharing/contracts/shared-features-manifest.schema.json",
  "features": [
    {
      "name": "visitors",
      "migratedAt": "2026-04-17",
      "package": "@ramcar/features/visitors"
    }
  ],
  "allowList": []
}
```

**Validation rules** (enforced by `scripts/check-shared-features.ts`):

- For every entry `{ name: X }` in `features`, no files matching `apps/web/src/features/X/**/*.{ts,tsx}` or `apps/desktop/src/features/X/**/*.{ts,tsx}` may exist — EXCEPT for paths listed in `allowList`.
- An `index.ts` that contains ONLY `export * from "@ramcar/features/<name>"` is allowed. The script parses the file with the TypeScript compiler and rejects anything else.
- A matching file that appears after a feature is migrated causes a CI failure with:
  - The offending path
  - The migrated feature name
  - The target import (`@ramcar/features/<name>`)
  - A pointer to this spec

**State transitions**:

- Manifest is append-mostly: when a feature is migrated, a new entry is added. Removing an entry is an unusual (rollback) operation and requires a PR note.

---

## 7. Package dependency graph

**Purpose**: Lock in the unidirectional import boundaries.

```text
apps/web ──────┐
apps/desktop ──┼───▶ @ramcar/features ───▶ @ramcar/ui
               │                    │    ├▶ @ramcar/shared
               │                    │    ├▶ @ramcar/store
               │                    │    └▶ @ramcar/i18n
               └─(adapter impls)────┘
```

Rules (each is a test / lint / CI assertion):

- `@ramcar/features` MUST NOT depend on `@ramcar/web`, `@ramcar/desktop`, or `@ramcar/api`.
- `@ramcar/ui`, `@ramcar/shared`, `@ramcar/store`, `@ramcar/i18n` MUST NOT depend on `@ramcar/features`.
- Within `@ramcar/features/src/`, slices do not import from each other (`visitors/*` ↛ `residents/*`).
- Shared hooks MUST NOT import `fetch`, `XMLHttpRequest`, `@supabase/supabase-js` (except types), or anything from `window.electron`.

---

## Summary

This feature adds **zero runtime entities**. What it locks in instead is a small, well-typed **compile-time contract surface**:

1. Three adapter ports (`TransportPort`, `I18nPort`, `RolePort`) — the only way the shared module talks to its host.
2. A stable slot prop vocabulary — the only way the host injects UI into the shared module.
3. A new store slice (`visitorsSlice`) — following the existing `@ramcar/store` slice pattern.
4. A manifest schema + a CI-enforceable directory rule — the only way to know (and enforce) which features are shared.

Every one of these is typed in TS and checked at build time or in CI. There is no silent contract anywhere in the design.
