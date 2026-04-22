# Quickstart — Resident Select Combobox

**Feature**: `018-resident-select-combobox`

This quickstart verifies the refactored picker end-to-end: the shared package builds, the unit suite passes, the web portal consumes the component without call-site edits, and the desktop guard-booth app does the same. It also includes two manual checks that directly exercise US2 (server-side search) and FR-008 (edit-mode name resolution).

## Prerequisites

- Node.js 22 LTS (see `.nvmrc`).
- `pnpm` installed.
- Local Supabase running with seed data (`pnpm db:start && pnpm db:reset`).
- You are on branch `018-resident-select-combobox`.

## 1. Install and build the monorepo

```bash
pnpm install
pnpm --filter @ramcar/features build
pnpm typecheck
```

**Expected**: clean build, zero TypeScript errors. If any `apps/web` or `packages/features` consumer breaks because of a prop change, the refactor has violated the Principle-3 contract — stop and fix before continuing.

## 2. Run the shared-package unit tests

```bash
pnpm --filter @ramcar/features test
```

**Expected**: new `resident-select.test.tsx` suite passes. It must cover:

1. trigger placeholder when `value === ""`,
2. trigger displays the resident name when `value` is bound and the resident is in the current list page,
3. trigger displays the resolved name when `value` is bound but the resident is NOT in the current list page (resolver `GET /residents/:id` round trip),
4. clicking the trigger opens the popover (search input + list visible),
5. typing issues exactly one debounced API call with the typed `search` term, and a resident absent from the initial list appears in the result,
6. selecting a result calls `onChange(id)` and closes the popover,
7. empty state renders when results are zero; no "create new" row is present,
8. existing call shapes `<ResidentSelect value={id} onChange={fn} />` and `<ResidentSelect value={id} onChange={fn} placeholder="…" />` still type-check and behave identically.

## 3. Start the stack

```bash
pnpm dev
```

This launches `apps/api`, `apps/web`, `apps/desktop`, and `apps/www` via Turborepo.

## 4. Manual check A — Web, small tenant (100–200 residents)

1. Log in to `apps/web` as an admin whose tenant has 100–200 seeded residents.
2. Navigate to the Visitors page and click **Create**.
3. In the Sheet, click the **Resident** picker trigger.
4. **Expected**: popover opens, initial list shows the first 50 residents sorted by full name, search input is focused and shows `residents.select.searchPlaceholder`.
5. Type `gar` (or a prefix likely to match a few seeded residents).
6. **Expected**: after a ~300ms pause the list refreshes to only the matching residents. In the DevTools Network tab, observe exactly **one** `GET /residents?search=gar&pageSize=50&status=active&...` request (not one per keystroke — SC-002).
7. Click a resident.
8. **Expected**: popover closes, trigger now shows the resident's name (and `— address` if their address is set).

Submit the form to confirm the form receives the resident id through `onChange` and round-trips through the NestJS API as before.

## 5. Manual check B — Web, edit mode (FR-008)

1. Edit an existing visitor record whose resident is NOT among the first 50 alphabetical residents in the current tenant (if none exists, seed or create one whose last name starts with `Z`).
2. Open the edit sidebar.
3. **Expected**: on first paint, the `ResidentSelect` trigger already displays that resident's name — without you opening the popover. In the Network tab, observe a single `GET /residents/{id}` request firing alongside the usual list load.
4. Close and re-open the sidebar.
5. **Expected**: trigger still shows the name without a new resolver call (TanStack Query cache hit on `["residents", tenantId, "detail", id]`).

## 6. Manual check C — Web, large tenant (2,500 residents edge case)

1. Switch to the seeded `large-tenant` fixture (or any tenant with >1,000 residents).
2. Open the Visitors **Create** sidebar → click the resident picker.
3. **Expected**: initial list shows exactly 50 residents. The roster is NOT fully loaded — confirm via Network that the single initial request had `pageSize=50`.
4. Type the first 2–3 characters of the full name of a resident who is NOT in the initial 50.
5. **Expected**: after debounce, one `GET /residents?search=…` request fires and the list updates to include that resident. Selecting them commits successfully.

This is the direct live verification of User Story 2.

## 7. Manual check D — Desktop (guard booth)

1. Start or focus the running `apps/desktop` window.
2. Log in as a guard with the same tenant used in check A.
3. Open the Visitors form in the booth UI.
4. Repeat steps 3–8 of check A.
5. **Expected**: identical behavior to the web portal. The picker consumes the same `@ramcar/features` export; the only adapter differences (i18n wired to `react-i18next`, transport wired to HTTP) are invisible to the user.

## 8. Shared-features guard

```bash
pnpm check:shared-features
```

**Expected**: passes. No per-app duplicate of `resident-select` under `apps/web/src/features/` or `apps/desktop/src/features/` (FR-011).

## Common failure modes to watch for during review

- Network shows **one request per keystroke** → debounce is broken (`debouncedSearch` not wired to the query key or timer cleanup missing).
- Edit-mode trigger shows a placeholder or bare uuid for ~500ms → resolver query `enabled` gate is over-constrained or the resolver's query key is not aligned with the list query key.
- Popover shows a "Create new resident" row → FR-012 violation; remove.
- `pnpm typecheck` fails in `apps/web/src/features/providers/components/provider-form.tsx` → the public prop contract was broken; the refactor must preserve the `{ value, onChange, placeholder? }` shape verbatim.
- `apps/desktop` imports break → the shared module regressed the no-`next/*`, no-`window.electron`, no-`"use client";` rule.
- Search placeholder reads "Search by name, email, or address…" or similar → FR-004 says address is NOT searched; the placeholder must not advertise it.
