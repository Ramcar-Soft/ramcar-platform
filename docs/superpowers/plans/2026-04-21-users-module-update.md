# Users Catalog Module Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the web users catalog to parity with the access-event UX (keyboard nav, B hotkey, Status column, inactive row styling, admin self-role lock, user-groups single-select) and consolidate five duplicated `useKeyboardNavigation` hooks into a single generic one in `@ramcar/features`.

**Architecture:**
- The generalized `useKeyboardNavigation<T>` lives in `packages/features/src/shared/hooks/use-keyboard-navigation.ts` and is re-exported via the top-level barrel (`packages/features/src/index.ts` already does `export * from "./shared"`). All five existing callers are migrated in the same PR; the per-caller hook files are deleted.
- The users module stays web-only (`apps/web/src/features/users/`). No DB migration, no API changes, no desktop work, no new routes.

**Tech Stack:** TypeScript 5 strict, Next.js 16 App Router, React 19, shadcn/ui (`@ramcar/ui`), TanStack Query v5, Zustand (`@ramcar/store`), next-intl v4, react-i18next (desktop consumers only), Vitest + `@testing-library/react`, `@ramcar/features` workspace package.

**Spec:** `docs/superpowers/specs/2026-04-21-users-module-update-design.md`.

---

## Orientation — File inventory

### Create
- `packages/features/src/shared/hooks/use-keyboard-navigation.ts` — the new generic hook.
- `packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx` — unit tests for the hook.
- `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx` — integration tests (keyboard nav, row click, highlight, opacity, B hotkey).
- `apps/web/src/features/users/__tests__/user-form-role-lock.test.tsx` — admin self-role lock.
- `apps/web/src/features/users/__tests__/user-form-user-group.test.tsx` — single-select group dropdown.

### Modify
- `packages/features/src/shared/index.ts` — export the generic hook.
- `packages/features/src/visitors/index.ts` — drop the `useKeyboardNavigation` re-export.
- `packages/features/src/visitors/components/visitors-view.tsx` — switch import + rename props.
- `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx` — update the mocked module path.
- `packages/features/src/visitors/__tests__/visitors-view-draft.test.tsx` — update the mocked module path.
- `apps/web/src/features/providers/components/providers-page-client.tsx` — switch import + rename props.
- `apps/desktop/src/features/providers/components/providers-page-client.tsx` — switch import + rename props.
- `apps/web/src/features/residents/components/residents-page-client.tsx` — switch import + rename props.
- `apps/desktop/src/features/residents/components/residents-page-client.tsx` — switch import + rename props.
- `apps/web/src/features/users/components/user-filters.tsx` — forward the search `<Input>` ref.
- `apps/web/src/features/users/components/users-table.tsx` — ref thread, keyboard nav, row click, highlight, opacity-60, actions stopPropagation, filter-change reset.
- `apps/web/src/features/users/components/users-table-columns.tsx` — add Status column.
- `apps/web/src/features/users/components/user-form.tsx` — admin self-role lock, user groups single-select, drop `Checkbox` import.
- `packages/i18n/src/messages/en.json` — add `form.userGroup`, `form.selectUserGroup`, `form.noUserGroup`, `form.roleLockedSelf`; remove `form.userGroups`, `form.selectUserGroups`.
- `packages/i18n/src/messages/es.json` — same set of changes in Spanish.

### Delete
- `packages/features/src/visitors/hooks/use-keyboard-navigation.ts`
- `apps/web/src/features/providers/hooks/use-keyboard-navigation.ts`
- `apps/desktop/src/features/providers/hooks/use-keyboard-navigation.ts`
- `apps/web/src/features/residents/hooks/use-keyboard-navigation.ts`
- `apps/desktop/src/features/residents/hooks/use-keyboard-navigation.ts`

---

## Conventions for this plan

- **Commit after every task.** One commit = one logical, green change. Never commit with failing tests.
- **Exact commands.** Test commands are scoped to the workspace directly (e.g., `pnpm --filter @ramcar/features test`) rather than the repo-wide `pnpm test`, to keep turnaround short. The final task (Task 13) runs the full sweep.
- **Do NOT push** — the user's standing rule is no auto-commit/push; leave pushed state to the user.

---

## Phase A — Generalize `useKeyboardNavigation`

### Task 1: Add generic `useKeyboardNavigation<T>` hook + unit tests + barrel export

**Files:**
- Create: `packages/features/src/shared/hooks/use-keyboard-navigation.ts`
- Create: `packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx`
- Modify: `packages/features/src/shared/index.ts`

- [ ] **Step 1: Write the failing unit test.**

Create `packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx` with this exact content:

```tsx
import { createRef } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useKeyboardNavigation } from "../use-keyboard-navigation";

afterEach(() => cleanup());

interface Item { id: string }

function Harness(props: {
  items: Item[] | undefined;
  highlightedIndex: number;
  setHighlightedIndex: (i: number | ((prev: number) => number)) => void;
  onSelectItem: (item: Item) => void;
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
  });
  return <input ref={props.searchRef} data-testid="search" />;
}

function press(key: string, target?: EventTarget) {
  const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  act(() => {
    (target ?? document).dispatchEvent(ev);
  });
}

describe("useKeyboardNavigation<T>", () => {
  it("ArrowDown advances highlight, clamped at items.length - 1", () => {
    const setHighlightedIndex = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[{ id: "a" }, { id: "b" }, { id: "c" }]}
        highlightedIndex={1}
        setHighlightedIndex={setHighlightedIndex}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    press("ArrowDown");
    expect(setHighlightedIndex).toHaveBeenCalledTimes(1);
    const updater = setHighlightedIndex.mock.calls[0][0] as (prev: number) => number;
    expect(updater(1)).toBe(2);
    expect(updater(2)).toBe(2);
  });

  it("ArrowUp decreases highlight, clamped at 0", () => {
    const setHighlightedIndex = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[{ id: "a" }, { id: "b" }]}
        highlightedIndex={0}
        setHighlightedIndex={setHighlightedIndex}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    press("ArrowUp");
    const updater = setHighlightedIndex.mock.calls[0][0] as (prev: number) => number;
    expect(updater(1)).toBe(0);
    expect(updater(0)).toBe(0);
  });

  it("Enter calls onSelectItem with the highlighted item", () => {
    const onSelectItem = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    const items = [{ id: "a" }, { id: "b" }];
    render(
      <Harness
        items={items}
        highlightedIndex={1}
        setHighlightedIndex={() => {}}
        onSelectItem={onSelectItem}
        searchRef={searchRef}
      />,
    );
    press("Enter");
    expect(onSelectItem).toHaveBeenCalledWith({ id: "b" });
  });

  it("Enter is a no-op when highlightedIndex is -1", () => {
    const onSelectItem = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[{ id: "a" }]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={onSelectItem}
        searchRef={searchRef}
      />,
    );
    press("Enter");
    expect(onSelectItem).not.toHaveBeenCalled();
  });

  it("B focuses the search input when no input is currently focused", () => {
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
    press("b");
    expect(document.activeElement).toBe(searchRef.current);
  });

  it("B does nothing when an input is already focused", () => {
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
    press("b", input);
    expect(document.activeElement).toBe(input);
  });

  it("disabled short-circuits every key", () => {
    const setHighlightedIndex = vi.fn();
    const onSelectItem = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[{ id: "a" }]}
        highlightedIndex={0}
        setHighlightedIndex={setHighlightedIndex}
        onSelectItem={onSelectItem}
        searchRef={searchRef}
        disabled
      />,
    );
    press("ArrowDown");
    press("Enter");
    press("b");
    expect(setHighlightedIndex).not.toHaveBeenCalled();
    expect(onSelectItem).not.toHaveBeenCalled();
  });

  it("items=undefined does not crash and ArrowDown clamps to -1", () => {
    const setHighlightedIndex = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={undefined}
        highlightedIndex={-1}
        setHighlightedIndex={setHighlightedIndex}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    press("ArrowDown");
    const updater = setHighlightedIndex.mock.calls[0][0] as (prev: number) => number;
    expect(updater(-1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `pnpm --filter @ramcar/features test -- use-keyboard-navigation`
Expected: FAIL with "Cannot find module '../use-keyboard-navigation'" (or similar resolution error).

- [ ] **Step 3: Implement the hook.**

Create `packages/features/src/shared/hooks/use-keyboard-navigation.ts` with this exact content:

```ts
import { useCallback, useEffect } from "react";

export interface UseKeyboardNavigationOptions<T> {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  items: T[] | undefined;
  highlightedIndex: number;
  setHighlightedIndex: (i: number | ((prev: number) => number)) => void;
  onSelectItem: (item: T) => void;
}

export function useKeyboardNavigation<T>({
  searchInputRef,
  disabled,
  items,
  highlightedIndex,
  setHighlightedIndex,
  onSelectItem,
}: UseKeyboardNavigationOptions<T>): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "b" || e.key === "B") {
        if (!isInputFocused) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const max = (items?.length ?? 1) - 1;
        setHighlightedIndex((prev) => Math.min(prev + 1, max));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter" && highlightedIndex >= 0 && items) {
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
    [disabled, searchInputRef, items, highlightedIndex, setHighlightedIndex, onSelectItem],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
```

- [ ] **Step 4: Add the barrel export.**

Modify `packages/features/src/shared/index.ts` — append these lines at the end of the file:

```ts
export { useKeyboardNavigation } from "./hooks/use-keyboard-navigation";
export type { UseKeyboardNavigationOptions } from "./hooks/use-keyboard-navigation";
```

- [ ] **Step 5: Run the test to verify it passes.**

Run: `pnpm --filter @ramcar/features test -- use-keyboard-navigation`
Expected: PASS, 8 test cases green.

- [ ] **Step 6: Run the full features package test to verify nothing else broke.**

Run: `pnpm --filter @ramcar/features test`
Expected: PASS. (The visitor tests still use the old visitors-local hook; this task hasn't touched them yet.)

- [ ] **Step 7: Commit.**

```bash
git add packages/features/src/shared/hooks/use-keyboard-navigation.ts \
        packages/features/src/shared/hooks/__tests__/use-keyboard-navigation.test.tsx \
        packages/features/src/shared/index.ts
git commit -m "feat(features): add generic useKeyboardNavigation hook"
```

---

### Task 2: Migrate `VisitorsView` to the generic hook + update visitor test mocks + delete old hook

**Files:**
- Modify: `packages/features/src/visitors/components/visitors-view.tsx`
- Modify: `packages/features/src/visitors/index.ts`
- Modify: `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx`
- Modify: `packages/features/src/visitors/__tests__/visitors-view-draft.test.tsx`
- Delete: `packages/features/src/visitors/hooks/use-keyboard-navigation.ts`

- [ ] **Step 1: Update the `VisitorsView` import + hook call.**

In `packages/features/src/visitors/components/visitors-view.tsx`, replace the line:

```ts
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
```

with:

```ts
import { useKeyboardNavigation } from "../../shared/hooks/use-keyboard-navigation";
```

Then replace the `useKeyboardNavigation({...})` call (currently at `visitors-view.tsx:112-119`):

```tsx
  useKeyboardNavigation({
    searchInputRef,
    sidebarOpen,
    persons: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectPerson: handleSelectPerson,
  });
```

with:

```tsx
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
  });
```

- [ ] **Step 2: Drop the re-export from the visitors barrel.**

In `packages/features/src/visitors/index.ts`, delete the line:

```ts
export { useKeyboardNavigation } from "./hooks/use-keyboard-navigation";
```

(Nothing outside the package imports this — verified via repo-wide grep on `@ramcar/features/visitors` usages.)

- [ ] **Step 3: Update the two visitor test mocks.**

In `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx`, replace:

```ts
vi.mock("../hooks/use-keyboard-navigation", () => ({ useKeyboardNavigation: () => {} }));
```

with:

```ts
vi.mock("../../shared/hooks/use-keyboard-navigation", () => ({ useKeyboardNavigation: () => {} }));
```

Do the identical replacement in `packages/features/src/visitors/__tests__/visitors-view-draft.test.tsx`.

- [ ] **Step 4: Delete the old hook file.**

```bash
git rm packages/features/src/visitors/hooks/use-keyboard-navigation.ts
```

- [ ] **Step 5: Run the features package tests.**

Run: `pnpm --filter @ramcar/features test`
Expected: PASS. All visitor tests green, plus Task 1's hook tests still green.

- [ ] **Step 6: Typecheck the package.**

Run: `pnpm --filter @ramcar/features typecheck`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add packages/features/src/visitors/components/visitors-view.tsx \
        packages/features/src/visitors/index.ts \
        packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx \
        packages/features/src/visitors/__tests__/visitors-view-draft.test.tsx \
        packages/features/src/visitors/hooks/use-keyboard-navigation.ts
git commit -m "refactor(features/visitors): use generic useKeyboardNavigation"
```

---

### Task 3: Migrate `apps/web/providers` to the generic hook

**Files:**
- Modify: `apps/web/src/features/providers/components/providers-page-client.tsx`
- Delete: `apps/web/src/features/providers/hooks/use-keyboard-navigation.ts`

- [ ] **Step 1: Swap the import.**

In `apps/web/src/features/providers/components/providers-page-client.tsx`, replace:

```ts
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
```

with:

```ts
import { useKeyboardNavigation } from "@ramcar/features";
```

- [ ] **Step 2: Rename the hook props at the call site.**

Replace the `useKeyboardNavigation({...})` block (currently at `providers-page-client.tsx:84-91`):

```tsx
  useKeyboardNavigation({
    searchInputRef,
    sidebarOpen,
    persons: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectPerson: handleSelectPerson,
  });
```

with:

```tsx
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
  });
```

- [ ] **Step 3: Delete the old local hook.**

```bash
git rm apps/web/src/features/providers/hooks/use-keyboard-navigation.ts
```

- [ ] **Step 4: Typecheck apps/web.**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 5: Run apps/web tests.**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/features/providers/components/providers-page-client.tsx \
        apps/web/src/features/providers/hooks/use-keyboard-navigation.ts
git commit -m "refactor(web/providers): use generic useKeyboardNavigation"
```

---

### Task 4: Migrate `apps/desktop/providers` to the generic hook

**Files:**
- Modify: `apps/desktop/src/features/providers/components/providers-page-client.tsx`
- Delete: `apps/desktop/src/features/providers/hooks/use-keyboard-navigation.ts`

- [ ] **Step 1: Swap the import.**

In `apps/desktop/src/features/providers/components/providers-page-client.tsx`, replace:

```ts
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
```

with:

```ts
import { useKeyboardNavigation } from "@ramcar/features";
```

- [ ] **Step 2: Rename the hook props at the call site.**

Replace the `useKeyboardNavigation({...})` block (currently at `providers-page-client.tsx:81-88`):

```tsx
  useKeyboardNavigation({
    searchInputRef,
    sidebarOpen,
    persons: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectPerson: handleSelectPerson,
  });
```

with:

```tsx
  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
  });
```

- [ ] **Step 3: Delete the old local hook.**

```bash
git rm apps/desktop/src/features/providers/hooks/use-keyboard-navigation.ts
```

- [ ] **Step 4: Typecheck apps/desktop.**

Run: `pnpm --filter desktop typecheck`
Expected: PASS.

- [ ] **Step 5: Run apps/desktop tests.**

Run: `pnpm --filter desktop test`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/desktop/src/features/providers/components/providers-page-client.tsx \
        apps/desktop/src/features/providers/hooks/use-keyboard-navigation.ts
git commit -m "refactor(desktop/providers): use generic useKeyboardNavigation"
```

---

### Task 5: Migrate `apps/web/residents` to the generic hook

**Files:**
- Modify: `apps/web/src/features/residents/components/residents-page-client.tsx`
- Delete: `apps/web/src/features/residents/hooks/use-keyboard-navigation.ts`

- [ ] **Step 1: Swap the import.**

In `apps/web/src/features/residents/components/residents-page-client.tsx`, replace:

```ts
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
```

with:

```ts
import { useKeyboardNavigation } from "@ramcar/features";
```

- [ ] **Step 2: Rename the hook props at the call site.**

Replace the `useKeyboardNavigation({...})` block (currently at `residents-page-client.tsx:52-64`):

```tsx
  useKeyboardNavigation({
    searchInputRef,
    sidebarOpen,
    residents: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectResident: (resident) => {
      setSelectedResident(resident);
      setSidebarOpen(true);
      setSearch("");
      setHighlightedIndex(-1);
    },
  });
```

with:

```tsx
  useKeyboardNavigation<ExtendedUserProfile>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: (resident) => {
      setSelectedResident(resident);
      setSidebarOpen(true);
      setSearch("");
      setHighlightedIndex(-1);
    },
  });
```

- [ ] **Step 3: Delete the old local hook.**

```bash
git rm apps/web/src/features/residents/hooks/use-keyboard-navigation.ts
```

- [ ] **Step 4: Typecheck apps/web.**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 5: Run apps/web tests.**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/features/residents/components/residents-page-client.tsx \
        apps/web/src/features/residents/hooks/use-keyboard-navigation.ts
git commit -m "refactor(web/residents): use generic useKeyboardNavigation"
```

---

### Task 6: Migrate `apps/desktop/residents` to the generic hook

**Files:**
- Modify: `apps/desktop/src/features/residents/components/residents-page-client.tsx`
- Delete: `apps/desktop/src/features/residents/hooks/use-keyboard-navigation.ts`

- [ ] **Step 1: Swap the import.**

In `apps/desktop/src/features/residents/components/residents-page-client.tsx`, replace:

```ts
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
```

with:

```ts
import { useKeyboardNavigation } from "@ramcar/features";
```

- [ ] **Step 2: Rename the hook props at the call site.**

Replace the `useKeyboardNavigation({...})` block (currently at `residents-page-client.tsx:49-61`):

```tsx
  useKeyboardNavigation({
    searchInputRef,
    sidebarOpen,
    residents: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectResident: (resident) => {
      setSelectedResident(resident);
      setSidebarOpen(true);
      setSearch("");
      setHighlightedIndex(-1);
    },
  });
```

with:

```tsx
  useKeyboardNavigation<ExtendedUserProfile>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: (resident) => {
      setSelectedResident(resident);
      setSidebarOpen(true);
      setSearch("");
      setHighlightedIndex(-1);
    },
  });
```

- [ ] **Step 3: Delete the old local hook.**

```bash
git rm apps/desktop/src/features/residents/hooks/use-keyboard-navigation.ts
```

- [ ] **Step 4: Typecheck apps/desktop.**

Run: `pnpm --filter desktop typecheck`
Expected: PASS.

- [ ] **Step 5: Run apps/desktop tests.**

Run: `pnpm --filter desktop test`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/desktop/src/features/residents/components/residents-page-client.tsx \
        apps/desktop/src/features/residents/hooks/use-keyboard-navigation.ts
git commit -m "refactor(desktop/residents): use generic useKeyboardNavigation"
```

---

### Task 7: Verify no duplicated hook files remain

**Files:** none (verification only).

- [ ] **Step 1: Confirm all 5 old hook files are gone.**

Run:

```bash
find apps packages -name "use-keyboard-navigation.ts" -not -path "**/node_modules/**"
```

Expected output (exactly one line):

```
packages/features/src/shared/hooks/use-keyboard-navigation.ts
```

If any other path is listed, stop and investigate — it means a caller was missed.

- [ ] **Step 2: Confirm no caller is still passing old-shape props.**

Run Grep:

```
Grep pattern: onSelectPerson|onSelectResident|persons:|residents:
Glob: **/*.{ts,tsx}
```

Expected: only matches in type definitions (`@ramcar/shared` types and their tests) — not in any `useKeyboardNavigation({...})` call site.

If any `useKeyboardNavigation` call still uses the old shape, fix it and re-run this task's checks.

- [ ] **Step 3: Run typecheck across the monorepo.**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Run the full test suite.**

Run: `pnpm test`
Expected: PASS. (The pre-existing failing test `users-table-columns.test.tsx` that expects a `status` column will still fail — that's fixed in Task 9. Note the failure count so you can confirm Task 9 reduces it.)

- [ ] **Step 5: No commit — this is a verification checkpoint only.**

---

## Phase B — Users module updates

### Task 8: Add new i18n keys (EN + ES)

**Files:**
- Modify: `packages/i18n/src/messages/en.json`
- Modify: `packages/i18n/src/messages/es.json`

This task ONLY adds the new keys. The old `form.userGroups` and `form.selectUserGroups` keys are removed in Task 12 (after the form stops referencing them).

- [ ] **Step 1: Add EN keys.**

In `packages/i18n/src/messages/en.json`, inside the `"users": { "form": { ... } }` block, add these three keys next to the existing `"userGroups": "User Groups"` entry. Insertion point: immediately after `"userGroups"`:

```json
      "userGroup": "User Group",
      "selectUserGroup": "Select a group",
      "noUserGroup": "No group",
      "roleLockedSelf": "You cannot change your own role.",
```

Leave `"userGroups"` and `"selectUserGroups"` in place for now — Task 12 removes them.

- [ ] **Step 2: Add ES keys.**

In `packages/i18n/src/messages/es.json`, inside the `"users": { "form": { ... } }` block, add these three keys immediately after `"userGroups": "Grupos de Usuario"`:

```json
      "userGroup": "Grupo",
      "selectUserGroup": "Selecciona un grupo",
      "noUserGroup": "Sin grupo",
      "roleLockedSelf": "No puedes cambiar tu propio rol.",
```

- [ ] **Step 3: Verify the JSON still parses.**

Run: `node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/es.json','utf8'));console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Run i18n package check if present.**

Run: `pnpm --filter @ramcar/i18n test 2>/dev/null || echo "no i18n tests — skipping"`
Expected: PASS or the skip message.

- [ ] **Step 5: Commit.**

```bash
git add packages/i18n/src/messages/en.json packages/i18n/src/messages/es.json
git commit -m "chore(i18n): add users form keys for single-group dropdown and role lock"
```

---

### Task 9: Add the Status column to the users table

**Files:**
- Modify: `apps/web/src/features/users/components/users-table-columns.tsx`

The existing test `apps/web/src/features/users/__tests__/users-table-columns.test.tsx` already asserts:
- Column keys: `["full_name", "email", "role", "tenant", "phone", "status", "user_groups", "actions"]`
- Sortable keys: `["full_name", "email", "role", "status"]`

Adding the Status column is what makes this failing test green.

- [ ] **Step 1: Confirm the test fails for the expected reason.**

Run: `pnpm --filter web test -- users-table-columns`
Expected: FAIL with an assertion that `columns.map(c => c.key)` is missing `"status"`.

- [ ] **Step 2: Modify the columns file.**

In `apps/web/src/features/users/components/users-table-columns.tsx`, update the imports (top of file, line 3):

```tsx
import { Button, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@ramcar/ui";
```

becomes

```tsx
import { Button, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@ramcar/ui";
import { UserStatusBadge } from "./user-status-badge";
```

Then, in the array returned by `getUserColumns`, insert a new `"status"` entry between the existing `"phone"` and `"user_groups"` entries. The current file has:

```tsx
    {
      key: "phone",
      header: t("columns.phone"),
      render: (r) => r.phone ? <a className="text-blue-700 underline" href={`tel:${r.phone}`}>{r.phone}</a> : "—",
    },
    {
      key: "user_groups",
      header: t("columns.userGroups"),
      …
    },
```

Insert between them:

```tsx
    {
      key: "status",
      header: t("columns.status"),
      sortable: true,
      render: (user) => <UserStatusBadge status={user.status} />,
    },
```

- [ ] **Step 3: Run the columns test.**

Run: `pnpm --filter web test -- users-table-columns`
Expected: PASS.

- [ ] **Step 4: Run the full web test suite.**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/features/users/components/users-table-columns.tsx
git commit -m "feat(web/users): add Status column to users table"
```

---

### Task 10: Keyboard nav + row click + highlight + opacity + forward ref

**Files:**
- Modify: `apps/web/src/features/users/components/user-filters.tsx`
- Modify: `apps/web/src/features/users/components/users-table.tsx`
- Create: `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx`

This task ships the entire table interaction pass as one logical unit. Keyboard nav depends on the forwarded ref, row click and highlight are coupled, and opacity-60 is trivial to include.

- [ ] **Step 1: Write the failing interaction test.**

Create `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx` with this exact content:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import type { ExtendedUserProfile } from "../types";
import type { PaginatedResponse } from "@ramcar/shared";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUsersData: PaginatedResponse<ExtendedUserProfile> = {
  data: [
    {
      id: "p1", userId: "u1", tenantId: "t1", tenantName: "Tenant",
      fullName: "Alice", email: "alice@x.com", role: "admin", address: null,
      username: "alice", phone: "555-1", phoneType: null, status: "active",
      userGroupIds: [], userGroups: [], observations: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: true, canDeactivate: true,
    },
    {
      id: "p2", userId: "u2", tenantId: "t1", tenantName: "Tenant",
      fullName: "Bob", email: "bob@x.com", role: "guard", address: null,
      username: "bob", phone: "555-2", phoneType: null, status: "inactive",
      userGroupIds: [], userGroups: [], observations: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: true, canDeactivate: true,
    },
    {
      id: "p3", userId: "u3", tenantId: "t1", tenantName: "Tenant",
      fullName: "Carol", email: "carol@x.com", role: "super_admin", address: null,
      username: "carol", phone: "555-3", phoneType: null, status: "active",
      userGroupIds: [], userGroups: [], observations: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: false, canDeactivate: false,
    },
  ],
  meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
};

vi.mock("../hooks/use-users", () => ({
  useUsers: () => ({ data: mockUsersData, isLoading: false, isError: false }),
}));
vi.mock("../hooks/use-tenants", () => ({
  useTenants: () => ({ data: [] }),
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { userId: "u1", role: "super_admin", tenantId: "t1" } }),
}));

import { UsersTable } from "../components/users-table";

describe("UsersTable interaction", () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    cleanup();
  });

  it("renders inactive rows with opacity-60", () => {
    render(<UsersTable locale="en" />);
    const bob = screen.getByText("Bob").closest("tr")!;
    expect(bob.className).toMatch(/opacity-60/);
    const alice = screen.getByText("Alice").closest("tr")!;
    expect(alice.className).not.toMatch(/opacity-60/);
  });

  it("ArrowDown highlights the first row, ArrowDown again highlights the second", () => {
    render(<UsersTable locale="en" />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const first = screen.getByText("Alice").closest("tr")!;
    expect(first.getAttribute("aria-selected")).toBe("true");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const second = screen.getByText("Bob").closest("tr")!;
    expect(second.getAttribute("aria-selected")).toBe("true");
  });

  it("Enter on a highlighted editable row navigates to the edit route", () => {
    render(<UsersTable locale="en" />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/en/catalogs/users/p1/edit");
  });

  it("Enter on a non-editable row is a no-op", () => {
    render(<UsersTable locale="en" />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const carol = screen.getByText("Carol").closest("tr")!;
    expect(carol.getAttribute("aria-selected")).toBe("true");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("clicking an editable row navigates to the edit route", () => {
    render(<UsersTable locale="en" />);
    fireEvent.click(screen.getByText("Alice").closest("tr")!);
    expect(mockRouterPush).toHaveBeenCalledWith("/en/catalogs/users/p1/edit");
  });

  it("clicking a non-editable row does not navigate", () => {
    render(<UsersTable locale="en" />);
    fireEvent.click(screen.getByText("Carol").closest("tr")!);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("pressing B focuses the search input when no input is focused", () => {
    render(<UsersTable locale="en" />);
    const search = screen.getByPlaceholderText("searchPlaceholder") as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
    });
    expect(document.activeElement).toBe(search);
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails.**

Run: `pnpm --filter web test -- users-table-interaction`
Expected: FAIL — no keyboard nav, rows don't have `aria-selected`, click doesn't navigate.

- [ ] **Step 3: Forward the ref from `UserFiltersBar` to its search input.**

Replace the entirety of `apps/web/src/features/users/components/user-filters.tsx` with this content:

```tsx
"use client";

import { forwardRef } from "react";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useAppStore } from "@ramcar/store";
import type { UserFilters, UserStatus } from "../types";

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: Partial<UserFilters>) => void;
  tenants?: { id: string; name: string }[];
}

export const UserFiltersBar = forwardRef<HTMLInputElement, UserFiltersProps>(
  function UserFiltersBar({ filters, onFiltersChange, tenants }, ref) {
    const t = useTranslations("users");
    const user = useAppStore((s) => s.user);
    const isSuperAdmin = user?.role === "super_admin";

    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          ref={ref}
          placeholder={t("searchPlaceholder")}
          value={filters.search ?? ""}
          onChange={(e) => onFiltersChange({ search: e.target.value, page: 1 })}
          className="max-w-sm"
        />
        {isSuperAdmin && tenants && (
          <Select
            value={filters.tenantId ?? "all"}
            onValueChange={(value) =>
              onFiltersChange({ tenantId: value === "all" ? undefined : value, page: 1 })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("filterByTenant")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTenants")}</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.status ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({
              status: value === "all" ? undefined : (value as UserStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="active">{t("status.active")}</SelectItem>
            <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  },
);
```

- [ ] **Step 4: Modify `users-table.tsx` to wire keyboard nav, row click, highlight, opacity-60, and actions stopPropagation.**

Replace the entirety of `apps/web/src/features/users/components/users-table.tsx` with this content:

```tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  cn,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useAppStore } from "@ramcar/store";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useKeyboardNavigation } from "@ramcar/features";
import type { UserFilters } from "../types";
import { useUsers } from "../hooks/use-users";
import { useTenants } from "../hooks/use-tenants";
import { UserFiltersBar } from "./user-filters";
import { getUserColumns, SortableHeader } from "./users-table-columns";
import { ConfirmStatusDialog } from "./confirm-status-dialog";
import type { ExtendedUserProfile } from "../types";

interface UsersTableProps {
  locale: string;
}

export function UsersTable({ locale }: UsersTableProps) {
  const t = useTranslations("users");
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const { data: tenants } = useTenants();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    pageSize: 10,
    sortBy: "full_name",
    sortOrder: "asc",
  });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [statusDialogUser, setStatusDialogUser] =
    useState<ExtendedUserProfile | null>(null);

  const { data, isLoading, isError } = useUsers(filters);

  const handleFiltersChange = useCallback((partial: Partial<UserFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSort = useCallback(
    (key: string) => {
      setFilters((prev) => ({
        ...prev,
        sortBy: key,
        sortOrder:
          prev.sortBy === key && prev.sortOrder === "asc" ? "desc" : "asc",
        page: 1,
      }));
    },
    [],
  );

  const handleEdit = useCallback(
    (u: ExtendedUserProfile) => {
      router.push(`/${locale}/catalogs/users/${u.id}/edit`);
    },
    [router, locale],
  );

  const handleToggleStatus = useCallback((u: ExtendedUserProfile) => {
    setStatusDialogUser(u);
  }, []);

  const handleSelectItem = useCallback(
    (u: ExtendedUserProfile) => {
      if (u.canEdit) handleEdit(u);
    },
    [handleEdit],
  );

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filters, data?.data]);

  useEffect(() => {
    highlightedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  useKeyboardNavigation<ExtendedUserProfile>({
    searchInputRef,
    disabled: !!statusDialogUser,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectItem,
  });

  const columns = getUserColumns({
    t,
    onEdit: handleEdit,
    onToggleStatus: handleToggleStatus,
  });

  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {(user?.role === "super_admin" || user?.role === "admin") && (
          <Button onClick={() => router.push(`/${locale}/catalogs/users/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("createUser")}
          </Button>
        )}
      </div>

      <UserFiltersBar
        ref={searchInputRef}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        tenants={isSuperAdmin ? tenants : undefined}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>
                  {col.sortable ? (
                    <SortableHeader onSort={() => handleSort(col.key)}>
                      {col.header}
                    </SortableHeader>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-destructive py-8"
                >
                  {t("errorLoading")}
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((u, index) => (
                <TableRow
                  key={u.id}
                  ref={index === highlightedIndex ? highlightedRowRef : null}
                  className={cn(
                    "transition-colors",
                    u.canEdit && "cursor-pointer",
                    index === highlightedIndex && "bg-accent",
                    u.status === "inactive" && "opacity-60",
                  )}
                  aria-selected={index === highlightedIndex}
                  onClick={() => {
                    if (u.canEdit) handleEdit(u);
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      onClick={
                        col.key === "actions"
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
                      {col.render(u)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              from: (meta.page - 1) * meta.pageSize + 1,
              to: Math.min(meta.page * meta.pageSize, meta.total),
              total: meta.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => handleFiltersChange({ page: meta.page - 1 })}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => handleFiltersChange({ page: meta.page + 1 })}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}

      <ConfirmStatusDialog
        user={statusDialogUser}
        onClose={() => setStatusDialogUser(null)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run the interaction test.**

Run: `pnpm --filter web test -- users-table-interaction`
Expected: PASS, all 7 assertions green.

- [ ] **Step 6: Run the full web test suite.**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 7: Typecheck.**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add apps/web/src/features/users/components/user-filters.tsx \
        apps/web/src/features/users/components/users-table.tsx \
        apps/web/src/features/users/__tests__/users-table-interaction.test.tsx
git commit -m "feat(web/users): keyboard nav, row click, highlight, inactive styling"
```

---

### Task 11: Admin self-role lock on the edit form

**Files:**
- Modify: `apps/web/src/features/users/components/user-form.tsx`
- Create: `apps/web/src/features/users/__tests__/user-form-role-lock.test.tsx`

- [ ] **Step 1: Write the failing test.**

Create `apps/web/src/features/users/__tests__/user-form-role-lock.test.tsx` with this exact content:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ExtendedUserProfile } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({
    wasRestored: false,
    discardDraft: () => {},
    clearDraft: () => {},
  }),
}));

let mockCurrentUser: { userId: string; role: string; tenantId: string } | null = {
  userId: "u1",
  role: "admin",
  tenantId: "t1",
};
vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: mockCurrentUser }),
}));

import { UserForm } from "../components/user-form";

function makeUser(overrides: Partial<ExtendedUserProfile> = {}): ExtendedUserProfile {
  return {
    id: "p1", userId: "u1", tenantId: "t1", tenantName: "T",
    fullName: "Self", email: "self@x.com", role: "admin", address: "addr",
    username: "self", phone: "5551", phoneType: null, status: "active",
    userGroupIds: [], userGroups: [], observations: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
    canEdit: true, canDeactivate: false,
    ...overrides,
  };
}

describe("UserForm role lock", () => {
  it("admin editing self: role Select is disabled and hint text is shown", () => {
    mockCurrentUser = { userId: "u1", role: "admin", tenantId: "t1" };
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userId: "u1", role: "admin" })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const roleTrigger = screen.getAllByRole("combobox")[0];
    expect(roleTrigger).toHaveAttribute("data-disabled");
    expect(screen.getByText("form.roleLockedSelf")).toBeInTheDocument();
  });

  it("admin editing another user: role Select is enabled", () => {
    mockCurrentUser = { userId: "u1", role: "admin", tenantId: "t1" };
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userId: "u2", role: "guard" })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const roleTrigger = screen.getAllByRole("combobox")[0];
    expect(roleTrigger).not.toHaveAttribute("data-disabled");
    expect(screen.queryByText("form.roleLockedSelf")).toBeNull();
  });

  it("super_admin editing self: role Select is enabled", () => {
    mockCurrentUser = { userId: "u1", role: "super_admin", tenantId: "t1" };
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userId: "u1", role: "super_admin" })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const roleTrigger = screen.getAllByRole("combobox")[0];
    expect(roleTrigger).not.toHaveAttribute("data-disabled");
  });

  it("admin self-submit does not include role in onSubmit payload", async () => {
    mockCurrentUser = { userId: "u1", role: "admin", tenantId: "t1" };
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userId: "u1", role: "admin" })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalled();
    const submitted = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect("role" in submitted).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `pnpm --filter web test -- user-form-role-lock`
Expected: FAIL — role Select is not disabled, payload still includes `role`.

- [ ] **Step 3: Modify `user-form.tsx`.**

In `apps/web/src/features/users/components/user-form.tsx`, locate the block that computes `isSuperAdmin` (around line 168):

```tsx
  const isSuperAdmin = actorRole === "super_admin";
```

Immediately before that line, add:

```tsx
  const isSelf = mode === "edit" && initialData?.userId === currentUser?.userId;
  const roleLocked = isSelf && actorRole === "admin";
```

Then locate the role `<Select>` block (currently around lines 200-220) and replace:

```tsx
        <div className="space-y-2">
          <Label>{t("form.role")} *</Label>
          <Select
            value={formData.role}
            onValueChange={(v) => updateField("role", v)}
          >
            <SelectTrigger aria-invalid={!!errors.role}>
              <SelectValue placeholder={t("form.selectRole")} />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role}</p>
          )}
        </div>
```

with:

```tsx
        <div className="space-y-2">
          <Label>{t("form.role")} *</Label>
          <Select
            value={formData.role}
            onValueChange={(v) => updateField("role", v)}
            disabled={roleLocked}
          >
            <SelectTrigger aria-invalid={!!errors.role}>
              <SelectValue placeholder={t("form.selectRole")} />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roleLocked && (
            <p className="text-xs text-muted-foreground">
              {t("form.roleLockedSelf")}
            </p>
          )}
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role}</p>
          )}
        </div>
```

Next, update `handleSubmit` (currently around lines 143-157) to strip `role` when locked. Replace:

```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const submitData = { ...formData };
    if (isEdit || !submitData.password) {
      delete submitData.password;
      delete submitData.confirmPassword;
    }
    try {
      await onSubmit(submitData);
      clearDraft();
    } catch {
      // Submission failed — keep draft for recovery
    }
  };
```

with:

```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const submitData: Partial<UserFormData> = { ...formData };
    if (isEdit || !submitData.password) {
      delete submitData.password;
      delete submitData.confirmPassword;
    }
    if (roleLocked) {
      delete submitData.role;
    }
    try {
      await onSubmit(submitData as UserFormData);
      clearDraft();
    } catch {
      // Submission failed — keep draft for recovery
    }
  };
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter web test -- user-form-role-lock`
Expected: PASS, 4 assertions green.

- [ ] **Step 5: Run the full web test suite.**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 6: Typecheck.**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/web/src/features/users/components/user-form.tsx \
        apps/web/src/features/users/__tests__/user-form-role-lock.test.tsx
git commit -m "feat(web/users): lock role dropdown when admin edits self"
```

---

### Task 12: User Groups single-select dropdown (+ remove unused i18n keys)

**Files:**
- Modify: `apps/web/src/features/users/components/user-form.tsx`
- Modify: `packages/i18n/src/messages/en.json`
- Modify: `packages/i18n/src/messages/es.json`
- Create: `apps/web/src/features/users/__tests__/user-form-user-group.test.tsx`

- [ ] **Step 1: Write the failing test.**

Create `apps/web/src/features/users/__tests__/user-form-user-group.test.tsx` with this exact content:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { ExtendedUserProfile, UserGroup } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({
    wasRestored: false,
    discardDraft: () => {},
    clearDraft: () => {},
  }),
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { userId: "uX", role: "super_admin", tenantId: "t1" } }),
}));

import { UserForm } from "../components/user-form";

function makeUser(overrides: Partial<ExtendedUserProfile> = {}): ExtendedUserProfile {
  return {
    id: "p1", userId: "u1", tenantId: "t1", tenantName: "T",
    fullName: "Target", email: "t@x.com", role: "guard", address: "a",
    username: "target", phone: "5551", phoneType: null, status: "active",
    userGroupIds: [], userGroups: [], observations: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
    canEdit: true, canDeactivate: true,
    ...overrides,
  };
}

const groups: UserGroup[] = [
  { id: "g1", name: "Admin" },
  { id: "g2", name: "Pool" },
];

describe("UserForm user group single-select", () => {
  it("renders a single Select trigger for the group (no checkboxes)", () => {
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: ["g1"] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("form.userGroup")).toBeInTheDocument();
  });

  it("pre-selects the first userGroupId (displays its name)", () => {
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: ["g2"] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Pool")).toBeInTheDocument();
  });

  it("users with multiple existing groups pre-select the first", () => {
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: ["g1", "g2"] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.queryByText("Pool")).toBeNull();
  });

  it("submitting with no selection sends userGroupIds as []", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: [] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0][0] as { userGroupIds: string[] };
    expect(payload.userGroupIds).toEqual([]);
  });

  it("submitting with a pre-selected group sends userGroupIds as [id]", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: ["g2"] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0][0] as { userGroupIds: string[] };
    expect(payload.userGroupIds).toEqual(["g2"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `pnpm --filter web test -- user-form-user-group`
Expected: FAIL — currently `role="checkbox"` elements exist, and the label text is `form.userGroups` (plural), not `form.userGroup`.

- [ ] **Step 3: Modify `user-form.tsx` — imports.**

Remove `Checkbox` from the `@ramcar/ui` import at line 5. Replace:

```tsx
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Checkbox,
} from "@ramcar/ui";
```

with:

```tsx
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@ramcar/ui";
```

- [ ] **Step 4: Modify `user-form.tsx` — remove the `toggleUserGroup` helper.**

Delete the block (currently lines 159-166):

```tsx
  const toggleUserGroup = (groupId: string) => {
    updateField(
      "userGroupIds",
      formData.userGroupIds.includes(groupId)
        ? formData.userGroupIds.filter((id) => id !== groupId)
        : [...formData.userGroupIds, groupId],
    );
  };
```

- [ ] **Step 5: Modify `user-form.tsx` — replace the User Groups field.**

Replace the block (currently lines 350-366):

```tsx
      <div className="space-y-2">
        <Label>{t("form.userGroups")}</Label>
        <div className="flex flex-wrap gap-3">
          {userGroups.map((group) => (
            <label
              key={group.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={formData.userGroupIds.includes(group.id)}
                onCheckedChange={() => toggleUserGroup(group.id)}
              />
              <span className="text-sm">{group.name}</span>
            </label>
          ))}
        </div>
      </div>
```

with:

```tsx
      <div className="space-y-2">
        <Label>{t("form.userGroup")}</Label>
        <Select
          value={formData.userGroupIds[0] ?? "none"}
          onValueChange={(v) =>
            updateField("userGroupIds", v === "none" ? [] : [v])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("form.selectUserGroup")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("form.noUserGroup")}</SelectItem>
            {userGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
```

- [ ] **Step 6: Remove the unused i18n keys.**

In `packages/i18n/src/messages/en.json`, inside `"users": { "form": { ... } }`, delete the two lines:

```json
      "userGroups": "User Groups",
```

and

```json
      "selectUserGroups": "Select user groups",
```

In `packages/i18n/src/messages/es.json`, inside `"users": { "form": { ... } }`, delete the two lines:

```json
      "userGroups": "Grupos de Usuario",
```

and

```json
      "selectUserGroups": "Seleccionar grupos",
```

**Important:** trailing commas — after deletion, ensure the remaining JSON is still valid (the preceding line may need its trailing comma kept; the line AFTER the deleted pair will now be the last or followed by more).

- [ ] **Step 7: Verify JSON parses.**

Run: `node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('packages/i18n/src/messages/es.json','utf8'));console.log('ok')"`
Expected: `ok`.

- [ ] **Step 8: Confirm no code still references the removed keys.**

Run Grep:

```
Grep pattern: form\\.userGroups|form\\.selectUserGroups
Glob: **/*.{ts,tsx}
```

Expected: no matches in code files.

- [ ] **Step 9: Run the user-group test.**

Run: `pnpm --filter web test -- user-form-user-group`
Expected: PASS, 5 assertions green.

- [ ] **Step 10: Run the full web test suite.**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 11: Typecheck.**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 12: Commit.**

```bash
git add apps/web/src/features/users/components/user-form.tsx \
        apps/web/src/features/users/__tests__/user-form-user-group.test.tsx \
        packages/i18n/src/messages/en.json \
        packages/i18n/src/messages/es.json
git commit -m "feat(web/users): single-select user group dropdown"
```

---

### Task 13: Final verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck.**

Run: `pnpm typecheck`
Expected: PASS across all workspaces.

- [ ] **Step 2: Full lint.**

Run: `pnpm lint`
Expected: PASS. If any warnings appear in touched files, fix them now.

- [ ] **Step 3: Full test suite.**

Run: `pnpm test`
Expected: PASS across all workspaces.

- [ ] **Step 4: Manual smoke test checklist (apps/web).**

Start `pnpm dev` and open the `catalogs/users` page as an admin. Confirm:
- Search input is visible in the filters bar.
- Pressing `b` outside an input focuses the search field.
- ArrowDown/ArrowUp move a row highlight (background tint).
- Pressing Enter on a highlighted editable row navigates to `/{locale}/catalogs/users/{id}/edit`.
- Clicking an editable row navigates; clicking the `⋯` menu button does NOT navigate.
- Inactive users render with reduced opacity.
- The Status column renders a badge.
- Editing your own admin profile: Role dropdown is disabled + hint text appears.
- Editing any user: User Groups field is a dropdown with the current group pre-selected; "No group" clears it.

If any of these fail, fix before completing the plan.

- [ ] **Step 5: Review touched files for leftover debug code.**

Run Grep:

```
Grep pattern: console\\.(log|debug)
Path: apps/web/src/features/users packages/features/src/shared/hooks
```

Expected: no matches. Remove any found.

- [ ] **Step 6: No commit — this is the final checkpoint.** If any fix was needed in Step 4 or 5, commit those fixes with a descriptive message tied to the defect found.

---

## Self-review

### Spec coverage
- Generalize the hook → Task 1.
- Migrate all 5 callers → Tasks 2–6.
- Verify migration → Task 7.
- i18n additions → Task 8.
- Status column → Task 9.
- Keyboard nav + row click + highlight + opacity + B hotkey + actions stopPropagation + ref forwarding → Task 10.
- Admin self-role lock → Task 11.
- User Groups single-select + i18n removals → Task 12.
- Full verification → Task 13.

Every requirement in the spec maps to at least one task.

### Placeholder scan
No "TBD", "TODO", "similar to Task N", or "add appropriate error handling" phrasing — each task contains the actual code to write.

### Type consistency
- `UseKeyboardNavigationOptions<T>` shape is defined once in Task 1 and used verbatim in Tasks 2–6 and Task 10.
- `items`, `onSelectItem`, `disabled` naming matches across every caller.
- `roleLocked` is defined in Task 11 and referenced in its own `handleSubmit` modification; it does not appear elsewhere.
- `formData.userGroupIds[0] ?? "none"` matches `v === "none" ? [] : [v]` round-trip.
- `"status"` column position: both `users-table-columns.test.tsx` (existing, unmodified) and Task 9's insertion agree — between `"phone"` and `"user_groups"`.

Nothing else introduces new types or method signatures.

---

## Open questions

None.
