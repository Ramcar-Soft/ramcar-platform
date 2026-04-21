# Phase 0 — Research: Users Form Sidebar Migration

**Feature**: `015-users-form-sidebar`
**Status**: Complete — no NEEDS CLARIFICATION remaining
**Date**: 2026-04-21

All items below were resolvable by reading the existing codebase (the Visitors, Providers, and Residents features already implement the right-side Sheet pattern this feature copies). No external research was required.

---

## R-001 — Sidebar mode model

**Decision**: Use `mode: "create" | "edit"`. No `"view"` mode.

**Rationale**:
- Users catalog has no "view user details" surface today. Clicking an editable row navigates directly to the edit page; clicking a non-editable row does nothing. The Sheet should preserve that one-to-one mapping.
- Visitors uses `"view" | "create" | "edit"` because a visitor row has ambient data (recent access events, vehicles, images) that a guard needs to see before logging a new event. Users has no equivalent context — the form IS the interaction.
- Keeping the mode enum two-valued removes a state that can never be entered and therefore cannot be tested.

**Alternatives considered**:
- `"view" | "create" | "edit"` — rejected because "view" has no UI and no product requirement today. If a future feature adds a user-profile view, the enum can be widened then; the cost of the widening is one union member and one `mode ===` branch.
- `boolean isEdit` — rejected because it doesn't extend to a third state cleanly and it conflicts with the convention set by Visitors/Providers.

---

## R-002 — Edit-mode data fetching

**Decision**: `useGetUser(id)` is called inside `UserSidebar` with `enabled: Boolean(open && mode === "edit" && userId)`.

**Rationale**:
- `useGetUser` today is called from `EditUserPageClient` unconditionally (via its `enabled: !!id` guard). In the Sheet context the hook will be co-located with the Sheet, so it should only fire when the Sheet is actually showing the edit form.
- TanStack Query caches per queryKey (`["users", id]`) — closing and re-opening the Sheet for the same user reuses the cache and avoids a redundant network call. This is better than the page-based flow, which triggered a fresh fetch on every navigation because the component unmounted.
- Opening the Sheet in `create` mode must NOT fetch a user — so a single boolean `enabled` guard is sufficient.

**Alternatives considered**:
- Call `useGetUser` in `UsersTable` and pass `initialData` down — rejected because it would force the table to know about the edit lifecycle and would defeat the query key sharing across mounts.
- Prefetch on row hover — rejected as premature optimization; edit-fetch p95 is already fast enough that the loading state inside the Sheet is acceptable for the internal app.

---

## R-003 — Draft persistence key parity

**Decision**: Keep the existing keys `user-create` and `user-edit-<id>` exactly as defined inside `UserForm`.

**Rationale**:
- `UserForm` already computes `persistenceKey = isEdit ? \`user-edit-${initialData?.id}\` : "user-create"` internally. Because the Sheet wraps `UserForm` without changing its props, the keys remain identical post-migration.
- This means localStorage drafts authored by users on the page-based UI will be seamlessly restored on the Sheet-based UI on the next deploy. No cache version bump needed.
- The `excludeFields: ["password", "confirmPassword"]` behavior is also preserved verbatim.

**Alternatives considered**:
- Prefix keys with `sidebar-` to disambiguate from page-based drafts — rejected because there will be only one form surface after the migration, so disambiguation is unnecessary and migration would require a one-time copy script.

---

## R-004 — `onCancel` semantics inside the Sheet

**Decision**: `UserForm`'s Cancel button calls `discardDraft()` then invokes the Sheet's `onClose()`. Dismissal paths (Esc, overlay click, X button) call `onClose()` directly — the draft survives.

**Rationale**:
- Matches the mental model established in Visitors: explicit cancel = "throw this away", dismiss = "I'll be back".
- `useFormPersistence` handles the auto-save; there is no code to write for the dismiss path beyond wiring `open` to `onOpenChange`.
- This is *not* a behavior change — the page-based form already called `discardDraft()` inside the Cancel button's click handler (see `user-form.tsx:387–392`). We just wire the same behavior to a Sheet close instead of a `router.push`.

**Alternatives considered**:
- Confirm-on-dismiss modal ("You have unsaved changes") — rejected because the internal audience is trusted and `useFormPersistence` already auto-saves. Adding a prompt would train users to dismiss warnings by rote, reducing its value elsewhere (e.g., destructive deletes).

---

## R-005 — Route removal strategy

**Decision**: Delete `apps/web/src/app/[locale]/(dashboard)/catalogs/users/new/page.tsx` and `apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]/edit/page.tsx` (and their empty parent directories `new/` and `[id]/edit/` and the otherwise-empty `[id]/`). Do NOT add a redirect shim.

**Rationale**:
- The user explicitly said "sharing direct links is not necessary atm" and the app is internal. There are no external bookmarks to preserve.
- Leaving a redirect would mask stale internal links (docs, Slack messages, browser history) that should be fixed rather than auto-healed. Next.js 16's default 404 makes those links visibly broken so they get cleaned up.
- No search-engine indexing concerns — the dashboard is behind auth.

**Alternatives considered**:
- Temporary redirects for one release cycle — rejected because the audience is small and reachable; a one-line notice in the release channel is enough.
- Keep routes as thin re-exports that open the Sheet — rejected because it re-introduces two code paths for the same action, which is exactly what this feature is removing.

---

## R-006 — Role-gate defense in depth

**Decision**: Remove the server-side role check from the deleted `new/page.tsx` without re-adding it anywhere. Rely on (a) the existing UI conditional (`user?.role === "super_admin" || user?.role === "admin"`) that hides the "Create User" button, (b) the existing `canEdit` flag on each row that gates the edit click, (c) the NestJS `JwtAuthGuard + RolesGuard` on `POST /api/users` and `PUT /api/users/:id`.

**Rationale**:
- The removed redirect in `new/page.tsx` (`if role !== "super_admin" && role !== "admin" redirect`) was a UX guard for users who somehow reached the route — e.g., via a stale bookmark or URL-hack — to bounce them back. It was NOT an authorization check; the API guards are.
- Constitution VI says: "Frontend MUST hide UI elements the current role cannot access, but MUST NOT rely on UI hiding as the sole authorization mechanism." The Sheet continues to hide the button for non-privileged roles, and the API guard remains the sole authorization mechanism. Both conditions of the principle are met.
- There is no new attack surface: a non-admin who fabricates a POST to `/api/users` would have been rejected by the API guard before and is still rejected now.

**Alternatives considered**:
- Add a client-side check in `UserSidebar` that refuses to open in `create` mode if the current role is not admin — rejected as dead code. The button that triggers create mode is already hidden for non-admins; no code path can reach it without also bypassing the button conditional (which means they've opened a dev console and are issuing React commands — at which point the API guard is the load-bearing one anyway).

---

## R-007 — i18n key naming

**Decision**: Add a `users.sidebar` namespace to `packages/i18n/src/messages/{en,es}.json` with keys `createTitle`, `editTitle`, and (optionally) `loading`. Keep the existing `users.createUser`, `users.editUser`, `users.errorLoading` keys for button labels and error banner parity.

**Rationale**:
- Parity with Visitors (`visitPersons.sidebar.{registerTitle, editTitle, title, visitsResident}`) and Providers (`providers.sidebar.{registerTitle, editTitle, title, visitsResident}`). A developer reading `VisitPersonSidebar` and then `UserSidebar` immediately recognizes the namespace convention.
- Button labels (`Create User`) are semantically different from section titles (`Create User` as a Sheet-header title) even when the English text happens to match — translation may diverge in Spanish or future locales. Separating keys costs nothing now and avoids retrofit later.

**Alternatives considered**:
- Reuse `users.createUser` / `users.editUser` as Sheet titles — viable but diverges from the other modules' patterns.
- Introduce the full `users.sidebar.{registerTitle,editTitle,title,visitsResident}` shape to exactly mirror Visitors — rejected because `title` (view mode) and `visitsResident` (visitor-specific) do not apply to users.

**Fallback**: if message-catalog changes cross over with another in-flight branch and cause a merge conflict, `UserSidebar` can initially reuse `users.createUser` / `users.editUser` and a follow-up PR introduces the sidebar namespace. This reduces scope risk.

---

## R-008 — Testing strategy

**Decision**:

1. **Update** `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx` — replace `router.push` assertions with Sheet-open assertions. Currently it asserts `mockRouterPush).toHaveBeenCalledWith("/en/catalogs/users/p1/edit")` (two places — row click and row-actions Edit menu). After the change, these tests instead render `UsersTable` with a spy passed to the new `onOpenEdit` / `onOpenCreate` props (or, if the sidebar state is kept internal to `UsersTable`, they assert that a `role="dialog"` with `aria-label="users.editUser"` becomes present after the click).
2. **Add** `apps/web/src/features/users/__tests__/user-sidebar.test.tsx` covering:
   - Create mode: renders `UserForm` with `mode="create"`, no `initialData`, not loading.
   - Edit mode + loading: renders a spinner, no `UserForm`.
   - Edit mode + error: renders the error banner using `users.errorLoading`.
   - Edit mode + loaded: renders `UserForm` with `mode="edit"` and `initialData` equal to the fetched user.
   - Close: Esc → `onClose` fires; form's Cancel button → `discardDraft` + `onClose` fire.
3. **Leave unchanged**: `user-form-role-lock.test.tsx`, `user-form-user-group.test.tsx`, `users-table-columns.test.tsx`, `user-status-badge.test.tsx`, `hooks.test.ts` — these test the form/column/hook surface directly, which the Sheet wrapper does not touch.
4. **Optional Playwright E2E** at `apps/web/e2e/users.spec.ts` covering the golden path (list → create via Sheet → edit via Sheet → table reflects changes) can be added but is not required for this feature; the unit + integration coverage above plus manual QA per the quickstart is sufficient for an internal app.

**Rationale**:
- The current tests already decouple form logic from navigation, so the blast radius is narrow.
- Testing the `UserSidebar` directly pins the new contract; testing the `UsersTable` at the integration level pins the wiring.

**Alternatives considered**:
- Full Playwright coverage as the primary verification — rejected because it's slower to iterate on during development; Vitest tests give a tight inner loop.

---

## R-009 — Sheet open/close animation (dependency)

**Decision**: No action required. The current branch already includes commit `2a3e3dd fix: install tw-animate-css to restore sheet slide/fade animations`, which restored the animation utilities (`slide-in-from-right`, `slide-out-to-right`, `fade-in-0`, `fade-out-0`) that the `@ramcar/ui` `SheetContent` component depends on.

**Rationale**:
- Without `tw-animate-css`, `data-[state=open]:slide-in-from-right` resolves to no CSS, producing a popped-in Sheet with no motion. That would fail SC-005 (visual/interaction parity with Visitors/Providers).
- Because the fix is already on this branch's ancestry, the implementation phase inherits it at no cost.

**Alternatives considered**:
- Roll the animation fix into this feature — rejected because the fix was already committed separately, which is good hygiene. This plan simply notes the dependency.

---

## Summary of downstream implications

No Phase 0 decision introduces:

- New dependencies
- New API routes
- New database columns or migrations
- New Supabase client calls outside the allow-list (auth, realtime)
- New cross-feature imports
- New shared-package exports
- New workspace packages

This feature is unusually low-risk, which Phase 0 confirms. Phase 1 (Design & Contracts) formalizes the new internal `UserSidebar` prop contract and re-ratifies the unchanged API contracts.
