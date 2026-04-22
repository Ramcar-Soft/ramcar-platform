# Phase 1 — Data Model: Resident Select Combobox

**Feature**: `018-resident-select-combobox`  
**Date**: 2026-04-21

## Scope statement

This feature is a presentational refactor. **No database schema changes. No new tables, columns, indices, or migrations.** The picker reads existing profile data through the existing `/residents` endpoint and, for edit-mode name resolution, through a new `GET /residents/:id` route that reuses the existing `UsersRepository.getById()` query path.

## Entities

### Resident (read-only)

**Source of truth**: `profiles` table in PostgreSQL (Supabase), filtered to `role = 'resident'` by `ResidentsService.list`.

**Shape used by the picker**: `ExtendedUserProfile` from `@ramcar/shared`.

Fields the picker reads (it writes none):

| Field | Type | Use in picker |
|---|---|---|
| `id` | `string` (uuid) | Commit value of `onChange(id)`; cache key for the resolver query |
| `fullName` | `string` | Primary trigger label and primary list row label |
| `address` | `string \| null` | Secondary trigger label (`"{fullName} — {address}"` when present) and secondary list row label |
| `status` | `"active" \| "inactive"` | Filtered to `active` at the request layer (list query sends `status: "active"`) |
| `tenantId` | `string` | Enforced server-side; the picker never reads it from the response directly but relies on it for tenant scoping |

Fields explicitly NOT used by the picker: `email`, `username`, `phone`, `phoneType`, `userGroupIds`, `observations`, `role`, `createdAt`, `updatedAt`. They are searched server-side (`email`, `username`, `phone`) but are not rendered in the picker.

**Relationships**:
- `Resident` → `Tenant` (many-to-one). Enforced by `tenant_id` FK on `profiles`. The picker never crosses this relationship; every request is scoped to the caller's tenant.
- `Resident` → `User (auth)` (one-to-one via `user_id`). Not relevant to the picker.

**Validation rules** (all enforced at the API, not the client):
- Tenant scoping: every `/residents` and `/residents/:id` request is filtered by the caller's `tenant_id`. The picker MUST NOT accept `tenantId` as a prop; it uses `useRole().tenantId` for the React Query cache key only (not sent to the server — the server extracts tenant from the JWT).
- Status filter: the list query sends `status=active` by default; the resolver query does NOT filter by status, because a bound `value` may reference a deactivated resident and the picker must still render a name for it (Edge Case: "saved resident no longer in the active roster").
- `search` parameter is optional; when present, passed through unchanged. Server-side `or(...)` filter covers `full_name`, `email`, `username`, `phone`, `role`. `address` is NOT searched (spec clarification).

**State transitions**: N/A. The picker is read-only; resident lifecycle is owned by the users catalog feature.

## Picker-local state

The component owns a small amount of UI state. This is NOT persisted and NOT shared across components.

| Slot | Type | Owner | Purpose |
|---|---|---|---|
| `open` | `boolean` | `useState` | Popover open/closed |
| `search` | `string` | `useState` | Raw search input (tracked every keystroke) |
| `debouncedSearch` | `string` | `useState` + `useEffect` (300ms) | Input to the TanStack Query key |

Server state (list + resolver responses) is owned by TanStack Query, keyed by `["residents", tenantId, ...]`. Not duplicated into Zustand.

## React Query cache keys

Per the Constitution: all React Query keys MUST include `tenantId`.

| Query | Key shape | Fires when |
|---|---|---|
| List + search | `["residents", tenantId, "select", debouncedSearch]` | Popover is open (optionally also on mount for faster first open — implementation choice) |
| Resolver for saved value | `["residents", tenantId, "detail", value]` | `value` is bound AND the resident is not in the current list page |

## Non-entities (for clarity)

The picker does NOT introduce:
- Any new database entity.
- Any new DTO on the Zod side; `residentFiltersSchema` in `apps/api/src/modules/residents/dto/resident-filters.dto.ts` is reused verbatim for list calls, and the resolver's only input is a path param (`id`).
- Any join or aggregation.
- Any Supabase Realtime subscription. The picker is a request/response interaction, not a live list.
