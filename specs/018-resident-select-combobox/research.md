# Phase 0 — Research: Resident Select Combobox

**Feature**: `018-resident-select-combobox`  
**Date**: 2026-04-21

## Unknowns extracted from Technical Context

The spec's Technical Context is fully-typed by the existing repo (TypeScript strict, Next 16, Electron 30, `@ramcar/features`, TanStack Query v5, shadcn Popover + Command, `@ramcar/i18n`, `@ramcar/shared` Zod schemas). The only true unknown is the single Open Question carried over from the spec:

- **Q1** — How should the picker resolve a saved `value` that isn't in the initial list (FR-008)?

Everything else (debounce, page size, styling primitives, search fields, state scope) already has defaults in the spec. They are confirmed below so downstream phases can reference a single source.

---

## Decision R1 — Resolver endpoint for a saved `value` not in the current list (Q1)

**Decision**: Add a small `GET /residents/:id` endpoint (spec Q1 Option A). The picker fetches it once per mount when `value` is bound AND the resident is not present in the current list page. The endpoint reuses `UsersService.getById()` which already enforces tenant isolation + role access, and filters the response shape to `ExtendedUserProfile`.

**Rationale**:
- Minimal API surface. No changes to the `/residents` list endpoint or its Zod filter schema (`residentFiltersSchema`).
- Keeps the picker's client code simple: two React Query hooks with clear, independent cache keys (`["residents", tenantId, "select", debouncedSearch]` for list, `["residents", tenantId, "detail", residentId]` for resolver). No conditional request-shape branching on whether a saved id is present.
- Mirrors existing API conventions already used by `users` (`GET /users/:id`) and `visit-persons` (`GET /visit-persons/:id`). Reviewers and future maintainers will recognise the shape immediately.
- Defense-in-depth: `UsersService.getById()` already verifies `tenant_id` and role, so the new endpoint inherits tenant isolation (Constitution Principle I) and RBAC (Principle VI) without any new guard logic.
- The resolver fires only when needed (bound `value` not in current page), so it costs at most one extra request per edit-mode mount.

**Alternatives considered**:
- **Option B — `ids` filter on `GET /residents`**: Slightly more flexible for future batch use (e.g., rendering a list of previously-picked residents), but adds surface to the filter Zod schema and the repository query. No current call-site needs batching.
- **Option C — Defer FR-008**: Cheapest, but directly conflicts with FR-008 and Acceptance Scenario US3-2 ("trigger renders the saved resident's name on first paint"). The edit-mode UX regression (flash of placeholder text or bare id until the user opens the popover) is visible on every edit form.

---

## Decision R2 — Component pattern: Popover + Command (server-backed)

**Decision**: Build the picker with `Popover` + `Command` + `CommandInput` + `CommandList` + `CommandEmpty` + `CommandItem` from `@ramcar/ui`, matching the interaction shape of `vehicle-brand-select.tsx`. Data comes from the NestJS API via the injected `useTransport()` adapter (not a client-side dataset like brands). The `Command`'s built-in filter is bypassed (`filter={() => 1}`) because the authoritative match happens server-side.

**Rationale**:
- The user explicitly requested "similar to vehicle-brand-select" interaction (single trigger, popover with search, highlight + keyboard navigation via `cmdk`).
- Popover + Command is already validated in this repo (focus behavior inside a Sheet, keyboard navigation, accessibility attributes). Reusing it avoids reinventing dismiss/focus rules.
- Bypassing the client filter is deliberate: the server does the matching (FR-004, US2). If we leave the default client filter on, it will additionally filter the already-filtered server response, which would drop residents the server deliberately included.

**Alternatives considered**:
- Custom Popover + Input + List (no `cmdk`): reinvents keyboard nav and active-item highlighting. Rejected — no benefit over reusing the primitive.
- `Select` + external Input (today's implementation): this is the shape the refactor is explicitly replacing. Fails FR-001 (single trigger) and makes the initial browse experience worse.

---

## Decision R3 — Page size and debounce window

**Decision**:
- Page size: **50** per request (retains today's behavior). The existing `/residents` filter caps at 100; 50 is comfortably under the cap and large enough to give a useful initial browse at 100–200-resident tenants.
- Debounce: **300ms** (retains today's 300ms `useEffect` timer).

**Rationale**:
- FR-005 requires bounded page size, never "fetch all". The existing API ceiling (100) is a hard cap; 50 is the current operating value and there is no signal it needs to change.
- SC-002 requires at most one request per debounce window of continuous typing. 300ms is the existing value, is well within the 250–300ms range called out in the spec Assumptions, and produces no observable UX change from today.
- Both values stay internal constants. Not exposed as props — keeps the public prop contract stable (FR-007, SC-003).

**Alternatives considered**:
- Page size 100: saves one request at 2,500-resident tenants when users scroll past 50. The picker's UX is search-first, not scroll-first; users at 2,500-resident tenants are expected to type, not paginate. Deferred.
- Debounce 200ms: marginally snappier, but increases request count for fast typists. Not worth the change without evidence.

---

## Decision R4 — Search fields (clarified in spec)

**Decision**: The picker's search term is forwarded verbatim to `/residents?search=...`. The server matches against `full_name`, `email`, `username`, `phone`, and `role` (the existing `or(...)` filter in `users.repository.ts`). `address` is NOT searched and the picker MUST NOT advertise address search in any localized string.

**Rationale**:
- Fixed by the spec's Session 2026-04-21 clarification.
- Adding `address` to the server filter is deliberately out of scope; doing it here would mix a client refactor with a semantic change to the users repository search, inflating review and risk.

**Alternatives considered**:
- Client-side fuzzy match on `address` across the currently-loaded page: rejected. Would violate US2 at 2,500-resident tenants (page only covers 2% of roster) and produce confusing "search found X in-page but not in the full roster" behavior.

---

## Decision R5 — Resolver fetch: gated TanStack Query

**Decision**: The resolver is a second `useQuery` with `enabled: Boolean(value && !currentListContainsValue)`. Cache key: `["residents", tenantId, "detail", value]`. The trigger's display name is computed from the first of (a) the resident object in the current list page matching `id === value`, (b) the resolver query's data, (c) the localized placeholder. This gives edit-mode forms a name on first paint without blocking the UX when the resolver has not yet completed.

**Rationale**:
- Fires at most once per bound `value`, cached by id, so re-opens of the Sheet don't re-fetch.
- Natural fit for TanStack Query's `enabled` gate + cache key composition. No manual state machine.
- Cleanly supports the Edge Case "saved resident no longer in the active roster": if the resolver 404s, we fall through to the localized placeholder without breaking submission (FR-008 Edge Case wording).

**Alternatives considered**:
- Merge the resolver into the list query via `ids=[value]`: would require Option B from R1 (rejected).
- One-shot `fetch` inside `useEffect`: bypasses TanStack Query's cache, loses retry/stale-time behavior, and violates the Constitution's server-state-goes-through-TanStack-Query convention.

---

## Decision R6 — Testing strategy

**Decision**: Use `renderWithHarness` from `packages/features/src/test/harness.tsx` (already wraps `StoreProvider`, `QueryClientProvider`, `TransportProvider`, `I18nProvider`, `RoleProvider`). Mock `TransportPort.get` to return `PaginatedResponse<ExtendedUserProfile>` for `/residents` list calls and `ExtendedUserProfile` for `/residents/:id`. Tests live at `packages/features/src/shared/resident-select/resident-select.test.tsx`.

Test matrix (covers FR-015 plus the US2 server-roundtrip evidence):

1. Trigger renders placeholder when `value` is `null`/empty.
2. Trigger renders the selected resident's name when `value` is bound and the resident is in the current page (no resolver round trip).
3. Trigger renders the resolved name when `value` is bound and the resident is NOT in the current page (resolver round trip — also covers FR-008).
4. Clicking the trigger opens the popover with a search input and the initial (unfiltered) list.
5. Typing in the search input issues a single debounced request that includes the typed `search` term, and the list re-renders with results that include a resident not present in the initial list (direct US2 evidence).
6. Selecting a result calls `onChange` with the resident id and closes the popover.
7. Empty state renders when results are zero; no "create new" affordance is shown (FR-012).
8. Public prop contract regression guard: `<ResidentSelect value="..." onChange={fn} />` and `<ResidentSelect value="..." onChange={fn} placeholder="..." />` both compile and behave identically to their old counterparts.

**Rationale**:
- Harness-based unit tests are the existing convention for this package (see `vehicle-brand-select.test.tsx`, `visit-person-status-select.test.tsx`).
- Gating the resolver and the debounced list on injected transport calls produces deterministic assertions about request shape (search term, page size, status filter) without spinning up a real API.

**Alternatives considered**:
- MSW (Mock Service Worker) for HTTP fixtures: would be appropriate if we were testing real fetch + `apiClient` wiring, but the package tests against the `TransportPort` abstraction, not raw HTTP. MSW adds setup without adding signal.
- E2E (Playwright) against the visitor form: reserved for integration verification in `apps/web`; not in scope for this refactor's unit suite.

---

## Decision R7 — i18n keys

**Decision**: Add a `residents.select.*` group to `@ramcar/i18n` (en + es + any other currently-supported locale):

- `residents.select.placeholder` — trigger placeholder when no value is bound
- `residents.select.searchPlaceholder` — search input placeholder (MUST NOT mention address)
- `residents.select.empty` — "no results" empty state in the popover
- `residents.select.loading` — loading indicator caption (US4)
- `residents.select.error` — generic load-failure caption (US4)
- `residents.select.ariaLabel` — combobox accessible label

The existing `visitPersons.form.selectResident` key is retained but is no longer the picker's source. Consumers of `ResidentSelect` can continue to pass an explicit `placeholder` prop to override.

**Rationale**:
- Keeps string ownership with the picker (the component is shared; consumers differ). Co-locating keys under `residents.select.*` scopes them clearly.
- Matches the existing pattern already used by `vehicles.brand.*`, `users.sidebar.*`, `vehicles.color.options.*`.
- FR-009 requires the picker to be locale-aware via the `useI18n()` adapter — this is the concrete shape of that requirement.

---

## Resolved unknowns summary

| Unknown | Decision | Reference |
|---|---|---|
| Q1 saved-id resolver | New `GET /residents/:id` (Option A) | R1 |
| Component primitive | Popover + Command, server-backed, default filter bypassed | R2 |
| Page size | 50 | R3 |
| Debounce window | 300ms | R3 |
| Search fields | `full_name`, `email`, `username`, `phone` (server) — `address` out of scope | R4 |
| Saved-value display path | Gated second `useQuery`, cache key `["residents", tenantId, "detail", id]` | R5 |
| Test harness | `renderWithHarness` + mocked transport | R6 |
| i18n keys | New `residents.select.*` group under `@ramcar/i18n` | R7 |

No residual `NEEDS CLARIFICATION` items.
