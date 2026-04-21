# Quickstart: Users Form Sidebar Migration

**Feature**: `015-users-form-sidebar`
**Audience**: Developer picking up the implementation task
**Estimated time**: 1–2 hours (one person, focused) including tests

This is a presentation refactor with zero backend or schema changes. The dev loop is tight. Follow the order below to keep tests green at every checkpoint.

---

## 0. Prerequisites

- Be on branch `015-users-form-sidebar` (or a child of it).
- `pnpm install` is current.
- Local Supabase is running if you want to test the golden path end-to-end: `pnpm db:start`.
- Know which user you'll log in as (at least one `admin`-role test user exists in your local DB).

Sanity checks before touching code:

```bash
pnpm --filter @ramcar/web typecheck
pnpm --filter @ramcar/web test --run apps/web/src/features/users
pnpm --filter @ramcar/web lint
```

All three should pass on the current branch (they do — the branch inherits the passing `865f121` users-catalog refactor plus the `2a3e3dd` animation fix).

---

## 1. Build the new component (isolated, test-first)

1. Create `apps/web/src/features/users/components/user-sidebar.tsx`:
   - Composition: `<Sheet open onOpenChange>` → `<SheetContent side="right">` → `<SheetHeader><SheetTitle>` → mode-branch body.
   - Shape from `data-model.md §2.2`.
   - Reuse (copy the conventions from) `packages/features/src/visitors/components/visit-person-sidebar.tsx` — width classes, padding, header structure.
2. Create `apps/web/src/features/users/__tests__/user-sidebar.test.tsx` covering the four state transitions from `data-model.md §2.4`.
3. Run `pnpm --filter @ramcar/web test --run user-sidebar.test.tsx`. All pass.

**Check-in signal**: New component file compiles, new test file passes, existing tests still pass.

---

## 2. Wire `UsersTable` to the Sheet

1. Edit `apps/web/src/features/users/components/users-table.tsx`:
   - Remove `useRouter` import and the `router` usage.
   - Add local state: `sidebarOpen`, `sidebarMode: "create" | "edit"`, `selectedUserId: string | undefined`.
   - Replace `router.push(\`/${locale}/catalogs/users/${u.id}/edit\`)` in `handleEdit` with `setSelectedUserId(u.id); setSidebarMode("edit"); setSidebarOpen(true)`.
   - Replace the "Create User" button's `onClick={() => router.push(...)}` with `() => { setSelectedUserId(undefined); setSidebarMode("create"); setSidebarOpen(true) }`.
   - Render `<UserSidebar open={sidebarOpen} mode={sidebarMode} userId={selectedUserId} onClose={() => setSidebarOpen(false)} />` at the end of the JSX.
   - Pass `disabled: sidebarOpen` into the existing `useKeyboardNavigation` call — matches `VisitorsView` and `ResidentsPageClient`.
2. Drop the now-unused `locale` prop if nothing else in `UsersTable` needs it (it was only used to build the navigation URLs). Verify the upstream `page.tsx` no longer needs to pass it.

**Check-in signal**: `pnpm --filter @ramcar/web typecheck` is still green.

---

## 3. Delete the legacy routes and clients

1. `rm apps/web/src/app/[locale]/(dashboard)/catalogs/users/new/page.tsx`
2. `rm apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]/edit/page.tsx`
3. `rmdir apps/web/src/app/[locale]/(dashboard)/catalogs/users/new` (empty)
4. `rmdir apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]/edit` (empty)
5. `rmdir apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]` (empty)
6. `rm apps/web/src/features/users/components/create-user-page-client.tsx`
7. `rm apps/web/src/features/users/components/edit-user-page-client.tsx`

Grep to confirm the cleanup is total:

```bash
# All of these must return zero matches in apps/web/src:
grep -r "catalogs/users/new" apps/web/src
grep -r "catalogs/users/\[id\]/edit" apps/web/src
grep -rE "(Create|Edit)UserPageClient" apps/web/src
```

---

## 4. Update the existing interaction test

Edit `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx`:

- Remove the `mockRouterPush` imports and the two `expect(mockRouterPush).toHaveBeenCalledWith(...)` assertions.
- After a row click / row-action "Edit" click, assert that a Sheet with the expected title is open. Options:
  - **(a)** Query for `role="dialog"` and an `aria-labelledby`-resolved title text equal to the translated `users.editUser` string (the test stubs `useTranslations` to return the key, so asserting `users.editUser` works).
  - **(b)** Pass a test-only `onOpenEdit` prop stub in if the table is refactored to forward the handler upward. Prefer (a) unless the implementer chose to hoist state.
- Run `pnpm --filter @ramcar/web test --run users-table-interaction`. Confirm pass.

**Rules**:
- Keep the test count roughly the same — this is a like-for-like assertion swap, not a rewrite.
- Do NOT delete the "navigating is not allowed" surface-area — replace it with "the Sheet opens in the correct mode for this row".

---

## 5. i18n keys (optional — Phase 0 recommendation)

If following R-007 of the research, add to `packages/i18n/src/messages/en.json` under the existing `"users"` block:

```json
"sidebar": {
  "createTitle": "Create User",
  "editTitle": "Edit User"
}
```

Mirror into `es.json`:

```json
"sidebar": {
  "createTitle": "Crear Usuario",
  "editTitle": "Editar Usuario"
}
```

Use `t("users.sidebar.createTitle")` / `t("users.sidebar.editTitle")` inside `UserSidebar`. Leave the existing `users.createUser` (button label) and `users.editUser` (row-action label) keys unchanged.

If skipping the namespace addition: use `t("users.createUser")` / `t("users.editUser")` verbatim as Sheet titles. Works, but diverges from Visitors/Providers convention.

Run `pnpm check:shared-features` and `pnpm --filter @ramcar/i18n typecheck` (if present) after changes.

---

## 6. Final verification

```bash
pnpm --filter @ramcar/web typecheck
pnpm --filter @ramcar/web lint
pnpm --filter @ramcar/web test --run
pnpm --filter @ramcar/i18n typecheck    # only if §5 was done
```

Start the dev server and manually walk the golden path:

```bash
pnpm --filter @ramcar/web dev
# → open http://localhost:3000/en/catalogs/users
```

Checklist (SC-002, SC-005 from spec):

- [ ] "Create User" button opens a right-side Sheet. URL does not change.
- [ ] Filling the form and clicking "Create" closes the Sheet, toasts success, and shows the new row.
- [ ] Clicking an editable row opens the Sheet in edit mode with fields pre-populated. URL does not change.
- [ ] Editing a field and clicking "Save" closes the Sheet, toasts success, and the row shows the new values.
- [ ] Pressing Esc on an open Sheet closes it without saving; draft is preserved — reopen and the field content remains.
- [ ] Clicking the form's "Cancel" button closes the Sheet AND clears the draft — reopening shows empty fields.
- [ ] Manually visiting `/en/catalogs/users/new` produces a 404-style response (not a form page).
- [ ] Manually visiting `/en/catalogs/users/<some-id>/edit` produces a 404-style response.
- [ ] With `resident` role: "Create User" button is not visible, rows are not editable, pressing Enter on a row does nothing.
- [ ] Animation: Sheet slides in from the right; Sheet slides out on close. (If it "pops" without motion, `tw-animate-css` may have regressed — investigate.)

---

## 7. Commit + PR

Follow Conventional Commits (constitution §Development Workflow & Quality Gates). Example:

```bash
git add -u
git add apps/web/src/features/users/components/user-sidebar.tsx
git add apps/web/src/features/users/__tests__/user-sidebar.test.tsx
git add packages/i18n/src/messages/en.json packages/i18n/src/messages/es.json   # if §5
git commit -m "refactor(users): migrate new/edit forms to right-side Sheet

Replace apps/web /catalogs/users/new and /catalogs/users/[id]/edit
routes with a single right-side Sheet on the users catalog list page,
matching the Visitors/Providers/Residents pattern. Form component and
API hooks are reused verbatim.

Closes: spec 015-users-form-sidebar"
```

Do NOT push until the user asks — per repo convention (memory: `feedback_no_auto_commit.md`).

---

## Rollback plan

If a reviewer wants the changes reverted quickly:

- `git revert <commit-sha>` restores the deleted routes and clients.
- Drafts in `localStorage` under `ramcar-draft:user-create` / `ramcar-draft:user-edit-<id>` survive because the keys were never renamed.
- No DB or API rollback is needed — nothing on the backend changed.
