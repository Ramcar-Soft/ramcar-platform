# Feature Specification: Resident Select Combobox

**Feature Branch**: `018-resident-select-combobox`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: User description: "refactor the component packages/features/src/shared/resident-select it should be similar to the packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx when cliked it should display the a list of residents and allow to search, this search should be accross all the residents not only the ones displayed in the list, evaluate if the list should be all the residents or just a few and then use a db query, most of the tenants(fraccionamientos) have around 100-200 residents, but there are edge cases where some tentants have up to 2500 residents, add any unit tests needed"

## Clarifications

### Session 2026-04-21

- Q: Which resident fields should the picker's search match against? → A: Match the existing API behavior — `full_name`, `email`, `username`, `phone` (no backend change; `address` is NOT a search field today and is out of scope for this feature).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick a resident from a searchable combobox (Priority: P1)

As a guard or admin filling out a visitor, vehicle, or provider form, I need to associate the entry with the resident that authorized it. I click a single trigger, the picker opens, I see a list of residents from my community, and I can keep typing to narrow down to the exact person — including residents that were not on the initial visible list.

**Why this priority**: This is the core interaction. Without it, every visitor/provider/vehicle form is harder and slower to complete. Today's component requires the user to type into a separate input box BEFORE the dropdown is even useful, and the dropdown only ever shows the residents that match — there is no "browse" experience for someone who only knows the resident's address or partial name.

**Independent Test**: Render the component inside any form (visitor create form is the primary case), click the trigger, confirm the popover opens with a list of residents and a search input, type two or three characters, and confirm the list narrows correctly and a selection commits the chosen resident's id back to the parent form.

**Acceptance Scenarios**:

1. **Given** the form is open and no resident is selected, **When** the user clicks the trigger, **Then** a popover opens showing a search input and an initial list of residents from the user's tenant.
2. **Given** the popover is open, **When** the user types into the search input, **Then** the list updates to show residents matched by the API across `full_name`, `email`, `username`, or `phone`, even if those residents were not in the initial list.
3. **Given** the popover is open with results, **When** the user clicks a resident, **Then** the popover closes, the trigger displays the selected resident's name (and address when available), and the parent form receives the resident's id via `onChange`.
4. **Given** a resident is already selected, **When** the form is re-opened (edit mode) with that resident's id as the initial value, **Then** the trigger displays that resident's name without requiring the user to open the popover.

---

### User Story 2 - Search the entire roster, not just the visible page (Priority: P1)

As a guard at a tenant with 2,500 residents, I need to find a specific resident by typing any portion of their name, phone number, email, or username, and the picker must search across the ENTIRE resident roster — not just the first page that was loaded.

**Why this priority**: At larger tenants (the 2,500-resident edge case the user called out) a fixed initial page would only show ~50 residents — roughly 2% of the roster. If search were client-side only, 98% of residents would be unreachable through the picker. This breaks the feature for the largest customers and is non-negotiable.

**Independent Test**: Configure the test transport to return paged results that depend on the `search` query parameter (i.e., return resident "Zacarías Ortega" only when the request includes `search=zaca`). Type "zaca" into the picker. Confirm the request was sent to the API with the search term, and confirm "Zacarías Ortega" appears in the results even though they were not in the initial unfiltered page.

**Acceptance Scenarios**:

1. **Given** the popover is open and the user has not typed anything, **When** the picker requests the initial list, **Then** the request is made with no search term and a bounded page size suitable for browsing.
2. **Given** the user types into the search input, **When** the input value stops changing for a short debounce window, **Then** a single new request is made to the residents API including the search term, and the list updates with the results from that request.
3. **Given** the search returns zero matches, **When** the response is rendered, **Then** the picker shows a clear "no results" empty state and does NOT offer a "create new resident" affordance (residents are not created from this picker).
4. **Given** the user clears the search input back to empty, **When** the next request fires, **Then** the picker returns to showing the initial unfiltered list.

---

### User Story 3 - Drop-in replacement for the existing component (Priority: P1)

As a developer maintaining the visitor, vehicle, and provider forms that already consume `ResidentSelect`, I need the refactor to land without me having to change every call site. The new component must keep the existing public prop contract working so that `<ResidentSelect value={residentId} onChange={setResidentId} />` continues to compile and behave correctly.

**Why this priority**: The component is consumed from at least four places today (`visit-person-form`, `visit-person-edit-form`, `provider-form`, `provider-edit-form`). A breaking prop change would force a coordinated rewrite of those forms in the same change, which inflates risk. Keeping the contract stable lets the picker improve in isolation.

**Independent Test**: Build the monorepo with `pnpm typecheck` after the refactor and confirm no call site requires a code change. Render each existing call site in its host story/test and confirm the picker still selects a resident and emits the same `onChange(residentId)` signal it did before.

**Acceptance Scenarios**:

1. **Given** the existing `ResidentSelect` consumers, **When** the refactor is merged, **Then** no consumer needs to update its imports, prop names, or `onChange` handler signature.
2. **Given** an edit form passes a previously-saved `residentId` as `value`, **When** the picker mounts, **Then** the trigger renders the saved resident's name (the picker fetches the single resident if it was not in the initial list).

---

### User Story 4 - Loading and error feedback (Priority: P2)

As a user of the picker, when the residents request is in flight or fails, I want to see clear feedback rather than a confusingly empty list.

**Why this priority**: The visible behavior on a slow or failing request changes from "empty list" (today, ambiguous) to "loading…" or "couldn't load residents, try again" (clear). This is a UX polish, not a correctness blocker, so P2.

**Independent Test**: Render with a transport that delays its response by 1 second. Confirm a loading indicator appears in the popover. Then render with a transport that rejects, and confirm an error state appears with retry guidance.

**Acceptance Scenarios**:

1. **Given** the popover is open and the residents request is pending, **When** the list area would otherwise be empty, **Then** a loading indicator is shown in the list area.
2. **Given** the residents request fails, **When** the error is rendered, **Then** the popover shows a localized error message (no raw error stack), and the search input remains usable for retrying via a new query.

---

### Edge Cases

- **Tenant has zero residents**: Picker opens, shows the "no results" empty state immediately, does not crash.
- **Tenant has ~2,500 residents**: Initial open shows the first bounded page (≤ 100); search-as-you-type narrows via the API. The full list is NEVER fetched in one request.
- **Saved resident is no longer in the active roster** (e.g., deactivated after the visitor record was created): The trigger should still display the resident's name when the picker can resolve the id; if it cannot, fall back to a neutral placeholder rather than silently rendering blank, and never block form submission with the previously-saved id.
- **Search text contains accents/diacritics** (e.g., "Núñez", "Ramírez"): Matching must be diacritic-insensitive on the server so that typing "nunez" still matches "Núñez". This is a server-side requirement on the existing residents list endpoint, not a client-side concern.
- **Search text is a phone number with formatting** (e.g., the user types "555-1234" but phone is stored as "5551234"): Matching is via the existing `phone.ilike.%search%` filter; users may need to type without separators if the stored value has no separators. Normalizing phone search is out of scope for this feature.
- **Search text is an email fragment** (e.g., "@gmail"): Matches via the existing `email.ilike.%search%` filter. Useful for admins; not the primary guard-booth use case.
- **Rapid typing**: Successive keystrokes within the debounce window collapse into a single API request, not one request per keystroke.
- **Popover dismissed mid-flight**: An in-flight request whose results are no longer relevant when the popover closes must not throw or update stale state.
- **Form is in a Sheet that traps focus**: The popover and its search input must coexist with the parent Sheet's focus trap (the existing vehicle-brand picker already does this; the resident picker must match).
- **Same resident selected twice in quick succession**: Selecting a resident already equal to `value` should still close the popover cleanly without spurious form-state changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The picker MUST present as a single trigger button (not a separate input + dropdown) that, when clicked, opens a popover containing a search input and a list of residents — matching the interaction shape of the existing brand picker.
- **FR-002**: The trigger MUST display the currently-selected resident's name (and address when available) when a value is bound, and a localized placeholder when no value is bound.
- **FR-003**: When the popover opens with no search text, the picker MUST show an initial list of residents scoped to the current tenant.
- **FR-004**: As the user types into the search input, the picker MUST issue a debounced request to the residents API including the search term, and update the visible list with the response. Search MUST cover the entire tenant roster, not only the initially-loaded page. The server-side fields matched are `full_name`, `email`, `username`, and `phone` (the existing `/residents` filter — no backend change in this feature). `address` is NOT searched server-side and the picker MUST NOT advertise address search in placeholders or help text.
- **FR-005**: The picker MUST NEVER load the full resident roster in a single request. Each request MUST be bounded by a page size suitable for the picker (constrained by the existing API ceiling of 100 per page).
- **FR-006**: Selecting a resident MUST close the popover, update the trigger label, clear the search, and emit the resident's id through the existing `onChange(value: string)` callback.
- **FR-007**: The picker MUST preserve the existing public prop contract (`value: string`, `onChange: (value: string) => void`, optional `placeholder`) so that current consumers (`visit-person-form`, `visit-person-edit-form`, `provider-form`, `provider-edit-form`) require no changes to keep working. Additional optional props (e.g., `disabled`, `ariaLabel`, `id`) MAY be added.
- **FR-008**: When a `value` is provided that is not present in the most recently fetched list, the picker MUST resolve and display that resident's name (so edit forms render the saved selection on first paint without forcing the user to open the popover).
- **FR-009**: The picker MUST be locale-aware: trigger placeholder, search placeholder, empty state, loading state, and error state strings MUST come through the `useI18n()` adapter and live in the shared `@ramcar/i18n` catalog so the same component works in both web (`next-intl`) and desktop (`react-i18next`) hosts.
- **FR-010**: The picker MUST scope its data fetch to the caller's tenant. The component MUST NOT accept `tenantId` as a prop; tenant context comes from the existing `useRole()` adapter, exactly as the current implementation does.
- **FR-011**: The picker MUST be implemented in the shared `@ramcar/features` package only — no per-app duplicate (`apps/web/src/features/.../resident-select.tsx`, `apps/desktop/src/features/.../resident-select.tsx`) is permitted, per the cross-app code-sharing policy.
- **FR-012**: The picker MUST NOT include a "create new resident" action; residents are managed through their own catalog flows.
- **FR-013**: The picker MUST show an empty state when search returns zero matches and a localized error state when the request fails. Loading state MUST be visually distinct from the empty state.
- **FR-014**: A previously-issued in-flight request whose results are no longer needed (popover closed, query changed) MUST NOT update component state.
- **FR-015**: Unit tests MUST cover, at minimum: (a) trigger displays placeholder when value is null, (b) trigger displays the selected resident's name when value is bound, (c) clicking the trigger opens the popover with a search input and list, (d) typing into the search input issues a debounced request including the typed search term, (e) selecting a result calls `onChange` with the resident id and closes the popover, (f) empty state renders when results are zero, (g) the public prop contract from User Story 3 is upheld (regression guard).

### Key Entities

- **Resident** (existing — `ExtendedUserProfile`): A person registered to a tenant with at minimum an `id`, a `fullName`, an optional `address`, and an `active` status. The picker reads but does not write residents.
- **Tenant**: The community (`fraccionamiento`) the current user belongs to. The picker scopes ALL its requests to this tenant via the existing role/tenant adapter — the user never sees or selects from another tenant's residents.

### Data Access Architecture *(mandatory for features involving data)*

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|-------------|-------------|-------------|--------------|
| List residents (initial + search-as-you-type) | `/residents` | GET | `residentFiltersSchema` (`search`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`) | `PaginatedResponse<ExtendedUserProfile>` |
| Resolve a single saved resident by id (US3 / FR-008, only when the bound `value` is not in the current list) | `/residents` | GET (search by id is not supported today — see Open Questions Q1) | (see Q1) | `PaginatedResponse<ExtendedUserProfile>` or single `ExtendedUserProfile` |

**Frontend data flow**: TanStack Query → NestJS API (`/residents`) → `ResidentsService` → `ResidentsRepository` → Supabase/Postgres  
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only. The picker MUST go through the API; no direct Supabase queries from the renderer.

**Reuses existing endpoints**: This feature does not require new endpoints for User Stories 1, 2, and 3 in the common case. The existing `GET /residents` already supports `search`, paging, and tenant scoping. Resolving a single saved resident by id (FR-008) may need either a dedicated `GET /residents/:id` (small new endpoint) or an `ids` filter on the list endpoint — see Open Questions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user at a 2,500-resident tenant can find any resident in the roster by typing 1–4 characters of name, phone, email, or username — including residents that were never in the initial list — without scrolling more than one popover height. Verified by integration test against a seeded tenant.
- **SC-002**: The picker issues at most one residents request per debounce window during continuous typing (i.e., typing "garcia" in under one second produces at most one search request, not six).
- **SC-003**: All existing consumers (`visit-person-form`, `visit-person-edit-form`, `provider-form`, `provider-edit-form`) compile and pass their existing tests after the refactor, with NO call-site code changes required.
- **SC-004**: For the common tenant size (100–200 residents), the initial popover open completes in under 500ms on a typical broadband connection, including the initial residents request.
- **SC-005**: For the edge-case 2,500-resident tenant, the picker NEVER issues a request whose page size exceeds the API maximum (100), and the user can still select any resident via search.
- **SC-006**: Unit-test coverage for the new component is at least at parity with `vehicle-brand-select.test.tsx` (trigger rendering, open-on-click, search behavior, commit-on-select, empty-state, prop-contract guard).

## Assumptions

- The existing `GET /residents` endpoint's `search` parameter performs a server-side `ilike` match across `full_name`, `email`, `username`, `phone`, and `role` (verified in `apps/api/src/modules/users/users.repository.ts`). The picker exposes this behavior unchanged. Diacritic-insensitive matching is desirable but not currently guaranteed by the backend; improving it is out of scope.
- `address` is intentionally NOT a search field. Adding it would require modifying the `or(...)` filter in the users repository and is tracked as a separate change.
- The picker filters to `status=active` by default (matching today's behavior). Showing inactive residents is not a goal.
- Debounce window: 250–300ms (matching the current implementation's 300ms) is acceptable; not a tunable prop in v1.
- Page size for the picker: 50 (matches today's component) or up to the API max of 100 — implementation choice. The point is that it is bounded and never "fetch all".
- Visual styling and the `Popover + Command` primitives from `@ramcar/ui` (used by the brand picker) are appropriate for the resident picker; no new primitives are needed.
- The picker is read-only in scope: no add/edit/deactivate of residents from the picker UI.

## Open Questions

Only items where no reasonable default exists are listed. The spec proceeds with the defaults below; flip during `/speckit.clarify` or `/speckit.plan` if needed.

- **Q1 — How should the picker resolve a saved `value` that isn't in the initial list (FR-008)?**
  - **Option A (default)**: Add a tiny `GET /residents/:id` endpoint that returns one resident scoped to the caller's tenant. The picker fetches this once per mount when `value` is bound and the resident isn't in the current page. Minimal API surface, mirrors how the visitors module already structures lookups.
  - **Option B**: Add an `ids` query filter to `GET /residents` so the picker can include the saved id in the same request shape. Slightly more flexible for batching.
  - **Option C**: Defer FR-008. Accept that on first paint of an edit form, the trigger may briefly show "Select a resident…" (or the bare id) until the user opens the popover and the list contains the saved id. Cheapest, but visibly worse for edit forms.
  - **Default**: A. The endpoint is small, the picker code stays simple, and edit forms paint correctly on first render.
