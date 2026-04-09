# Tasks: Fix Web Navigation Layout Not Rendering

**Input**: Design documents from `/specs/004-fix-web-nav-layout/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Tests**: No test tasks included — no test framework configured yet. Verification is manual.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No setup tasks required — this is a bug fix on an existing codebase. All infrastructure is already in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove the obsolete route group that causes the bug. This must happen before redirect logic makes sense.

- [x] T001 Delete the `(protected)` route group directory `apps/web/src/app/[locale]/(protected)/` (both `layout.tsx` and `page.tsx`)

**Checkpoint**: The `(protected)` route group no longer exists. The root path `/` has no matching page (expected — redirects will handle this next).

---

## Phase 3: User Story 1 - Authenticated User Sees Navigation Shell (Priority: P1) MVP

**Goal**: After login, users land on `/dashboard` with the full navigation shell (sidebar + topbar) instead of a standalone page with no navigation.

**Independent Test**: Log in and verify you're redirected to `/dashboard` with sidebar and topbar visible. Navigate to `/` directly and verify it redirects to `/dashboard`.

### Implementation for User Story 1

- [x] T002 [P] [US1] Update middleware to redirect authenticated users from root path `/` to `/dashboard` in `apps/web/src/middleware.ts` — add `if (user && path === "/")` redirect block after the existing auth checks
- [x] T003 [P] [US1] Update middleware post-login redirect target from `prefix || "/"` to `${prefix}/dashboard` in `apps/web/src/middleware.ts` (line 62-63)
- [x] T004 [P] [US1] Update login action redirect from `"/"` to `"/dashboard"` in `apps/web/src/features/auth/actions/login.ts` (line 37)

**Checkpoint**: Logging in redirects to `/dashboard`. Navigating to `/` redirects to `/dashboard`. The dashboard page renders with sidebar and topbar.

---

## Phase 4: User Story 2 - Sidebar Navigation Works Across All Pages (Priority: P1)

**Goal**: All authenticated pages consistently show the sidebar and topbar. Users can navigate between sections using the sidebar.

**Independent Test**: Navigate to `/dashboard`, `/blacklist`, `/patrols`, `/logbook`, `/logbook/visitors`, `/account` and verify sidebar + topbar appear on every page. Click sidebar links to navigate between pages.

### Implementation for User Story 2

No additional code changes needed — the `(dashboard)` route group's `layout.tsx` already wraps all these pages with `DashboardShell`. Removing `(protected)` (T001) and adding redirects (T002-T004) resolves this story automatically.

**Checkpoint**: All dashboard pages show sidebar + topbar. Sidebar links navigate correctly between pages. Login page does NOT show sidebar/topbar.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification and cleanup

- [x] T005 Run `pnpm typecheck` to verify no TypeScript errors were introduced
- [x] T006 Run `pnpm lint` to verify no linting errors were introduced
- [x] T007 Manual verification per quickstart.md: navigate to `/dashboard`, `/blacklist`, `/patrols`, `/logbook`, `/logbook/visitors`, `/account` — all show sidebar + topbar. Navigate to `/login` — no sidebar/topbar. Navigate to `/` — redirects to `/dashboard`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately (T001)
- **User Story 1 (Phase 3)**: Depends on T001 (route group deleted first)
- **User Story 2 (Phase 4)**: No code changes — automatically resolved by T001-T004
- **Polish (Phase 5)**: Depends on T001-T004 completion

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T001 (foundational). T002, T003, T004 can run in parallel after T001.
- **User Story 2 (P1)**: No additional tasks — resolved by US1 implementation.

### Within Each User Story

- T001 must complete before T002-T004
- T002, T003, T004 are independent (different files or different sections of the same file) and can run in parallel

### Parallel Opportunities

- T002, T003, T004 can all run in parallel (T002/T003 touch different sections of `middleware.ts`, T004 touches `login.ts`)
- T005, T006 can run in parallel after implementation

---

## Parallel Example: User Story 1

```bash
# After T001 completes, launch all redirect changes together:
Task T002: "Update middleware root redirect in apps/web/src/middleware.ts"
Task T003: "Update middleware post-login redirect in apps/web/src/middleware.ts"
Task T004: "Update login action redirect in apps/web/src/features/auth/actions/login.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Delete `(protected)` route group (T001)
2. Complete Phase 3: Add redirect logic (T002-T004)
3. **STOP and VALIDATE**: Log in, verify `/dashboard` renders with sidebar + topbar
4. Complete Phase 5: Typecheck + lint + manual verification (T005-T007)

### Incremental Delivery

This is a small bug fix — all changes ship together as a single increment. No staged delivery needed.

---

## Notes

- This is a 4-task bug fix (T001-T004) plus 3 verification tasks (T005-T007)
- No new files created — only modifications and deletions
- No database changes, no new dependencies, no new components
- The `(dashboard)` route group already has all the correct layout infrastructure; we're just ensuring all authenticated routes use it
