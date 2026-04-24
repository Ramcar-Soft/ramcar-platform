# Keyboard Shortcuts: F/N + Shared Help Hint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `F` (alias for `B`, focus search) and `N` (trigger create flow) to the existing list-view keyboard hook, then expose a per-view `<ShortcutsHint />` so users can discover the shortcuts active on each view.

**Architecture:** Two cooperating pieces in `@ramcar/features` (`useKeyboardNavigation` extension + new `ShortcutsHint` shared primitive) plus thin call-site wiring across 8 views (web: users, tenants, residents, providers, logbook; desktop: providers, residents; shared: visitors). The hook signature is widened backwards-compatibly: arrow-nav quartet becomes optional so logbook can use search-only mode, and `onCreate` is a new optional callback fired on `N`. The hint renders inside each view's existing title row.

**Tech Stack:** TypeScript 5.x (strict), React 18, Next.js 16 + next-intl v4 (web), Electron 30 + Vite + react-i18next (desktop), `@ramcar/features` shared module, `@ramcar/ui` (Tailwind), `@ramcar/i18n` JSON messages, Vitest + Testing Library.

**Reference spec:** `docs/superpowers/specs/2026-04-23-keyboard-shortcuts-help-design.md`

---

## File inventory

**New files (3):**
- `packages/features/src/shared/shortcuts-hint/shortcuts-hint.tsx`
- `packages/features/src/shared/shortcuts-hint/index.ts`
- `packages/features/src/shared/shortcuts-hint/__tests__/shortcuts-hint.test.tsx`

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

---

## Task 1: Extend `useKeyboardNavigation` (hook signature + behavior)

**Files:**
- Modify: `packages/features/src/shared/hooks/use-keyboard-navigation.ts`
- Modify: `packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx`

The hook currently requires `items`, `highlightedIndex`, `setHighlightedIndex`, `onSelectItem`. After this task, all four become optional (so logbook can opt into search-only mode), and two new behaviors land:
- `F`/`f` is treated identically to `B`/`b` (focus search input).
- `N`/`n` calls a new optional `onCreate` callback when no input is focused and `!disabled`.

Existing callers (users, tenants, visitors, providers — web + desktop) still pass the full quartet, so they keep working unchanged.

- [ ] **Step 1: Add the new failing tests in the hook test file**

Append the following test cases to `packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx`. They go at the end of the existing `describe("useKeyboardNavigation<T>", ...)` block, before its closing `});`.

Add a second `Harness` variant that exposes the new options (place it just below the existing `Harness` definition, before the `press` helper):

```tsx
function HarnessExt(props: {
  items?: Item[];
  highlightedIndex?: number;
  setHighlightedIndex?: (i: number | ((prev: number) => number)) => void;
  onSelectItem?: (item: Item) => void;
  onCreate?: () => void;
  disabled?: boolean;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  useKeyboardNavigation<Item>({
    searchInputRef: props.searchRef,
    disabled: props.disabled,
    items: props.items,
    highlightedIndex: props.highlightedIndex,
    setHighlightedIndex: props.setHighlightedIndex,
    onSelectItem: props.onSelectItem,
    onCreate: props.onCreate,
  });
  return <input ref={props.searchRef} data-testid="search" />;
}
```

Then add these test cases at the end of the existing `describe` block:

```tsx
  it("F focuses the search input when no input is focused", () => {
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    expect(document.activeElement).not.toBe(searchRef.current);
    press("f");
    expect(document.activeElement).toBe(searchRef.current);
  });

  it("F does nothing when an input is already focused", () => {
    const searchRef = createRef<HTMLInputElement>();
    const { getByTestId } = render(
      <Harness
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    const input = getByTestId("search") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);
    press("f", input);
    expect(document.activeElement).toBe(input);
  });

  it("N calls onCreate when no input is focused", () => {
    const onCreate = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <HarnessExt
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        onCreate={onCreate}
        searchRef={searchRef}
      />,
    );
    press("n");
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("N does not call onCreate when an input is focused", () => {
    const onCreate = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    const { getByTestId } = render(
      <HarnessExt
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        onCreate={onCreate}
        searchRef={searchRef}
      />,
    );
    const input = getByTestId("search") as HTMLInputElement;
    input.focus();
    press("n", input);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("N is a no-op when onCreate is undefined", () => {
    const searchRef = createRef<HTMLInputElement>();
    render(
      <HarnessExt searchRef={searchRef} />,
    );
    expect(() => press("n")).not.toThrow();
  });

  it("search-only mode (only searchInputRef): arrows, Enter, N are no-ops; B and F still focus", () => {
    const searchRef = createRef<HTMLInputElement>();
    render(<HarnessExt searchRef={searchRef} />);

    press("ArrowDown");
    press("ArrowUp");
    press("Enter");
    press("n");
    // Nothing observable to assert beyond no-throw; main assertion: focus still works.

    expect(document.activeElement).not.toBe(searchRef.current);
    press("b");
    expect(document.activeElement).toBe(searchRef.current);

    (searchRef.current as HTMLInputElement).blur();
    expect(document.activeElement).not.toBe(searchRef.current);
    press("f");
    expect(document.activeElement).toBe(searchRef.current);
  });
```

- [ ] **Step 2: Run the new tests; confirm they fail**

Run: `pnpm --filter @ramcar/features test -- use-keyboard-navigation`
Expected: the 6 new tests fail. Existing tests still pass.

- [ ] **Step 3: Update the hook implementation**

Replace the entire contents of `packages/features/src/shared/hooks/use-keyboard-navigation.ts` with:

```ts
import { useCallback, useEffect } from "react";

export interface UseKeyboardNavigationOptions<T> {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  items?: T[];
  highlightedIndex?: number;
  setHighlightedIndex?: (i: number | ((prev: number) => number)) => void;
  onSelectItem?: (item: T) => void;
  onCreate?: () => void;
}

export function useKeyboardNavigation<T>({
  searchInputRef,
  disabled,
  items,
  highlightedIndex,
  setHighlightedIndex,
  onSelectItem,
  onCreate,
}: UseKeyboardNavigationOptions<T>): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (
        e.key === "b" ||
        e.key === "B" ||
        e.key === "f" ||
        e.key === "F"
      ) {
        if (!isInputFocused) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (e.key === "n" || e.key === "N") {
        if (!isInputFocused && onCreate) {
          e.preventDefault();
          onCreate();
        }
        return;
      }

      if (e.key === "ArrowDown" && setHighlightedIndex) {
        e.preventDefault();
        const max = (items?.length ?? 1) - 1;
        setHighlightedIndex((prev) => Math.min(prev + 1, max));
        return;
      }

      if (e.key === "ArrowUp" && setHighlightedIndex) {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (
        e.key === "Enter" &&
        onSelectItem &&
        items &&
        highlightedIndex !== undefined &&
        highlightedIndex >= 0
      ) {
        const item = items[highlightedIndex];
        if (item) {
          e.preventDefault();
          onSelectItem(item);
        }
      }

      if (e.key === "Escape" && isInputFocused) {
        (target as HTMLInputElement).blur();
      }
    },
    [
      disabled,
      searchInputRef,
      items,
      highlightedIndex,
      setHighlightedIndex,
      onSelectItem,
      onCreate,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
```

- [ ] **Step 4: Run the hook tests again; confirm all pass**

Run: `pnpm --filter @ramcar/features test -- use-keyboard-navigation`
Expected: all tests pass (existing + 6 new).

- [ ] **Step 5: Run the full features-package test suite to confirm no regression**

Run: `pnpm --filter @ramcar/features test`
Expected: all tests pass.

- [ ] **Step 6: Typecheck the package**

Run: `pnpm --filter @ramcar/features typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/features/src/shared/hooks/use-keyboard-navigation.ts packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx
git commit -m "feat(features): add F/N keys and optional nav quartet to useKeyboardNavigation"
```

---

## Task 2: Add `shortcuts.*` i18n keys (en + es)

**Files:**
- Modify: `packages/i18n/src/messages/en.json`
- Modify: `packages/i18n/src/messages/es.json`

The shared hint reads its labels from `@ramcar/i18n` via the `useI18n()` adapter. Add a top-level `shortcuts` namespace to both message files.

- [ ] **Step 1: Add `shortcuts` block to en.json**

Open `packages/i18n/src/messages/en.json`. Insert a new top-level key after the `metadata` block and before `common` (line 6):

```json
  "shortcuts": {
    "ariaLabel": "Keyboard shortcuts",
    "search": "search",
    "navigate": "navigate",
    "select": "select",
    "create": "new"
  },
```

The result for the first ~20 lines should look like:

```json
{
  "metadata": {
    "title": "Ramcar Web",
    "description": "Ramcar Web Portal"
  },
  "shortcuts": {
    "ariaLabel": "Keyboard shortcuts",
    "search": "search",
    "navigate": "navigate",
    "select": "select",
    "create": "new"
  },
  "common": {
    "appName": "RamcarSoft",
    ...
```

- [ ] **Step 2: Add `shortcuts` block to es.json**

Open `packages/i18n/src/messages/es.json`. Insert the parallel block in the same position (after `metadata`, before `common`):

```json
  "shortcuts": {
    "ariaLabel": "Atajos de teclado",
    "search": "buscar",
    "navigate": "navegar",
    "select": "seleccionar",
    "create": "nuevo"
  },
```

- [ ] **Step 3: Validate JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/es.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Typecheck the i18n package**

Run: `pnpm --filter @ramcar/i18n typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/src/messages/en.json packages/i18n/src/messages/es.json
git commit -m "feat(i18n): add shortcuts.* labels for keyboard hint"
```

---

## Task 3: Build the `ShortcutsHint` component (TDD)

**Files:**
- Create: `packages/features/src/shared/shortcuts-hint/shortcuts-hint.tsx`
- Create: `packages/features/src/shared/shortcuts-hint/index.ts`
- Create: `packages/features/src/shared/shortcuts-hint/__tests__/shortcuts-hint.test.tsx`

The component is a stateless, presentation-only strip. It renders nothing when every flag is false, otherwise renders one `<kbd>`-and-label group per enabled flag (search, navigate, select, create). Localized labels come from `useI18n()` (the adapter the host app wires).

- [ ] **Step 1: Write the failing test file**

Create `packages/features/src/shared/shortcuts-hint/__tests__/shortcuts-hint.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithHarness } from "../../../test/harness";
import { ShortcutsHint } from "../shortcuts-hint";

afterEach(() => cleanup());

describe("ShortcutsHint", () => {
  it("renders nothing when no flags are enabled", () => {
    const { container } = renderWithHarness(<ShortcutsHint />);
    expect(container.firstChild).toBeNull();
  });

  it("renders only the search group when only search is enabled", () => {
    renderWithHarness(<ShortcutsHint search />);
    // Mock i18n returns the key itself.
    expect(screen.getByText("shortcuts.search")).toBeInTheDocument();
    expect(screen.queryByText("shortcuts.navigate")).not.toBeInTheDocument();
    expect(screen.queryByText("shortcuts.select")).not.toBeInTheDocument();
    expect(screen.queryByText("shortcuts.create")).not.toBeInTheDocument();
  });

  it("renders search + navigate when both are enabled", () => {
    renderWithHarness(<ShortcutsHint search navigate />);
    expect(screen.getByText("shortcuts.search")).toBeInTheDocument();
    expect(screen.getByText("shortcuts.navigate")).toBeInTheDocument();
    expect(screen.queryByText("shortcuts.select")).not.toBeInTheDocument();
    expect(screen.queryByText("shortcuts.create")).not.toBeInTheDocument();
  });

  it("renders all four groups when every flag is enabled", () => {
    renderWithHarness(<ShortcutsHint search navigate select create />);
    expect(screen.getByText("shortcuts.search")).toBeInTheDocument();
    expect(screen.getByText("shortcuts.navigate")).toBeInTheDocument();
    expect(screen.getByText("shortcuts.select")).toBeInTheDocument();
    expect(screen.getByText("shortcuts.create")).toBeInTheDocument();
  });

  it("renders the search keys B and F as <kbd> elements", () => {
    const { container } = renderWithHarness(<ShortcutsHint search />);
    const kbds = container.querySelectorAll("kbd");
    const labels = Array.from(kbds).map((k) => k.textContent);
    expect(labels).toContain("B");
    expect(labels).toContain("F");
  });

  it("renders the arrow keys when navigate is enabled", () => {
    const { container } = renderWithHarness(<ShortcutsHint navigate />);
    const labels = Array.from(container.querySelectorAll("kbd")).map((k) => k.textContent);
    expect(labels).toContain("↑");
    expect(labels).toContain("↓");
  });

  it("renders the Enter glyph when select is enabled", () => {
    const { container } = renderWithHarness(<ShortcutsHint select />);
    const labels = Array.from(container.querySelectorAll("kbd")).map((k) => k.textContent);
    expect(labels).toContain("↵");
  });

  it("renders the N key when create is enabled", () => {
    const { container } = renderWithHarness(<ShortcutsHint create />);
    const labels = Array.from(container.querySelectorAll("kbd")).map((k) => k.textContent);
    expect(labels).toContain("N");
  });

  it("sets aria-label from shortcuts.ariaLabel on the root element", () => {
    renderWithHarness(<ShortcutsHint search />);
    expect(screen.getByLabelText("shortcuts.ariaLabel")).toBeInTheDocument();
  });

  it("merges a custom className onto the root", () => {
    renderWithHarness(<ShortcutsHint search className="custom-class" />);
    const root = screen.getByLabelText("shortcuts.ariaLabel");
    expect(root.className).toMatch(/custom-class/);
  });
});
```

- [ ] **Step 2: Run the test; confirm it fails (file does not exist)**

Run: `pnpm --filter @ramcar/features test -- shortcuts-hint`
Expected: FAIL — module `../shortcuts-hint` cannot be resolved.

- [ ] **Step 3: Implement the component**

Create `packages/features/src/shared/shortcuts-hint/shortcuts-hint.tsx`:

```tsx
import { cn } from "@ramcar/ui";
import { useI18n } from "../../adapters/i18n";

export interface ShortcutsHintProps {
  search?: boolean;
  navigate?: boolean;
  select?: boolean;
  create?: boolean;
  className?: string;
}

const KBD_CLASS =
  "inline-flex items-center justify-center h-5 min-w-5 px-1 rounded border bg-background font-mono text-[11px] text-foreground";

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className={KBD_CLASS}>{children}</kbd>;
}

export function ShortcutsHint({
  search,
  navigate,
  select,
  create,
  className,
}: ShortcutsHintProps) {
  const { t } = useI18n();

  if (!search && !navigate && !select && !create) {
    return null;
  }

  return (
    <div
      aria-label={t("shortcuts.ariaLabel")}
      className={cn(
        "inline-flex flex-wrap items-center gap-3 text-xs text-muted-foreground",
        className,
      )}
    >
      {search && (
        <span className="inline-flex items-center gap-1">
          <Kbd>B</Kbd>
          <span aria-hidden>/</span>
          <Kbd>F</Kbd>
          <span>{t("shortcuts.search")}</span>
        </span>
      )}
      {navigate && (
        <span className="inline-flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>{t("shortcuts.navigate")}</span>
        </span>
      )}
      {select && (
        <span className="inline-flex items-center gap-1">
          <Kbd>↵</Kbd>
          <span>{t("shortcuts.select")}</span>
        </span>
      )}
      {create && (
        <span className="inline-flex items-center gap-1">
          <Kbd>N</Kbd>
          <span>{t("shortcuts.create")}</span>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the barrel file**

Create `packages/features/src/shared/shortcuts-hint/index.ts`:

```ts
export { ShortcutsHint } from "./shortcuts-hint";
export type { ShortcutsHintProps } from "./shortcuts-hint";
```

- [ ] **Step 5: Run the component tests; confirm all pass**

Run: `pnpm --filter @ramcar/features test -- shortcuts-hint`
Expected: all 10 tests pass.

- [ ] **Step 6: Re-export from the package barrel**

Open `packages/features/src/shared/index.ts`. After the existing `ResidentSelect` re-export (line 10), add:

```ts
export { ShortcutsHint } from "./shortcuts-hint";
export type { ShortcutsHintProps } from "./shortcuts-hint";
```

So the surrounding region reads:

```ts
export { ResidentSelect } from "./resident-select";

export { ShortcutsHint } from "./shortcuts-hint";
export type { ShortcutsHintProps } from "./shortcuts-hint";

export { ColorSelect } from "./color-select";
```

- [ ] **Step 7: Typecheck and full test run for the package**

Run in parallel: `pnpm --filter @ramcar/features typecheck` and `pnpm --filter @ramcar/features test`
Expected: both green.

- [ ] **Step 8: Commit**

```bash
git add packages/features/src/shared/shortcuts-hint packages/features/src/shared/index.ts
git commit -m "feat(features): add ShortcutsHint shared component"
```

---

## Task 4: Wire ShortcutsHint + onCreate into Visitors (shared module)

**Files:**
- Modify: `packages/features/src/visitors/components/visitors-view.tsx`
- Modify: `packages/features/src/visitors/components/visitors-table.tsx`
- Modify: `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx`

Visitors is the only feature where the hook lives in `visitors-view.tsx` and the title row lives in `visitors-table.tsx`, so two files change. `handleRegisterNew` is already a `useCallback` — just pass it to the hook. The hint goes inside the table's existing title-row `<div>` with `flex-wrap` added.

- [ ] **Step 1: Add `onCreate` to the hook call in `visitors-view.tsx`**

Open `packages/features/src/visitors/components/visitors-view.tsx`. The `useKeyboardNavigation` call lives at lines 113–120. Currently:

```ts
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
  });
```

Move it to immediately after `handleRegisterNew` is declared (currently lines 122–126), and add `onCreate: handleRegisterNew`:

Delete the current `useKeyboardNavigation<VisitPerson>` call at lines 113–120.

Then, immediately after the closing `}, []);` of `handleRegisterNew` (currently line 126), insert:

```ts
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
    onCreate: handleRegisterNew,
  });
```

(`handleRegisterNew` must be defined above the hook call so the callback reference is stable.)

- [ ] **Step 2: Render `ShortcutsHint` in the visitors table title row**

Open `packages/features/src/visitors/components/visitors-table.tsx`.

Add the import after the existing `getVisitorColumns` import (line 15):

```ts
import { ShortcutsHint } from "../../shared/shortcuts-hint";
```

The title-row `<div>` at line 59 currently reads:

```tsx
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("visitPersons.title")}</h1>
          {trailingAction ?? (
            onRegisterNew && (
              <button
```

Replace those two opening lines with a wrapping flex that includes the hint, so the row becomes:

```tsx
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("visitPersons.title")}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <ShortcutsHint search navigate select create />
            {trailingAction ?? (
              onRegisterNew && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                  onClick={onRegisterNew}
                >
                  + {t("visitPersons.registerNew")}
                </button>
              )
            )}
          </div>
        </div>
```

(The button block itself is unchanged — only its parent wrapper and indentation move. Confirm the button's existing `className` stays exactly as before.)

- [ ] **Step 3: Update `visitors-view-slots.test.tsx` to assert the hint renders and not mock the hook**

Open `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx`.

Remove the line that mocks the keyboard hook (line 18):

```tsx
vi.mock("../../shared/hooks/use-keyboard-navigation", () => ({ useKeyboardNavigation: () => {} }));
```

Then add three new test cases inside the existing `describe("VisitorsView slot props", ...)` block (after the existing tests, before the closing `});`):

```tsx
  it("renders the ShortcutsHint inside the visitors view", () => {
    renderWithHarness(<VisitorsView />);
    // ariaLabel comes from the mock i18n which echoes the key.
    expect(screen.getByLabelText("shortcuts.ariaLabel")).toBeDefined();
  });

  it("pressing N opens the create sidebar (visitors)", () => {
    renderWithHarness(<VisitorsView />);
    // Sidebar starts closed — there is no dialog yet.
    expect(screen.queryByRole("dialog")).toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("pressing F focuses the search input (visitors)", () => {
    renderWithHarness(<VisitorsView />);
    const search = screen.getByPlaceholderText("visitPersons.searchPlaceholder") as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));
    expect(document.activeElement).toBe(search);
  });
```

You will also need an `act()` wrapper around the keydown dispatches if the test runner warns. If so, change the relevant lines to:

```tsx
    import { act } from "@testing-library/react";
    // …
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    });
```

Add `act` to the existing `@testing-library/react` import at the top of the file (currently `import { screen, cleanup } from "@testing-library/react";`).

- [ ] **Step 4: Run the visitors tests**

Run: `pnpm --filter @ramcar/features test -- visitors`
Expected: all tests pass, including the three new assertions.

- [ ] **Step 5: Run the full features-package test suite + typecheck**

Run in parallel: `pnpm --filter @ramcar/features test` and `pnpm --filter @ramcar/features typecheck`
Expected: both green.

- [ ] **Step 6: Commit**

```bash
git add packages/features/src/visitors
git commit -m "feat(features/visitors): wire N shortcut + ShortcutsHint into visitors view"
```

---

## Task 5: Wire ShortcutsHint + onCreate into Tenants (web)

**Files:**
- Modify: `apps/web/src/features/tenants/components/tenants-table.tsx`

Single file. Add `onCreate: handleCreate` to the hook, switch the title row to flex-wrap, drop `<ShortcutsHint search navigate select create />` next to the existing Create button.

- [ ] **Step 1: Import `ShortcutsHint`**

Open `apps/web/src/features/tenants/components/tenants-table.tsx`. Update the existing import on line 17 from:

```ts
import { useKeyboardNavigation } from "@ramcar/features";
```

to:

```ts
import { useKeyboardNavigation, ShortcutsHint } from "@ramcar/features";
```

- [ ] **Step 2: Add `onCreate: handleCreate` to the hook call**

`handleCreate` is currently declared at line 71 as a `function` declaration, so it is hoisted and safe to reference in the hook call above it — but switch it to a `useCallback` for a stable reference and tidiness.

Replace the `function handleCreate()` block (lines 71–75):

```ts
  function handleCreate() {
    setSelectedTenantId(undefined);
    setSidebarMode("create");
    setSidebarOpen(true);
  }
```

with:

```ts
  const handleCreate = useCallback(() => {
    setSelectedTenantId(undefined);
    setSidebarMode("create");
    setSidebarOpen(true);
  }, []);
```

`useCallback` is already imported (see line 3).

Then update the `useKeyboardNavigation` call (lines 57–64) from:

```ts
  useKeyboardNavigation<Tenant>({
    searchInputRef,
    items: tenants,
    disabled: sidebarOpen,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleEdit,
  });
```

to:

```ts
  useKeyboardNavigation<Tenant>({
    searchInputRef,
    items: tenants,
    disabled: sidebarOpen,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleEdit,
    onCreate: handleCreate,
  });
```

Because the hook now references `handleCreate`, move the `handleCreate` declaration above the `useKeyboardNavigation` call. Concretely: cut the `const handleCreate = useCallback(...)` block and paste it just below `handleEdit` (currently lines 41–45), so the order becomes `handleEdit`, `handleCreate`, `columns`, effects, `useKeyboardNavigation`.

- [ ] **Step 3: Update the title row to flex-wrap and add the hint**

The title row at lines 79–85 currently reads:

```tsx
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">{t("nav.label")}</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("actions.create")}
        </Button>
      </div>
```

Replace with:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav.label")}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ShortcutsHint search navigate select create />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        </div>
      </div>
```

- [ ] **Step 4: Typecheck and lint the web app**

Run in parallel: `pnpm --filter web typecheck` and `pnpm --filter web lint`
Expected: no errors.

- [ ] **Step 5: Run any web tests for tenants (no-op if none exist)**

Run: `pnpm --filter web test -- tenants`
Expected: passes (or "no tests found" — still acceptable; this view has no dedicated test suite).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/tenants/components/tenants-table.tsx
git commit -m "feat(web/tenants): wire N shortcut + ShortcutsHint into tenants table"
```

---

## Task 6: Wire ShortcutsHint + role-gated onCreate into Users (web)

**Files:**
- Modify: `apps/web/src/features/users/components/users-table.tsx`
- Modify: `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx`

Users is the only view with a role gate. Compute `canCreate = role === "super_admin" || role === "admin"`, extract the inline create handler to a stable `handleCreateOpen` useCallback, wire it into the hook only when `canCreate`, and pass the same boolean to the hint's `create` flag so the hint stays in sync with the visible Create button.

- [ ] **Step 1: Add the failing role-gate tests**

Open `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx`.

The test file currently mocks `@ramcar/store` to return `{ user: { userId: "u1", role: "super_admin", tenantId: "t1" } }` (lines 72–75). For the new tests we need to vary the role. Replace the static mock with one driven by a mutable holder, and add a helper:

Replace lines 72–75:

```ts
vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { userId: "u1", role: "super_admin", tenantId: "t1" } }),
}));
```

with:

```ts
const userHolder: { current: { userId: string; role: string; tenantId: string } } = {
  current: { userId: "u1", role: "super_admin", tenantId: "t1" },
};

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: userHolder.current }),
}));

function setRole(role: "super_admin" | "admin" | "guard" | "resident") {
  userHolder.current = { userId: "u1", role, tenantId: "t1" };
}
```

Then add the following test cases inside the existing `describe("UsersTable interaction", ...)` block (after the existing tests, before its closing `});`):

```tsx
  it("renders the ShortcutsHint with create flag for super_admin", () => {
    setRole("super_admin");
    renderWithClient(<UsersTable />);
    expect(screen.getByLabelText("shortcuts.ariaLabel")).toBeTruthy();
    // The N glyph should be present because canCreate is true.
    const labels = Array.from(document.querySelectorAll("kbd")).map((k) => k.textContent);
    expect(labels).toContain("N");
  });

  it("hides the create glyph when the user is a guard", () => {
    setRole("guard");
    renderWithClient(<UsersTable />);
    expect(screen.getByLabelText("shortcuts.ariaLabel")).toBeTruthy();
    const labels = Array.from(document.querySelectorAll("kbd")).map((k) => k.textContent);
    expect(labels).not.toContain("N");
  });

  it("pressing N as super_admin opens the create sidebar", () => {
    setRole("super_admin");
    renderWithClient(<UsersTable />);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "sidebar.createTitle" })).toBeTruthy();
  });

  it("pressing N as a guard is a no-op", () => {
    setRole("guard");
    renderWithClient(<UsersTable />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("pressing F focuses the search input", () => {
    setRole("super_admin");
    renderWithClient(<UsersTable />);
    const search = screen.getByPlaceholderText("searchPlaceholder") as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));
    });
    expect(document.activeElement).toBe(search);
  });
```

After the new tests, in the existing `beforeEach`, also reset the role so existing tests still see super_admin:

Update the `beforeEach` (lines 87–90) from:

```ts
  beforeEach(() => {
    cleanup();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });
```

to:

```ts
  beforeEach(() => {
    cleanup();
    setRole("super_admin");
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });
```

- [ ] **Step 2: Run the test; confirm the new cases fail**

Run: `pnpm --filter web test -- users-table-interaction`
Expected: the 5 new cases fail (no hint rendered yet, `N` does nothing). Existing cases still pass.

- [ ] **Step 3: Update `users-table.tsx` — add import and create handler**

Open `apps/web/src/features/users/components/users-table.tsx`.

Update the import on line 18 from:

```ts
import { useKeyboardNavigation } from "@ramcar/features";
```

to:

```ts
import { useKeyboardNavigation, ShortcutsHint } from "@ramcar/features";
```

Below `handleSelectItem` (currently lines 87–92), add a stable `canCreate` and a stable `handleCreateOpen`. Insert these lines immediately after the `handleSelectItem` `useCallback` block:

```ts
  const canCreate = user?.role === "super_admin" || user?.role === "admin";

  const handleCreateOpen = useCallback(() => {
    setSelectedUserId(undefined);
    setSidebarMode("create");
    setSidebarOpen(true);
  }, []);
```

- [ ] **Step 4: Wire `onCreate` into the hook**

Update the `useKeyboardNavigation` call (currently lines 102–109) from:

```ts
  useKeyboardNavigation<ExtendedUserProfile>({
    searchInputRef,
    disabled: !!statusDialogUser || sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectItem,
  });
```

to:

```ts
  useKeyboardNavigation<ExtendedUserProfile>({
    searchInputRef,
    disabled: !!statusDialogUser || sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectItem,
    onCreate: canCreate ? handleCreateOpen : undefined,
  });
```

- [ ] **Step 5: Replace the inline Create button handler and render the hint in the title row**

The title-row block (currently lines 121–135) reads:

```tsx
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {(user?.role === "super_admin" || user?.role === "admin") && (
          <Button
            onClick={() => {
              setSelectedUserId(undefined);
              setSidebarMode("create");
              setSidebarOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("createUser")}
          </Button>
        )}
      </div>
```

Replace with:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ShortcutsHint search navigate select create={canCreate} />
          {canCreate && (
            <Button onClick={handleCreateOpen}>
              <Plus className="mr-2 h-4 w-4" />
              {t("createUser")}
            </Button>
          )}
        </div>
      </div>
```

- [ ] **Step 6: Run the users tests; confirm all pass**

Run: `pnpm --filter web test -- users-table-interaction`
Expected: all tests pass.

- [ ] **Step 7: Typecheck and lint**

Run in parallel: `pnpm --filter web typecheck` and `pnpm --filter web lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/users/components/users-table.tsx apps/web/src/features/users/__tests__/users-table-interaction.test.tsx
git commit -m "feat(web/users): wire role-gated N shortcut + ShortcutsHint into users table"
```

---

## Task 7: Wire ShortcutsHint + onCreate into Providers (web)

**Files:**
- Modify: `apps/web/src/features/providers/components/providers-page-client.tsx`
- Modify: `apps/web/src/features/providers/components/providers-table.tsx`

Mirrors the visitors pattern. Hook lives in the page-client; hint goes in the table's title row.

- [ ] **Step 1: Add `onCreate: handleRegisterNew` to the hook call in `providers-page-client.tsx`**

Open `apps/web/src/features/providers/components/providers-page-client.tsx`.

The current hook call at lines 84–91:

```ts
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
  });
```

Move it to immediately after the `handleRegisterNew` declaration (currently lines 93–97), and add the new option. Delete the existing call at lines 84–91, then insert after `handleRegisterNew`:

```ts
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
    onCreate: handleRegisterNew,
  });
```

- [ ] **Step 2: Render `ShortcutsHint` in the providers table title row**

Open `apps/web/src/features/providers/components/providers-table.tsx`.

Add the import after the `getProviderColumns` import (line 17):

```ts
import { ShortcutsHint } from "@ramcar/features";
```

Replace the title-row block (lines 61–72):

```tsx
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {onRegisterNew && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              onClick={onRegisterNew}
            >
              + {t("registerNew")}
            </button>
          )}
        </div>
```

with:

```tsx
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <ShortcutsHint search navigate select create />
            {onRegisterNew && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                onClick={onRegisterNew}
              >
                + {t("registerNew")}
              </button>
            )}
          </div>
        </div>
```

- [ ] **Step 3: Typecheck and lint**

Run in parallel: `pnpm --filter web typecheck` and `pnpm --filter web lint`
Expected: no errors.

- [ ] **Step 4: Run the providers tests if any exist**

Run: `pnpm --filter web test -- providers`
Expected: passes (or "no tests found").

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/providers
git commit -m "feat(web/providers): wire N shortcut + ShortcutsHint into providers view"
```

---

## Task 8: Wire ShortcutsHint + onCreate into Providers (desktop)

**Files:**
- Modify: `apps/desktop/src/features/providers/components/providers-page-client.tsx`
- Modify: `apps/desktop/src/features/providers/components/providers-table.tsx`

Same pattern as web providers, slightly different button (uses `<Button size="sm">` instead of a raw `<button>`).

- [ ] **Step 1: Add `onCreate: handleRegisterNew` to the hook call in `providers-page-client.tsx` (desktop)**

Open `apps/desktop/src/features/providers/components/providers-page-client.tsx`.

Current hook call at lines 81–88:

```ts
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
  });
```

Move it to immediately after the `handleRegisterNew` declaration (currently lines 90–94), and add `onCreate`. Delete the existing call at lines 81–88, then insert after `handleRegisterNew`:

```ts
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
    onCreate: handleRegisterNew,
  });
```

- [ ] **Step 2: Render `ShortcutsHint` in the desktop providers table title row**

Open `apps/desktop/src/features/providers/components/providers-table.tsx`.

Add the import after the `getProviderColumns` import (line 8):

```ts
import { ShortcutsHint } from "@ramcar/features";
```

Replace the title-row block (lines 40–47):

```tsx
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("providers.title")}</h1>
          {onRegisterNew && (
            <Button size="sm" onClick={onRegisterNew}>
              + {t("providers.registerNew")}
            </Button>
          )}
        </div>
```

with:

```tsx
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("providers.title")}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <ShortcutsHint search navigate select create />
            {onRegisterNew && (
              <Button size="sm" onClick={onRegisterNew}>
                + {t("providers.registerNew")}
              </Button>
            )}
          </div>
        </div>
```

- [ ] **Step 3: Typecheck and lint the desktop app**

Run in parallel: `pnpm --filter desktop typecheck` and `pnpm --filter desktop lint`
Expected: no errors.

- [ ] **Step 4: Run desktop tests if any cover providers**

Run: `pnpm --filter desktop test -- providers`
Expected: passes (or "no tests found").

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/features/providers
git commit -m "feat(desktop/providers): wire N shortcut + ShortcutsHint into providers view"
```

---

## Task 9: Wire ShortcutsHint into Residents (web — hint-only)

**Files:**
- Modify: `apps/web/src/features/residents/components/residents-table.tsx`

No `onCreate`, no hook change — residents has no create flow. Just render the hint.

- [ ] **Step 1: Add the import**

Open `apps/web/src/features/residents/components/residents-table.tsx`. After the existing `getResidentColumns` import (line 17), add:

```ts
import { ShortcutsHint } from "@ramcar/features";
```

- [ ] **Step 2: Render the hint inside the title row**

Replace the title-row block (lines 44–46):

```tsx
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
```

with:

```tsx
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <ShortcutsHint search navigate select />
        </div>
```

- [ ] **Step 3: Typecheck and lint**

Run in parallel: `pnpm --filter web typecheck` and `pnpm --filter web lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/residents/components/residents-table.tsx
git commit -m "feat(web/residents): add ShortcutsHint to residents table"
```

---

## Task 10: Wire ShortcutsHint into Residents (desktop — hint-only)

**Files:**
- Modify: `apps/desktop/src/features/residents/components/residents-table.tsx`

Same as web residents.

- [ ] **Step 1: Add the import**

Open `apps/desktop/src/features/residents/components/residents-table.tsx`. After the `getResidentColumns` import (line 15), add:

```ts
import { ShortcutsHint } from "@ramcar/features";
```

- [ ] **Step 2: Render the hint inside the title row**

Replace the title-row block (lines 42–44):

```tsx
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("residents.title")}</h1>
        </div>
```

with:

```tsx
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("residents.title")}</h1>
          <ShortcutsHint search navigate select />
        </div>
```

- [ ] **Step 3: Typecheck and lint**

Run in parallel: `pnpm --filter desktop typecheck` and `pnpm --filter desktop lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/residents/components/residents-table.tsx
git commit -m "feat(desktop/residents): add ShortcutsHint to residents table"
```

---

## Task 11: Wire ShortcutsHint + search-only useKeyboardNavigation into Logbook (web)

**Files:**
- Modify: `apps/web/src/features/logbook/components/logbook-subpage.tsx`
- Modify: `apps/web/src/features/logbook/components/logbook-toolbar.tsx`

Logbook does not currently use the hook. Wire it in search-only mode (only `searchInputRef` is passed) so that `B`/`F` focuses the toolbar's search input. No arrow nav, no Enter handler, no create. The hint renders at the end of the toolbar row.

- [ ] **Step 1: Convert `LogbookToolbar` to `forwardRef` and render the hint**

Open `apps/web/src/features/logbook/components/logbook-toolbar.tsx`.

Update the imports at the top so the file imports `forwardRef` from React and `ShortcutsHint` from features, and drops the unused `useRef` (it is replaced by the forwarded ref):

```tsx
"use client";

import { forwardRef } from "react";
import { X, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ResidentSelect } from "@ramcar/features/shared/resident-select";
import { ShortcutsHint } from "@ramcar/features";
import { DateRangeFilter } from "./date-range-filter";
import { ExportMenu } from "./export-menu";
import { TenantSelect } from "./tenant-select";
import type { LogbookFilters } from "../types";
```

Replace the current `function LogbookToolbar(...)` declaration (lines 24–98) with a `forwardRef`-based component. The old internal `inputRef` is removed (the forwarded ref is used in its place). The local `Escape`-clear handler stays. The clear-button still needs a ref to clear the input value — we'll keep an internal `useRef` for that purpose, but mirror it with the forwarded ref via `useImperativeHandle`. Actually simpler: import the existing `Input` clear behavior — the spec says local `Escape`-clear stays, and the existing clear-button uses `inputRef.current.value = ""`. We have two options:

  - (a) Keep a *second* internal ref for the clear button only, and additionally accept the forwarded ref for the keyboard hook.
  - (b) Use `useImperativeHandle` to expose the inner ref to both consumers.

Option (a) is simpler — both refs point at the same `<input>`. Use a callback ref that assigns into the forwarded ref AND the internal ref.

Replace the entire `function LogbookToolbar(...) { ... }` block with:

```tsx
export const LogbookToolbar = forwardRef<HTMLInputElement, LogbookToolbarProps>(
  function LogbookToolbar(
    {
      filters,
      onFilterChange,
      onSearchChange,
      onResidentChange,
      onTenantChange,
      actorRole,
      personType,
      totalRows,
      onExportAll,
    },
    ref,
  ) {
    const t = useTranslations("logbook");

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Escape") {
        e.currentTarget.value = "";
        onSearchChange("");
      }
    }

    // The resident filter is meaningless in SuperAdmin "all tenants" mode
    // (residents are tenant-scoped, so the picker would be misleading).
    const showResidentSelect =
      actorRole !== "super_admin" || Boolean(filters.tenantId);

    return (
      <div className="flex flex-wrap items-center gap-2">
        <TenantSelect value={filters.tenantId} onChange={onTenantChange} />
        <DateRangeFilter filters={filters} onApply={onFilterChange} />
        {showResidentSelect && (
          <div className="w-full sm:w-48">
            <ResidentSelect
              value={filters.residentId ?? ""}
              onChange={(id) => onResidentChange(id || undefined)}
              placeholder={t("toolbar.resident.placeholder")}
            />
          </div>
        )}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={ref}
            type="text"
            defaultValue={filters.search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("toolbar.search.placeholder")}
            aria-label={t("toolbar.search.ariaLabel")}
            className="h-9 rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring w-full sm:w-72"
          />
          {filters.search && (
            <button
              onClick={(e) => {
                const input = e.currentTarget.parentElement?.querySelector("input");
                if (input) input.value = "";
                onSearchChange("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t("toolbar.search.clear")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="ml-auto w-full sm:w-auto">
          <ExportMenu
            filters={filters}
            personType={personType}
            totalRows={totalRows}
            onExportAll={onExportAll}
          />
        </div>
        <ShortcutsHint search />
      </div>
    );
  },
);
```

Note the two material changes inside the toolbar besides accepting the forwarded `ref`:
1. The clear button's `onClick` now finds the input via DOM traversal instead of the deleted `inputRef`. This keeps the same observable behavior.
2. `<ShortcutsHint search />` is appended at the end of the flex row (after `ExportMenu`). The row already wraps via the existing `flex-wrap`.

- [ ] **Step 2: Wire `useKeyboardNavigation` into `logbook-subpage.tsx`**

Open `apps/web/src/features/logbook/components/logbook-subpage.tsx`.

Update the imports at the top:

```tsx
"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@ramcar/store";
import { useKeyboardNavigation } from "@ramcar/features";
import { ExportAllDialog } from "./export-all-dialog";
import { LogbookTable } from "./logbook-table";
import { LogbookToolbar } from "./logbook-toolbar";
import { useLogbook } from "../hooks/use-logbook";
import { useLogbookFilters } from "../hooks/use-logbook-filters";
import type { LogbookColumn } from "../types";
```

Inside `LogbookSubpage(...)`, immediately after the existing `useState` for `exportAllOpen` (currently line 21), add:

```tsx
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyboardNavigation({ searchInputRef });
```

Then update the `<LogbookToolbar>` JSX to forward the ref. Currently:

```tsx
      <LogbookToolbar
        filters={filters}
        onFilterChange={setFilters}
        ...
```

Change to:

```tsx
      <LogbookToolbar
        ref={searchInputRef}
        filters={filters}
        onFilterChange={setFilters}
        ...
```

- [ ] **Step 3: Typecheck and lint the web app**

Run in parallel: `pnpm --filter web typecheck` and `pnpm --filter web lint`
Expected: no errors. The `useKeyboardNavigation` call should typecheck without `items`/`highlightedIndex`/`setHighlightedIndex`/`onSelectItem` because Task 1 made them optional.

- [ ] **Step 4: Run any logbook tests**

Run: `pnpm --filter web test -- logbook`
Expected: passes (or "no tests found").

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/logbook
git commit -m "feat(web/logbook): add search-only useKeyboardNavigation + ShortcutsHint"
```

---

## Task 12: Final verification (full suite, lint, typecheck across the monorepo)

No code changes; this task is a verification gate before declaring the feature complete.

- [ ] **Step 1: Lint the entire workspace**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 2: Typecheck the entire workspace**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Run the unit test suites**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 4: Manual smoke check (only if running in a workstation that can launch dev)**

If a dev server can be launched (web app), open the visitors, providers, residents, tenants, users, and logbook views and confirm:
- The hint strip is visible in each view's title row (logbook: end of toolbar row).
- Pressing `B` and pressing `F` both focus the search input.
- Pressing `N` opens the create sidebar on visitors, providers, tenants, and (as super_admin/admin) users.
- Pressing `N` on logbook and residents does nothing.
- Pressing `N` while typing in the search input does NOT trigger create.
- The Sheet closing with `Escape` still works on the create sidebars.

If the dev server cannot be launched in this environment, say so explicitly in the final report — do not claim the smoke check passed.

---

## Self-review notes

- All 19 modified files and 3 new files in the spec's inventory are addressed by Tasks 1–11.
- The hook signature widening (Task 1) lands before any caller adds `onCreate` (Tasks 4–8) and before the logbook switches to search-only mode (Task 11), so no intermediate state is broken.
- Type names stay consistent: `UseKeyboardNavigationOptions<T>`, `ShortcutsHint`, `ShortcutsHintProps`, `handleCreateOpen` (users), `handleRegisterNew` (visitors/providers), `handleCreate` (tenants).
- The shared `ShortcutsHint` is added to the `@ramcar/features` package barrel in Task 3 Step 6, so call sites can import it from `@ramcar/features` (Tasks 5–11) without a deeper path. The visitors module in Task 4 uses the relative path because it is co-located in the same package.
- The role gate in Task 6 is the only place where `ShortcutsHint`'s `create` flag is conditional. Every other view either always has create (visitors, providers, tenants — `create` flag is `true`) or never has create (residents, logbook — `create` flag omitted, defaults to `false`).
- No dedicated `/new` or `/[id]/edit` routes are touched — the create flow remains in the existing right-side Sheet, per the project's UI patterns rule.
