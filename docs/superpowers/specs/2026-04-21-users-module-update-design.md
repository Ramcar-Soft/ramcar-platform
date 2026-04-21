# Users Catalog Module Update

**Date:** 2026-04-21
**Status:** Design approved; implementation plan pending.
**Scope area:** `apps/web/src/features/users/`, plus one cross-cutting hook consolidation in `packages/features/src/shared/hooks/` with 5 caller migrations.

## Problem

The `catalogs → users` module (web-only) lags the visitor/resident/provider access-event pattern on three axes:

1. **Table ergonomics.** No keyboard navigation, no `B` hotkey to focus search, no visual signal that a user is deactivated, no Status column.
2. **Edit-form constraints.** An admin editing their own profile can still open the Role dropdown (even though the assignable-roles list doesn't include `admin`, the Select appears actionable). The User Groups field uses a checkbox list — inconsistent with the rest of the form, which uses dropdowns.
3. **Hook duplication.** The `useKeyboardNavigation` hook that powers the access-event pattern exists in **five** near-identical copies, each hard-typed to a concrete domain entity (`VisitPerson` × 3, `ExtendedUserProfile` × 2). Users cannot reuse it without a sixth copy.

## Goal

Bring the users catalog to parity with the access-event UX, and consolidate `useKeyboardNavigation` into one generic hook during the same change.

## Scope

### In scope

- Generalize `useKeyboardNavigation` to `<T>`, move it to `packages/features/src/shared/hooks/`, migrate all 5 existing callers.
- Users table: keyboard nav, `B` hotkey, row click/Enter → edit route, new Status column, `opacity-60` styling for inactive users.
- Users edit form: lock Role dropdown when an admin is editing their own profile; replace User Groups checkbox list with a single-select dropdown that pre-selects the current group.
- i18n additions (EN + ES).
- New tests for the users changes; verify existing visitor tests still pass after hook swap.

### Out of scope (explicit non-goals)

- **No DB migration.** `profiles.user_group_ids` / the `user_groups_profile` join stay as an array. Single-group semantics are UI-only.
- **No API changes.** The users endpoint already returns `canEdit` / `canDeactivate` and already accepts status sort.
- **No desktop work.** Users is a web-only feature per CLAUDE.md.
- **No read-only user-detail view.** Rows where `canEdit === false` are highlightable but Enter/click are no-ops.
- **No multi-select combobox.** User Groups becomes a plain `Select` with one group per user.
- **No rename of `users.columns.userGroups` / `users.form.userGroups` i18n keys.** Form label switches to a new singular key; column header text is unchanged.
- **No cleanup sweep of unrelated duplicated code.** The hook consolidation is the only cross-cutting refactor in this spec.

## Design

### 1. Generic `useKeyboardNavigation`

**New file:** `packages/features/src/shared/hooks/use-keyboard-navigation.ts`.

Per the shared-package rules in CLAUDE.md, this file has no `"use client";` directive, no `next/*` imports, and no Electron globals. It runs in the browser in both host apps.

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

Export from `packages/features/src/shared/index.ts`.

**Caller migration.** All five existing copies are byte-identical except for the domain type and the `persons`/`residents` + `onSelectPerson`/`onSelectResident` rename, plus `sidebarOpen` → `disabled`. Migration is a mechanical rename:

| Caller | Import change | Prop rename |
|---|---|---|
| `packages/features/src/visitors/components/visitors-view.tsx` | import from `../../shared/hooks/use-keyboard-navigation` | `persons` → `items`, `onSelectPerson` → `onSelectItem`, `sidebarOpen` → `disabled` |
| `apps/web/src/features/providers/components/providers-page-client.tsx` | import from `@ramcar/features/shared` | same |
| `apps/desktop/src/features/providers/components/providers-page-client.tsx` | import from `@ramcar/features/shared` | same |
| `apps/web/src/features/residents/components/residents-page-client.tsx` | import from `@ramcar/features/shared` | `residents` → `items`, `onSelectResident` → `onSelectItem`, `sidebarOpen` → `disabled` |
| `apps/desktop/src/features/residents/components/residents-page-client.tsx` | import from `@ramcar/features/shared` | same |

Delete the five local hook files after the callers are re-pointed:
- `packages/features/src/visitors/hooks/use-keyboard-navigation.ts`
- `apps/web/src/features/providers/hooks/use-keyboard-navigation.ts`
- `apps/desktop/src/features/providers/hooks/use-keyboard-navigation.ts`
- `apps/web/src/features/residents/hooks/use-keyboard-navigation.ts`
- `apps/desktop/src/features/residents/hooks/use-keyboard-navigation.ts`

### 2. Users table

All files in `apps/web/src/features/users/components/`.

**2.1 Forward the search ref.** `UserFiltersBar` becomes `forwardRef<HTMLInputElement, UserFiltersProps>` and forwards the ref to its search `<Input>`. `UsersTable` holds `const searchInputRef = useRef<HTMLInputElement>(null)` and passes it down.

**2.2 Keyboard-nav state.** In `UsersTable`:

```ts
const [highlightedIndex, setHighlightedIndex] = useState(-1);
const highlightedRowRef = useRef<HTMLTableRowElement>(null);

useEffect(() => {
  highlightedRowRef.current?.scrollIntoView({ block: "nearest" });
}, [highlightedIndex]);

// Reset when filters change or data refetches
useEffect(() => {
  setHighlightedIndex(-1);
}, [filters, data?.data]);

useKeyboardNavigation<ExtendedUserProfile>({
  searchInputRef,
  disabled: !!statusDialogUser,
  items: data?.data,
  highlightedIndex,
  setHighlightedIndex,
  onSelectItem: (u) => { if (u.canEdit) handleEdit(u); },
});
```

**2.3 Row render.**

```tsx
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
    onClick={() => { if (u.canEdit) handleEdit(u); }}
  >
    {columns.map((col) => (
      <TableCell
        key={col.key}
        onClick={col.key === "actions" ? (e) => e.stopPropagation() : undefined}
      >
        {col.render(u)}
      </TableCell>
    ))}
  </TableRow>
))
```

Rows where `canEdit === false` remain highlightable (for consistency), but both Enter and click are no-ops and the `cursor-pointer` class is omitted. Clicks on the actions cell stop propagation so the `⋯` menu doesn't also trigger row navigation.

**2.4 Status column.** Add to `getUserColumns` between `user_groups` and `actions`:

```ts
{
  key: "status",
  header: t("columns.status"),
  sortable: true,
  render: (user) => <UserStatusBadge status={user.status} />,
}
```

`<UserStatusBadge>` already exists (`components/user-status-badge.tsx`) and the `users.columns.status` / `users.status.active` / `users.status.inactive` translation keys are already present.

### 3. Edit form

All in `apps/web/src/features/users/components/user-form.tsx`.

**3.1 Admin self-role lock.**

```ts
const isSelf = mode === "edit" && initialData?.userId === currentUser?.userId;
const roleLocked = isSelf && actorRole === "admin";
```

- `super_admin` editing self → unlocked (super_admin is in their own assignable list).
- `admin` editing self → locked; render disabled `<Select>` + hint text `t("form.roleLockedSelf")`.
- `admin` editing another user → unlocked; list is `["guard", "resident"]` as today.

On submit, strip `role` from the submitted payload when `roleLocked` is true (defensive — the API already enforces via RBAC).

**3.2 User Groups single-select.** Replace the checkbox block and drop the `toggleUserGroup` helper + `Checkbox` import:

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
      {userGroups.map((g) => (
        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

- `formData.userGroupIds` stays `string[]` — the UI just treats it as a one-slot array.
- Pre-selection comes from the existing initializer (`initialData?.userGroupIds ?? []`); the first element becomes the current value.
- Existing users with >1 group pre-select the first; saving overwrites the rest.
- The shadcn `Select` can't hold an empty string value, so `"none"` is used as the sentinel.

**3.3 Column rendering.** `user_groups` column is unchanged. With one group it renders that group's name; with zero it renders `—`.

### 4. i18n

In `packages/i18n/src/messages/en.json` and `es.json`, under `"users"`:

**Added:**

| Key | EN | ES |
|---|---|---|
| `form.userGroup` | `User Group` | `Grupo` |
| `form.selectUserGroup` | `Select a group` | `Selecciona un grupo` |
| `form.noUserGroup` | `No group` | `Sin grupo` |
| `form.roleLockedSelf` | `You cannot change your own role.` | `No puedes cambiar tu propio rol.` |

**Removed (no longer referenced):**

| Key |
|---|
| `form.userGroups` |
| `form.selectUserGroups` |

**Unchanged (still referenced):**

`columns.userGroups` (column header text stays "Groups" / "Grupos"), `columns.status`, `status.active`, `status.inactive`.

## Tests

### New

- `apps/web/src/features/users/__tests__/users-table-keyboard-nav.test.tsx`
  - ArrowDown / ArrowUp move highlight with clamping.
  - Enter on a highlighted editable row calls `router.push` to `/{locale}/catalogs/users/{id}/edit`.
  - Enter on a highlighted non-editable row (`canEdit: false`) does nothing.
  - `B` from outside an input focuses the search input.
  - Highlight resets to `-1` when filters change.
- `apps/web/src/features/users/__tests__/users-table-status.test.tsx`
  - Inactive users render the row with `opacity-60`.
  - Status column renders `<UserStatusBadge>` with the correct variant.
- `apps/web/src/features/users/__tests__/user-form-role-lock.test.tsx`
  - Admin editing self: Role `<Select>` is disabled + hint text is shown.
  - Admin editing another user: Role `<Select>` is enabled.
  - `super_admin` editing self: Role `<Select>` is enabled.
  - Submit payload when locked does not include `role`.
- `apps/web/src/features/users/__tests__/user-form-user-group.test.tsx`
  - Pre-selects the current group in the dropdown.
  - Selecting "None" clears `userGroupIds` to `[]`.
  - Picking a group submits `[groupId]`.
  - Users with multiple existing groups pre-select the first.

### Updated

- `packages/features/src/visitors/__tests__/visitors-view-slots.test.tsx` — import path only; no assertion change.
- `packages/features/src/visitors/__tests__/visitors-view-draft.test.tsx` — same.

### Regression surface

- All five callers of the old hook must still compile and behave identically after the rename.
- `VisitorsView` keyboard-nav paths must still pass existing tests.

## Edge cases

- **Loading / empty data.** `items` is `undefined` during loading and `[]` on empty; the hook guards both (`items?.length ?? 1`).
- **Highlight stale after pagination or filter change.** The `useEffect` keyed on `[filters, data?.data]` resets it to `-1`.
- **Confirm-status dialog open.** `disabled: !!statusDialogUser` pauses hotkeys so `Enter` inside the dialog doesn't also navigate the table.
- **Row click vs. actions menu.** The actions cell stops click propagation so the `⋯` menu doesn't trigger row navigation.
- **Admin editing another admin.** `canEdit` in `users.service.ts` uses `>=`, so admin-admin rows are editable. The assignable-roles list for an admin is `["guard", "resident"]`, so an admin editing a peer admin sees a Role `<Select>` whose options don't include `admin` itself — they can only demote. Not changed by this spec; noted so maintainers don't misread the self-lock as covering this case.
- **Role lock + form persistence.** `useFormPersistence` may restore a draft containing a `role` value for a self-edit. The Select renders the restored value but is disabled, and submission strips `role` before hitting the API.
- **User-group dropdown with no groups available.** The `<Select>` still renders the "None" option, so the field is usable; picking "None" submits `[]`.

## Risks / trade-offs

- **UI-only single-group semantics** mean users with multiple pre-existing groups will silently lose the secondary groups on the next save. Acceptable per the decision captured above; documented here so future maintainers don't assume the DB model changed.
- **Consolidating the hook** touches 10 files across three apps and the shared package. Mitigation: the rename is mechanical and mostly covered by the existing `VisitorsView` tests plus the new users tests.
- **Generic-hook API break.** Renaming `sidebarOpen` → `disabled` and `persons`/`residents` → `items` is breaking at the call-site level. All 5 callers are updated in the same PR, so no intermediate state.

## Rollout

- No feature flag.
- No DB migration.
- No backend deploy.
- Ships as a single PR on branch `dev` → `main`.

## Open questions

None at the time of writing.
