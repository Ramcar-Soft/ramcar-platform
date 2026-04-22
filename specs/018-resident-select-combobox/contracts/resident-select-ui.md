# UI Contract — `ResidentSelect` component

**Feature**: `018-resident-select-combobox`  
**Package**: `@ramcar/features` → `packages/features/src/shared/resident-select/`  
**Consumed by**: `visitors/visit-person-form`, `visitors/visit-person-edit-form` (shared package), `apps/web/providers/provider-form`, `apps/web/providers/provider-edit-form`.

## Public prop contract (stable — regression-guarded)

```ts
export interface ResidentSelectProps {
  value: string;                               // resident id; empty string when none selected
  onChange: (value: string) => void;           // called with the selected resident's id
  placeholder?: string;                        // trigger placeholder override; defaults to residents.select.placeholder
  disabled?: boolean;                          // NEW (optional) — disables the trigger
  ariaLabel?: string;                          // NEW (optional) — override combobox aria-label
  id?: string;                                 // NEW (optional) — form id for label association
}
```

**Compatibility guarantees (FR-007, SC-003, User Story 3):**
- `<ResidentSelect value={residentId} onChange={setResidentId} />` continues to compile and behave correctly — no consumer edits.
- `<ResidentSelect value={residentId} onChange={setResidentId} placeholder="…" />` continues to compile and behave correctly.
- `value` remains `string` (not `string | null`), matching every current call site.

New optional props (`disabled`, `ariaLabel`, `id`) are additive — adding them does not force any existing call site to change. The unit test suite includes a regression guard that exercises both existing call shapes.

## Rendered shape

1. **Trigger** — `Button` with `role="combobox"`, `aria-expanded`, `aria-label`, full-width, left-aligned label text with a `ChevronDown` on the right. Displays:
   - The selected resident's `fullName` (and `— address` appended when `address` is non-null), when a resident is resolvable from either the current list page or the resolver query.
   - `placeholder` (prop) or `t("residents.select.placeholder")` otherwise. Placeholder text uses `text-muted-foreground`.
2. **Popover** — `PopoverContent` pinned to the trigger width (`w-[--radix-popover-trigger-width] p-0`), containing a `Command`:
   - `CommandInput` — search input, placeholder `t("residents.select.searchPlaceholder")`, bound to local `search` state; typing triggers a 300ms debounce → single API call.
   - `CommandList`:
     - `CommandEmpty` — `t("residents.select.empty")` when the server returned zero matches (non-loading).
     - Loading state — a non-selectable loading row/caption using `t("residents.select.loading")` when the list query is pending and no cached data is available.
     - Error state — a non-selectable error caption using `t("residents.select.error")` when the list query errored; the search input remains usable so the user can retry by typing.
     - One `CommandItem` per resident in the current query page. Item label: `fullName` on line 1, `address` (when present) on line 2 using `text-muted-foreground text-xs`. Item value: the resident's `id`.

## Interaction rules

- **Open**: click the trigger OR focus + press Space/Enter (Popover default). When opening, the list query is already fetched (or is fetched on first open — implementation detail).
- **Typing**: updates local `search` on every keystroke; the debounced value (`debouncedSearch`) is the React Query key component, so exactly one request fires per 300ms pause (SC-002).
- **Empty query → back to initial list**: clearing the input to an empty string resets `debouncedSearch` to `""`, which drops the `search` query param on the next request; the list returns to the unfiltered initial view.
- **Select**: click (or Enter on keyboard-focused item) commits the resident:
  1. `onChange(resident.id)` is called.
  2. The popover closes.
  3. `search` is cleared to `""`.
  4. Focus management follows `Popover`'s defaults — focus returns to the trigger.
- **Disabled**: the trigger receives the `disabled` attribute; the popover cannot be opened.
- **Command filter**: the built-in `cmdk` filter is bypassed (`filter={() => 1}`) because the server is authoritative for match semantics. Consumers do not see a "matches X locally but not on the server" split.

## Data-flow contract

- All data-fetch goes through `useTransport().get(...)` from `@ramcar/features/adapters`. The component MUST NOT call `fetch` directly, MUST NOT import `next/*`, MUST NOT import `window.electron`, MUST NOT set `"use client";` (that directive is applied by the host app when needed).
- Tenant scoping: `useRole().tenantId` participates in every React Query key. The tenant value is NEVER sent as a request param (`TenantGuard` extracts it from the JWT).
- i18n: every user-facing string goes through `useI18n().t(...)`. Message catalog lives in `@ramcar/i18n`, key group `residents.select.*` (see research R7).
- List query: `["residents", tenantId, "select", debouncedSearch]` → `GET /residents?search=...&pageSize=50&status=active&sortBy=full_name&sortOrder=asc`.
- Resolver query: `["residents", tenantId, "detail", value]` with `enabled: Boolean(value && !currentPageContains(value))` → `GET /residents/:id`.

## Accessibility

- Trigger uses `role="combobox"`, `aria-expanded={open}`, `aria-label` (prop override, fallback to `t("residents.select.ariaLabel")`).
- Search input uses `CommandInput` which is a proper `<input role="combobox">` from `cmdk`, with `aria-activedescendant` wiring to the currently-highlighted list item.
- `CommandList` items are reachable via Up/Down arrow keys; Enter commits the highlighted item.
- The popover is closable via Escape (Popover default) without committing.
- The entire interaction works while the parent Sheet (catalog sidebar) retains focus trap — matches the behavior already shipped by `VehicleBrandSelect` inside the same Sheets.

## Testing surface (how consumers/tests inject behavior)

The component is tested via `renderWithHarness` from `packages/features/src/test/harness.tsx`, overriding `transport.get` with a `vi.fn()` whose response depends on the URL:

```ts
const transport = {
  get: vi.fn(async (url: string, opts: any) => {
    if (url === "/residents") return { data: residentsMatchingSearch(opts?.params?.search), meta: ... };
    if (url.startsWith("/residents/")) return residentById(url.slice("/residents/".length));
    throw new Error("unexpected url");
  }),
};
renderWithHarness(<ResidentSelect value="" onChange={...} />, { transport });
```

This contract is the machine-checkable counterpart to User Story 3's regression guard.

## Non-goals (will be rejected at review)

- A "create new resident" row in the popover — prohibited by FR-012.
- Accepting `tenantId` as a prop — prohibited by FR-010.
- Client-side fuzzy match on already-fetched residents — violates US2 at 2,500-resident tenants.
- A `pageSize` or `debounceMs` prop — keeps the public contract minimal; implementation constants suffice.
- Any per-app duplicate of the component under `apps/web/src/features/*/resident-select.tsx` or `apps/desktop/src/features/*/resident-select.tsx` — prohibited by FR-011 and the cross-app code-sharing policy.
