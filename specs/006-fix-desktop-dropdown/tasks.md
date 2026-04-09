# Tasks: Fix Desktop Sidebar Dropdown Menu

**Input**: Design documents from `/specs/006-fix-desktop-dropdown/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: Not requested — this is a dependency version bump with manual verification.

**Organization**: Tasks grouped by user story. US1 is the core fix; US2 is regression verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify current state and confirm the bug exists.

- [x] T001 Verify the desktop app currently uses React 18.x by checking the installed version in `apps/desktop/node_modules/react/package.json`

---

## Phase 2: User Story 1 — Fix Dropdown Menu Visibility (Priority: P1)

**Goal**: Make the sidebar avatar dropdown display visible "Account" and "Logout" menu items on the desktop app.

**Independent Test**: Log in to the desktop app, click the user avatar in the sidebar footer, verify the dropdown appears with visible and clickable "Account" and "Logout" options.

### Implementation for User Story 1

- [x] T002 [US1] Update `react` and `react-dom` versions from `^18.2.0` to `^19.2.3` in `apps/desktop/package.json`
- [x] T003 [US1] Run `pnpm install` to update the lockfile (`pnpm-lock.yaml`) with the new React 19 dependencies

**Checkpoint**: Desktop app now runs React 19, enabling proper ref forwarding through Radix Slot for the sidebar DropdownMenu trigger.

---

## Phase 3: User Story 2 — No Regression on Web (Priority: P2)

**Goal**: Confirm the React upgrade does not break the web app's sidebar dropdown or any other workspace.

**Independent Test**: Run typecheck and lint across all workspaces. Start the web app and verify the sidebar dropdown still works correctly.

### Implementation for User Story 2

- [x] T004 [US2] Run `pnpm typecheck` across all workspaces — verify zero TypeScript errors
- [x] T005 [US2] Run `pnpm lint` across all workspaces — verify zero ESLint violations

**Checkpoint**: All workspaces pass typecheck and lint. No regressions introduced.

---

## Phase 4: Polish & Verification

**Purpose**: Full manual verification of the fix across all scenarios.

- [ ] T006 [MANUAL] Run desktop app (`pnpm --filter desktop dev`), log in, click sidebar avatar — verify dropdown shows "Account" and "Logout" as visible, clickable items
- [ ] T007 [MANUAL] Test dropdown in sidebar collapsed (icon) mode — verify it still works
- [ ] T008 [MANUAL] Test dropdown in both light and dark themes on desktop — verify correct contrast
- [ ] T009 [MANUAL] Run web app (`pnpm --filter web dev`), log in, click sidebar avatar — verify dropdown still works (no regression)
- [ ] T010 [MANUAL] Run full verification matrix from `specs/006-fix-desktop-dropdown/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — verification only
- **US1 (Phase 2)**: Depends on Phase 1 — the core fix
- **US2 (Phase 3)**: Depends on Phase 2 — regression checks
- **Polish (Phase 4)**: Depends on Phases 2 and 3 — full manual verification

### User Story Dependencies

```
Phase 1 (Setup)
    └──→ Phase 2 (US1: Fix Dropdown)
             └──→ Phase 3 (US2: No Regression)
                      └──→ Phase 4 (Polish)
```

- **US1 (P1)**: Core fix — upgrade React version
- **US2 (P2)**: Depends on US1 — verify no regressions

### Within Each Phase

- T002 and T003 are sequential (package.json change must precede install)
- T004 and T005 can run in parallel (different tools, no file conflicts)
- All Phase 4 tasks can run in parallel (different apps/scenarios)

---

## Implementation Strategy

### MVP First (User Story 1 — Dropdown Fix)

1. Complete Phase 1: Verify current React version
2. Complete Phase 2: Upgrade React to 19.x
3. **STOP and VALIDATE**: Run desktop app, test dropdown
4. This delivers the core fix — dropdown menu items are visible

### Incremental Delivery

1. Setup → Confirm bug exists with React 18
2. US1 → Upgrade React, verify dropdown works (MVP!)
3. US2 → Run typecheck + lint, confirm no regressions
4. Polish → Full manual verification across all scenarios

---

## Notes

- This is a dependency-only fix — no application code changes
- The `@types/react: ^19` was already in desktop devDependencies, indicating intent to use React 19
- The web app already uses React 19.2.3; this aligns the desktop app
- Total files modified: `apps/desktop/package.json` + `pnpm-lock.yaml` (auto-generated)
