# Keyboard Shortcuts: F/N + Shared Help Hint

**Date:** 2026-04-23
**Status:** Draft — pending user review
**Scope:** Cross-app (`apps/web`, `apps/desktop`, `packages/features`, `packages/i18n`)

## Goal

Extend the existing list-view keyboard shortcuts (`B`, `ArrowUp/Down`, `Enter`, `Escape`) with two additions and expose an inline help strip so users can discover them:

- **`F`** — alias for `B`, focuses the search input.
- **`N`** — triggers the create flow on views that have one.
- **`<ShortcutsHint />`** — shared, per-view help component that lists only the shortcuts active in the host view.

## Non-goals

- No `?`-to-open-dialog shortcut and no global/app-level help panel.
- No new behavior for logbook rows — rows remain unclickable, `Enter` still does nothing in logbook, arrows not wired in logbook.
- No redesign of row highlighting, pagination shortcuts, or any view that does not already use `useKeyboardNavigation` (except the logbook search input, which is wired in as part of this work).
- No changes to desktop `dashboard`, `account`, `patrols`, `access-log`, or `auth` views.

## Scope table

Every view gets the hint flags that match the hook wiring on that view.

| View | Hint flags | `onCreate` wired |
|------|-----------|------------------|
| Users (web) | `search navigate select create={canCreate}` | role-gated — see below |
| Tenants (web) | `search navigate select create` | yes |
| Visitors (shared → web + desktop) | `search navigate select create` | yes |
| Providers (web) | `search navigate select create` | yes |
| Providers (desktop) | `search navigate select create` | yes |
| Residents (web) | `search navigate select` | no |
| Residents (desktop) | `search navigate select` | no |
| Logbook (web) | `search` | no |

`canCreate` for users = `user?.role === "super_admin" || user?.role === "admin"`, matching the existing inline gate that renders the Create button.

## Architecture

Two cooperating pieces in the shared package, plus thin wiring at each call site. The hook and the hint are kept in sync by the call site — each view passes the same capability flags to both. This mirrors how existing shared primitives (`VisitPersonStatusSelect`, `ResidentSelect`, `ColorSelect`) are used.

### 1. `useKeyboardNavigation` — behavior changes

**File:** `packages/features/src/shared/hooks/use-keyboard-navigation.ts`

Three changes, all backwards-compatible:

1. **`F` parity with `B`.** Widen the existing branch to `e.key === "b" || e.key === "B" || e.key === "f" || e.key === "F"`. Same input-focus guard.
2. **New optional `onCreate?: () => void`.** When `N`/`n` is pressed, no input is focused, and `!disabled`, call `onCreate()`. When `onCreate` is undefined, `N` is a silent no-op. `onCreate` is added to the dependency array.
3. **Arrow-nav quartet becomes optional.** `items`, `highlightedIndex`, `setHighlightedIndex`, `onSelectItem` are all made optional. The `ArrowUp/Down` branches run only when `setHighlightedIndex` is defined; the `Enter` branch runs only when both `onSelectItem` and `items` are defined. This supports the logbook's B/F-only mode without breaking existing callers (all of which still pass the quartet).

Unchanged: `ArrowUp/Down` clamping, `Enter` guard at `highlightedIndex === -1`, `Escape` blur on focused input, `disabled` short-circuit, `searchInputRef` requirement.

**Updated type:**

```ts
export interface UseKeyboardNavigationOptions<T> {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  items?: T[];
  highlightedIndex?: number;
  setHighlightedIndex?: (i: number | ((prev: number) => number)) => void;
  onSelectItem?: (item: T) => void;
  onCreate?: () => void;
}
```

**Tests added** to `packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx`:

- `F` focuses the search input when no input is focused.
- `F` does nothing when an input is focused.
- `N` calls `onCreate` when no input is focused.
- `N` does not call `onCreate` when an input is focused.
- `N` is a no-op when `onCreate` is undefined.
- Search-only mode: passing only `searchInputRef` — `ArrowDown`, `Enter`, `N` are all no-ops; `B`/`F` still focus.

Existing tests stay green without modification.

### 2. `ShortcutsHint` — new component

**Files:**
- `packages/features/src/shared/shortcuts-hint/shortcuts-hint.tsx`
- `packages/features/src/shared/shortcuts-hint/index.ts`
- `packages/features/src/shared/shortcuts-hint/__tests__/shortcuts-hint.test.tsx`
- Re-export from `packages/features/src/shared/index.ts`: `{ ShortcutsHint, type ShortcutsHintProps }`.

**Why the shared features package, not `@ramcar/ui`:** uses `useI18n()` from `../../adapters/i18n` to pull localized labels from `@ramcar/i18n`. Same pattern as every other shared feature primitive.

**Props:**

```ts
export interface ShortcutsHintProps {
  search?: boolean;
  navigate?: boolean;
  select?: boolean;
  create?: boolean;
  className?: string;
}
```

All flags default to `false`. The component renders nothing when every flag is false (defensive).

**Rendering:**

- Root: `inline-flex items-center gap-3 text-xs text-muted-foreground`.
- Each enabled group: one or more `<kbd>` chips followed by a localized label.
  - `<kbd>` chip style: `inline-flex items-center justify-center h-5 min-w-5 px-1 rounded border bg-background font-mono text-[11px] text-foreground`.
  - `search` → `[B] / [F]` + `t("shortcuts.search")`
  - `navigate` → `[↑] [↓]` + `t("shortcuts.navigate")`
  - `select` → `[↵]` + `t("shortcuts.select")`
  - `create` → `[N]` + `t("shortcuts.create")`
- `aria-label={t("shortcuts.ariaLabel")}` on the root so assistive tech announces "Keyboard shortcuts" rather than reading every glyph.

**Tests** (`shortcuts-hint.test.tsx`):

- Renders only the enabled groups (search-only, search+navigate, full four, none).
- Root has `aria-label` from `shortcuts.ariaLabel`.
- Keys render as `<kbd>` elements.
- Uses the existing test `I18nProvider` pattern from sibling shared-module tests.

### 3. i18n strings

Added to `packages/i18n/src/messages/en.json` and `packages/i18n/src/messages/es.json`:

```
shortcuts.ariaLabel  → "Keyboard shortcuts"   / "Atajos de teclado"
shortcuts.search     → "search"               / "buscar"
shortcuts.navigate   → "navigate"             / "navegar"
shortcuts.select     → "select"               / "seleccionar"
shortcuts.create     → "new"                  / "nuevo"
```

Glyphs (`B`, `F`, `↑`, `↓`, `N`, `↵`) are not localized.

## Call-site integration

Placement: the hint renders inside the view's existing **title row**, right-aligned on the same row as the title and any Create button, so it flows as:

```
[Title] ............ [ShortcutsHint] [Create button?]
```

For views that currently use `flex justify-between`, the parent row is updated to `flex flex-wrap items-center justify-between gap-2` so the hint wraps gracefully on narrow widths.

Each change below is minimal — add the import, pass `onCreate` to the hook where relevant, drop the hint into the title row.

### Users (web)

**File:** `apps/web/src/features/users/components/users-table.tsx`

- Compute `const canCreate = user?.role === "super_admin" || user?.role === "admin"`.
- Hook call gains `onCreate: canCreate ? handleCreateOpen : undefined` where `handleCreateOpen` is the body currently inlined on the Create button's `onClick`.
- Extract that inline handler into a stable `handleCreateOpen` useCallback so the same reference is used by both the button and the hook.
- Inside the existing title-row div, render `<ShortcutsHint search navigate select create={canCreate} />` before the Create button.

### Tenants (web)

**File:** `apps/web/src/features/tenants/components/tenants-table.tsx`

- Hook call gains `onCreate: handleCreate`.
- Title row becomes `flex flex-wrap items-center justify-between gap-2`.
- Render `<ShortcutsHint search navigate select create />` before the Create button.

### Visitors (shared)

**Files:**
- `packages/features/src/visitors/components/visitors-view.tsx` — hook call gains `onCreate: handleRegisterNew`.
- `packages/features/src/visitors/components/visitors-table.tsx` — render `<ShortcutsHint search navigate select create />` inside the title-row div (next to the existing `trailingAction`/`+ Register new` button), and update that flex row to wrap.

No new props on `VisitorsView` — the create flow is always enabled today, so the hint is also always shown. (If a future host app needs to hide create, a prop can be added alongside the existing `trailingAction` slot.)

### Providers (web)

**Files:**
- `apps/web/src/features/providers/components/providers-page-client.tsx` — hook call gains `onCreate: handleRegisterNew`.
- `apps/web/src/features/providers/components/providers-table.tsx` — render `<ShortcutsHint search navigate select create />` inside the title row.

### Providers (desktop)

**Files:**
- `apps/desktop/src/features/providers/components/providers-page-client.tsx` — hook call gains `onCreate: handleRegisterNew`.
- `apps/desktop/src/features/providers/components/providers-table.tsx` — render `<ShortcutsHint search navigate select create />` inside the title row.

### Residents (web)

**File:** `apps/web/src/features/residents/components/residents-table.tsx`

- No `onCreate` wired (residents list has no create flow).
- Render `<ShortcutsHint search navigate select />` inside the title row.

`residents-page-client.tsx` is unchanged.

### Residents (desktop)

**File:** `apps/desktop/src/features/residents/components/residents-table.tsx`

- Same as web residents: hint-only, no hook change.

### Logbook (web)

This is the only view that needs structural wiring, because it does not use `useKeyboardNavigation` today.

**Files:**
- `apps/web/src/features/logbook/components/logbook-subpage.tsx`
  - Add `const searchInputRef = useRef<HTMLInputElement>(null)`.
  - Call `useKeyboardNavigation({ searchInputRef })` — no other props (search-only mode).
  - Pass `searchInputRef` down to `LogbookToolbar`.
- `apps/web/src/features/logbook/components/logbook-toolbar.tsx`
  - Convert to `forwardRef<HTMLInputElement, LogbookToolbarProps>`. Drop the internal `useRef`.
  - Spread the forwarded ref onto the existing `<input>`. The local `Escape`-clear behavior stays.
  - Render `<ShortcutsHint search />` inside the toolbar's flex container. Placement: after `ExportMenu` (at the end of the row) — keeps the hint near the search input without reshuffling the existing toolbar layout. Allow wrap via the existing `flex-wrap` on the toolbar row.

## Tests (call-site level)

New or extended:

- `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx` (existing) — add assertions:
  - Pressing `N` as super_admin/admin opens the create sidebar.
  - Pressing `N` as a non-admin is a no-op.
  - Pressing `F` focuses the search input.
- `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx` (existing) — add:
  - `N` triggers the register-new sidebar.
  - `<ShortcutsHint>` is present.

Hook and component unit tests (Section 1 and 2) cover the bulk of behavior. No new per-view integration tests for tenants, providers, residents, or logbook unless a regression emerges during implementation.

## File inventory

**New files (4):**
- `packages/features/src/shared/shortcuts-hint/shortcuts-hint.tsx`
- `packages/features/src/shared/shortcuts-hint/index.ts`
- `packages/features/src/shared/shortcuts-hint/__tests__/shortcuts-hint.test.tsx`
- `docs/superpowers/specs/2026-04-23-keyboard-shortcuts-help-design.md` — this file

i18n additions go into the existing `packages/i18n/src/messages/en.json` and `es.json` (no new files).

**Modified files (19):**
- `packages/features/src/shared/hooks/use-keyboard-navigation.ts`
- `packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx`
- `packages/features/src/shared/index.ts`
- `packages/features/src/visitors/components/visitors-view.tsx`
- `packages/features/src/visitors/components/visitors-table.tsx`
- `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx`
- `packages/i18n/src/messages/en.json`
- `packages/i18n/src/messages/es.json`
- `apps/web/src/features/users/components/users-table.tsx`
- `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx`
- `apps/web/src/features/tenants/components/tenants-table.tsx`
- `apps/web/src/features/residents/components/residents-table.tsx`
- `apps/web/src/features/providers/components/providers-page-client.tsx`
- `apps/web/src/features/providers/components/providers-table.tsx`
- `apps/web/src/features/logbook/components/logbook-subpage.tsx`
- `apps/web/src/features/logbook/components/logbook-toolbar.tsx`
- `apps/desktop/src/features/residents/components/residents-table.tsx`
- `apps/desktop/src/features/providers/components/providers-page-client.tsx`
- `apps/desktop/src/features/providers/components/providers-table.tsx`

## Risks / edge cases

- **Input capture of `F`/`N` while typing.** Already guarded — the hook's existing `isInputFocused` check (unchanged) covers both new keys because they go through the same branch as `B`.
- **Users view role gate.** The Create button is only rendered for `super_admin`/`admin`. If `onCreate` were wired unconditionally, a guard or resident pressing `N` would open the create sidebar with no visible button — a confusing affordance. The design wires `onCreate` and the hint's `create` flag to the same `canCreate` boolean to keep the UI honest.
- **Keyboard conflicts with text inputs inside sidebars.** The existing `disabled: sidebarOpen` flag already short-circuits every key when a Sheet is open. No change needed.
- **Logbook toolbar ref change.** Switching `LogbookToolbar` to `forwardRef` is a type-only API change; existing callers do not pass a ref today, so adding one at `LogbookSubpage` is the only new wiring.
- **Hint overflow on narrow viewports.** Mitigated by switching the affected title rows to `flex-wrap`. Desktop booth app runs at a fixed guard-booth resolution so wrapping is unlikely there; web may wrap, and the hint remains readable stacked below the title.
