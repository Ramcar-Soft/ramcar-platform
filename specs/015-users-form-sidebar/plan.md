# Implementation Plan: Users Catalog — Migrate New/Edit Forms to Right-Side Sheet

**Branch**: `015-users-form-sidebar` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-users-form-sidebar/spec.md`

## Summary

Replace the page-based user create/edit flows in `apps/web` with a right-side `Sheet` panel, matching the pattern already used by Visitors, Providers, and Residents.

Today, the users catalog (`/<locale>/catalogs/users`) navigates away to `/<locale>/catalogs/users/new` or `/<locale>/catalogs/users/[id]/edit` to render a `UserForm`. After this change, the list page hosts a single `Sheet` that toggles between create and edit modes without changing the URL. The two dedicated route files and their client wrappers are deleted; the `UserForm` component and the `useCreateUser` / `useUpdateUser` / `useGetUser` hooks are reused unchanged.

Because the users module is explicitly **web-only** per `CLAUDE.md` ("web: `users`" is listed under single-app features), this work stays inside `apps/web/src/features/users/` — no cross-app shared-feature module, no desktop counterpart, no Zod/API/DB changes. The only new component is a thin `UserSidebar` wrapper mirroring `ProviderSidebar` / `VisitPersonSidebar`. The sole behavioral change outside that wrapper is: `UsersTable` replaces `router.push(...)` calls with open-sheet callbacks.

This is a small presentation refactor; the constitution gates are all green because nothing about tenant isolation, validation, API-first access, or role enforcement is being moved, only the UI surface that invokes them.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS
**Primary Dependencies**: Next.js 16 (App Router, web), `@ramcar/ui` (shadcn/ui `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`), TanStack Query v5, Zustand (via `@ramcar/store`), next-intl v4, `@ramcar/shared` (Zod DTOs for `CreateUserInput` / `UpdateUserInput` / `ExtendedUserProfile`), Tailwind CSS 4, `tw-animate-css` (already installed on the current branch to restore Sheet slide/fade — a prerequisite for this work)
**Storage**: N/A — no schema changes, no new queries. Existing `/api/users` endpoints are reused verbatim.
**Testing**: Vitest (+ `@testing-library/react`, `@testing-library/jest-dom`) for unit/integration tests in `apps/web/src/features/users/__tests__/`; optional Playwright E2E at `apps/web/e2e/` if a cross-route regression test is desired (Phase 0 decides).
**Target Platform**: Web (Next.js App Router, authenticated portal, responsive — Sheet uses the standard sm breakpoint width `w-[400px] sm:w-[800px]`)
**Project Type**: Web application (single-app — users is a `apps/web`-only feature per `CLAUDE.md`)
**Performance Goals**: Sheet open → form first paint in < 500 ms on a healthy connection (matches the Visitors/Providers benchmark from spec 012). Edit-mode fetch (`GET /api/users/:id`) runs in parallel with the Sheet animation so the loading indicator is typically replaced by the form before the animation completes.
**Constraints**: Must not regress the `useKeyboardNavigation` unification from commit `865f121` ("users catalog to follow patterns & unify keyboard hook"). Must not alter `UserForm`'s public props. Must not leave dead route files or stale `router.push` references. Must preserve the existing `useFormPersistence` draft keys (`user-create`, `user-edit-<id>`) so drafts authored under the page-based flow remain restorable after the change.
**Scale/Scope**: ~3 touched files + 1 new file in `apps/web/src/features/users/components/`, 2 route files deleted, 1 existing test updated, 2 existing tests unchanged, optional i18n key additions in `packages/i18n/src/messages/{en,es}.json`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-Tenant Isolation** | ✅ Pass | No DB access added or changed. `/api/users/*` endpoints (already scoped by `tenant_id` in `UsersRepository`) are the only data path. |
| **II. Feature-Based Architecture** | ✅ Pass | All UI changes confined to `apps/web/src/features/users/`. Route files under `apps/web/src/app/[locale]/(dashboard)/catalogs/users/` are thinned (the surviving `page.tsx` just renders `<UsersTable />`) — `app/` remains routing-only. |
| **III. Strict Import Boundaries** | ✅ Pass | `UserSidebar` imports `UserForm` within the same feature. No cross-feature imports added. `shared/` is not touched. |
| **IV. Offline-First Desktop** | ✅ Pass | N/A — users is web-only (per `CLAUDE.md`). Desktop does not have a user-management surface. |
| **V. Shared Validation via Zod** | ✅ Pass | `CreateUserInput` / `UpdateUserInput` Zod schemas in `@ramcar/shared` are reused unchanged. No form-side validation is duplicated. |
| **VI. Role-Based Access Control** | ✅ Pass | UI role-gate (button render conditional + row `canEdit` flag) preserved. API-level `JwtAuthGuard + RolesGuard` on `POST /api/users` and `PUT /api/users/:id` remain the authoritative enforcement. The server-side redirect in the removed `/new/page.tsx` was a UX guard, not authz — its removal is safe. |
| **VII. TypeScript Strict Mode** | ✅ Pass | All touched files live in strict-mode workspaces. No new `any`. |
| **VIII. API-First Data Access** | ✅ Pass | All data operations continue to go through TanStack Query → NestJS REST (`apiClient.post`, `.get`, `.put`). Zero frontend Supabase `.from()`, `.rpc()`, or `.storage` calls introduced. |

**Result**: No violations. Proceeding to Phase 0. Re-evaluation after Phase 1 design expected to produce the same result (design introduces no new dependencies, data flows, or cross-boundary imports).

## Project Structure

### Documentation (this feature)

```text
specs/015-users-form-sidebar/
├── plan.md                 # This file (/speckit.plan output)
├── research.md             # Phase 0 output
├── data-model.md           # Phase 1 output (no DB changes — entity inventory only)
├── quickstart.md           # Phase 1 output (dev walk-through + manual verification script)
├── contracts/
│   └── users.api.md        # Ratification of the unchanged POST /api/users, PUT /api/users/:id, GET /api/users/:id contracts
├── checklists/             # (populated by /speckit.checklist if desired)
└── tasks.md                # Phase 2 output (created by /speckit.tasks — NOT by this command)
```

### Source Code (repository root)

Changes are **edits + deletions to existing files** plus one new component file. Touched paths:

```text
apps/web/src/app/[locale]/(dashboard)/catalogs/users/
├── page.tsx                                    # unchanged — continues to render <UsersTable locale={locale} />
├── new/
│   └── page.tsx                                # DELETE — route removed
└── [id]/
    └── edit/
        └── page.tsx                            # DELETE — route removed
                                                # Containing `[id]/edit/` and `new/` directories become empty → delete them too.

apps/web/src/features/users/components/
├── user-sidebar.tsx                            # NEW — thin Sheet wrapper; props: open, mode, userId|undefined, onClose
├── users-table.tsx                             # EDIT — replace router.push with setSidebarMode/setSelectedUserId; render <UserSidebar />
├── create-user-page-client.tsx                 # DELETE — replaced by UserSidebar's create-mode branch
├── edit-user-page-client.tsx                   # DELETE — replaced by UserSidebar's edit-mode branch
├── user-form.tsx                               # unchanged — public props contract preserved (mode, initialData, tenants, userGroups, isPending, onSubmit, onCancel)
├── user-filters.tsx                            # unchanged
├── users-table-columns.tsx                     # unchanged — getUserColumns still takes onEdit; the UsersTable wires it to open the Sheet
├── user-status-badge.tsx                       # unchanged
└── confirm-status-dialog.tsx                   # unchanged

apps/web/src/features/users/hooks/
├── use-get-user.ts                             # unchanged — gate with `enabled: !!id && open` handled at call site
├── use-create-user.ts                          # unchanged
├── use-update-user.ts                          # unchanged
├── use-tenants.ts                              # unchanged
├── use-user-groups.ts                          # unchanged
├── use-users.ts                                # unchanged
└── use-toggle-status.ts                        # unchanged

apps/web/src/features/users/__tests__/
├── users-table-interaction.test.tsx            # EDIT — replace `router.push` assertions with Sheet-open assertions; rename tests to reflect intent
├── user-form-role-lock.test.tsx                # unchanged — tests UserForm directly
├── user-form-user-group.test.tsx               # unchanged — tests UserForm directly
├── users-table-columns.test.tsx                # unchanged — tests column rendering only
├── user-status-badge.test.tsx                  # unchanged
├── hooks.test.ts                               # unchanged
└── user-sidebar.test.tsx                       # NEW (recommended) — tests create/edit mode switching, loading/error states, Sheet-close behavior

apps/web/src/features/users/types/index.ts      # unchanged — re-exports from @ramcar/shared only

packages/i18n/src/messages/en.json               # +users.sidebar.{createTitle,editTitle,loading,errorLoading} (Phase 0 decides whether to reuse existing users.createUser/users.editUser/users.errorLoading keys or add sidebar.* namespace for parity with visitPersons.sidebar.* / providers.sidebar.*)
packages/i18n/src/messages/es.json               # mirror of en.json additions
packages/i18n/src/messages/en.ts                 # +type entries if using `as const` re-exports
packages/i18n/src/messages/es.ts                 # mirror

# Nothing else touched.
# No changes in apps/api, apps/desktop, apps/www.
# No changes in packages/shared, packages/features, packages/store, packages/ui, packages/db-types.
# No DB migrations.
# No new package installs.
```

**Structure Decision**: This is a **single-app web feature**. The users module is explicitly called out in `CLAUDE.md` as a web-only feature (under "Keep app-local `src/features/[domain]/` for features that are intentionally single-app"), so this plan deliberately avoids creating or growing any shared workspace package. All work lives under `apps/web/src/features/users/` with thin deletions in `apps/web/src/app/[locale]/(dashboard)/catalogs/users/` and an optional i18n addition in `@ramcar/i18n` (to match the sidebar-namespace convention used by Visitors/Providers).

## Phase 0: Outline & Research

See [research.md](./research.md) for decisions on:

- **Sidebar mode model** — `"create" | "edit"` only (no "view" mode, because users has no view-details UI today — clicking a row already opens edit).
- **Edit-mode data fetching** — gate `useGetUser(id)` on `enabled: Boolean(open && mode === "edit" && userId)` so the request only fires when the Sheet is actually open in edit mode; close-and-reopen reuses TanStack Query cache.
- **Draft persistence key parity** — keep `user-create` and `user-edit-<id>` (exact strings already used in `UserForm`), so drafts authored before the deploy remain restorable after. No cache-version bump needed.
- **`onCancel` semantics inside the Sheet** — `UserForm.onCancel` currently calls `discardDraft()` and then the wrapper's `onCancel`; under the Sheet it calls `discardDraft()` and `onClose()`. This is a behavior match, not a change.
- **Closing the Sheet via overlay/Esc vs. the form's Cancel button** — by design, those two paths must NOT be equivalent: overlay/Esc is a "dismiss" (draft preserved), form's Cancel button is an "abandon" (draft discarded). This matches the user's mental model established by Visitors (where overlay/Esc also preserves the draft via `useFormPersistence` while explicit Cancel discards it).
- **Route removal strategy** — delete the `new/page.tsx` and `[id]/edit/page.tsx` files and their parent directories. No redirect shim (Next.js will render the default 404). Decision: prefer deletion + 404 over a redirect because (a) this is an internal app, (b) direct-link sharing is out of scope per the user input, (c) a redirect could mask stale links in internal documentation that should be fixed.
- **Role-gate defense in depth** — the server-side redirect inside the removed `new/page.tsx` (`if role !== "super_admin" && role !== "admin" redirect`) is NOT replicated at the Sheet level, because it was purely UX. The UI button already hides for non-privileged roles, and the NestJS API guards reject unauthorized requests. Explicit decision recorded in research.
- **i18n key naming** — whether to reuse `users.createUser` / `users.editUser` as Sheet titles (simplest, matches today's page headers) or introduce a `users.sidebar.{createTitle,editTitle}` namespace for parity with `visitPersons.sidebar.*` and `providers.sidebar.*`. Recommendation: introduce the `sidebar` namespace for long-term consistency; fall back is cheap (alias the same strings).
- **Testing strategy** — update `users-table-interaction.test.tsx` (the only test with navigation assertions) to inspect Sheet state instead; add a new `user-sidebar.test.tsx` that verifies the four state transitions (closed → create, closed → edit loading, closed → edit loaded, edit → close). Playwright E2E is optional because existing Vitest tests cover the surface.

**Output**: `research.md` with all NEEDS CLARIFICATION resolved.

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/](./contracts/), and [quickstart.md](./quickstart.md).

### Entities

No new entities. All already exist in `@ramcar/shared`:

- `ExtendedUserProfile` — row shape (rendered by `UsersTable`, consumed by `UserForm.initialData`)
- `CreateUserInput` (Zod-inferred) — create payload
- `UpdateUserInput` (Zod-inferred) — update payload
- `UserGroup`, `PhoneType`, `Role`, `UserFilters` — form/table supporting types

Full field inventory + the `UserSidebar` prop shape in [data-model.md](./data-model.md).

### Contracts

- [contracts/users.api.md](./contracts/users.api.md) — ratifies the unchanged `GET /api/users/:id`, `POST /api/users`, `PUT /api/users/:id` endpoint contracts that the Sheet will exercise. Included so future readers can see that this feature is contract-stable.
- **UI surface contract** — the `UserSidebar` component's props are documented in [data-model.md](./data-model.md) as the new internal contract between `UsersTable` and the Sheet wrapper.

### Agent context update

Will run `.specify/scripts/bash/update-agent-context.sh claude` after writing the Phase 1 artifacts. No new technology is introduced by this feature, so the script is expected to refresh the timestamps and recent-changes list without adding tech-stack lines (the Active Technologies inventory in `CLAUDE.md` already covers Next.js, `@ramcar/ui` Sheet, TanStack Query, next-intl, Zod, etc., from specs 011 and 012).

**Output**: `data-model.md`, `contracts/users.api.md`, `quickstart.md`, refreshed agent context file.

## Re-evaluation (post-Phase 1)

The Phase 1 design introduces:

- One new component file (`user-sidebar.tsx`) — stays inside `apps/web/src/features/users/components/`.
- One new prop contract, internal to the users feature.
- Optional i18n key additions.
- No new dependencies, no cross-feature imports, no schema changes, no new Supabase calls.

Constitution re-check: **all 8 gates still Pass**. No entries needed in the Complexity Tracking table.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
