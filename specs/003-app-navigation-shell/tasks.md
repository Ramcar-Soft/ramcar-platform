# Tasks: App Navigation Shell

**Input**: Design documents from `/specs/003-app-navigation-shell/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted. Validation via manual testing per quickstart.md.

**Organization**: Tasks grouped by user story. Stories map to spec.md priorities.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US7)
- Exact file paths included in all task descriptions

---

## Phase 1: Setup (Dependencies & Component Installation)

**Purpose**: Install all required shadcn/ui components and new dependencies before any feature work begins.

- [x] T001 Install shadcn sidebar component (with its dependencies: separator, sheet, tooltip, skeleton, use-mobile hook) into `packages/ui` via `cd packages/ui && pnpx shadcn@latest add sidebar`
- [x] T002 [P] Install shadcn dropdown-menu component into `packages/ui` via `cd packages/ui && pnpx shadcn@latest add dropdown-menu`
- [x] T003 [P] Install shadcn collapsible component into `packages/ui` via `cd packages/ui && pnpx shadcn@latest add collapsible`
- [x] T004 [P] Install shadcn avatar component into `packages/ui` via `cd packages/ui && pnpx shadcn@latest add avatar`
- [x] T005 Update `packages/ui/src/index.ts` to re-export all new components: sidebar (all exports), separator, sheet, tooltip, skeleton, dropdown-menu, collapsible, avatar, and the `use-mobile` hook
- [x] T006 Install `next-themes` package in `apps/web` via `cd apps/web && pnpm add next-themes`

---

## Phase 2: Foundational (Shared Config, Translations, Store Slices)

**Purpose**: Create the shared navigation infrastructure that both apps consume. MUST complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Create navigation types and sidebar config in `packages/shared/src/navigation/sidebar-config.ts` — define `Platform`, `SidebarItem`, `SidebarSubItem` types, the full `sidebarItems` array (15 items per contracts/sidebar-config.md), and `getItemsForPlatform()` and `getItemsForRole()` helper functions
- [x] T008 Create `packages/shared/src/navigation/index.ts` barrel export and update `packages/shared/src/index.ts` to re-export navigation types and functions
- [x] T009 [P] Add `sidebar` namespace translations to `packages/i18n/src/messages/en.json` — all keys from contracts/sidebar-config.md (dashboard, catalogs, logbook, logbook.visitors, logbook.providers, logbook.residents, visits-and-residents, projects, wifi, complaints, patrols, amenities, announcements, lost-and-found, history, blacklist, access-log, access-log.visitors, access-log.providers, access-log.residents, my-visits, account, logout)
- [x] T010 [P] Add `sidebar` namespace translations to `packages/i18n/src/messages/es.json` — matching Spanish translations per context document (Panel, Catálogos, Bitácora, etc.)
- [x] T011 Create `SidebarSlice` in `packages/store/src/slices/sidebar-slice.ts` — state: `collapsed: boolean` (default false), `currentPath: string` (default "/dashboard"); actions: `toggleCollapsed()` (persists to localStorage key `ramcar-sidebar-collapsed`), `navigate(path: string)`
- [x] T012 [P] Create `ThemeSlice` in `packages/store/src/slices/theme-slice.ts` — state: `theme: "light" | "dark" | "system"` (default "system"); actions: `setTheme(theme)` (applies `dark` class to `document.documentElement`, persists to localStorage key `ramcar-theme`); initialize from localStorage on creation
- [x] T013 Update `packages/store/src/index.tsx` to compose `SidebarSlice` and `ThemeSlice` into `AppState`, export their types, and wire `createStore` to include both new slices

**Checkpoint**: Shared navigation config, translations, and store slices are ready. Both apps can now consume them.

---

## Phase 3: User Story 7 - Placeholder Pages for All Modules (Priority: P1) MVP

**Goal**: Every sidebar module and submodule has a routable page that displays the translated module name. This is foundational — the sidebar cannot be tested without destination pages.

**Independent Test**: Visit each route directly by URL — every one should render a centered translated module name without errors.

### Implementation for User Story 7

#### Web App (`apps/web`)

- [x] T014 [US7] Create the `(dashboard)` route group layout in `apps/web/src/app/[locale]/(dashboard)/layout.tsx` — minimal shell layout (just renders children for now; sidebar integration comes in US1). Include auth check (move existing auth logic from current `(protected)/layout.tsx`). Keep the existing `(protected)` group for now if login uses it, or migrate login under `(auth)` group
- [ ] T015 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/dashboard/page.tsx` — server component that displays translated "Dashboard" centered on page using `useTranslations("sidebar")`
- [ ] T016 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/catalogs/page.tsx`
- [ ] T017 [P] [US7] Create placeholder pages for logbook with redirect: `apps/web/src/app/[locale]/(dashboard)/logbook/page.tsx` (redirects to `/logbook/visitors`), `apps/web/src/app/[locale]/(dashboard)/logbook/visitors/page.tsx`, `apps/web/src/app/[locale]/(dashboard)/logbook/providers/page.tsx`, `apps/web/src/app/[locale]/(dashboard)/logbook/residents/page.tsx`
- [ ] T018 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/visits-and-residents/page.tsx`
- [ ] T019 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/projects/page.tsx`
- [ ] T020 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/wifi/page.tsx`
- [ ] T021 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/complaints/page.tsx`
- [ ] T022 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/patrols/page.tsx`
- [ ] T023 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/amenities/page.tsx`
- [ ] T024 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/announcements/page.tsx`
- [ ] T025 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/lost-and-found/page.tsx`
- [ ] T026 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/history/page.tsx`
- [ ] T027 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/blacklist/page.tsx`
- [ ] T028 [P] [US7] Create placeholder page `apps/web/src/app/[locale]/(dashboard)/account/page.tsx`

#### Desktop App (`apps/desktop`)

- [ ] T029 [US7] Create page router component in `apps/desktop/src/App.tsx` — when authenticated, render a layout shell that reads `currentPath` from `SidebarSlice` and renders the matching page component (replace current `HomePage` render). Include a `PageRouter` component or switch/map pattern
- [ ] T030 [P] [US7] Create placeholder page `apps/desktop/src/features/dashboard/pages/dashboard-page.tsx` — displays translated "Dashboard" centered using `useTranslation()`
- [ ] T031 [P] [US7] Create placeholder pages for access-log: `apps/desktop/src/features/access-log/pages/access-log-visitors-page.tsx`, `apps/desktop/src/features/access-log/pages/access-log-providers-page.tsx`, `apps/desktop/src/features/access-log/pages/access-log-residents-page.tsx`. If `currentPath` is `/access-log`, auto-navigate to `/access-log/visitors`
- [ ] T032 [P] [US7] Create placeholder page `apps/desktop/src/features/patrols/pages/patrols-page.tsx`
- [ ] T033 [P] [US7] Create placeholder page `apps/desktop/src/features/account/pages/account-page.tsx`

**Checkpoint**: All routes are navigable by URL (web) or by setting currentPath (desktop). Each shows its translated module name.

---

## Phase 4: User Stories 1 & 2 - Sidebar Navigation with Submodules (Priority: P1)

**Goal**: Users see a sidebar with all modules for their role, can click to navigate, and can expand/collapse submodule groups. Active item is highlighted.

**Independent Test**: Log in, click each sidebar item (and subitem), verify navigation works and active state highlights correctly. Expand/collapse submodule groups.

### Implementation for User Stories 1 & 2

#### Web App

- [x] T034 [US1] Create `apps/web/src/features/navigation/components/app-sidebar.tsx` — wraps shadcn `Sidebar`, `SidebarContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` primitives from `@ramcar/ui`. Import `getItemsForPlatform("web")` from `@ramcar/shared`. Use `useTranslations("sidebar")` from `next-intl` for labels. Use `usePathname()` from `next/navigation` for active state. Render `SidebarMenuSub`/`SidebarMenuSubItem` for items with `subItems` using `Collapsible` from `@ramcar/ui`. Auto-expand parent when a child route is active. Use lucide-react icons mapped from the string icon name in config. Use Next.js `Link` for navigation
- [x] T035 [US1] Create `apps/web/src/features/navigation/index.ts` barrel export
- [x] T036 [US1] Update `apps/web/src/app/[locale]/(dashboard)/layout.tsx` to integrate the sidebar — wrap content with `SidebarProvider` from `@ramcar/ui`, render `AppSidebar` on the left, render `SidebarInset` wrapper around the main content area

#### Desktop App

- [x] T037 [US1] Create `apps/desktop/src/features/navigation/components/app-sidebar.tsx` — same structure as web but uses `useTranslation()` from `react-i18next` with `t("sidebar.key")` for labels. Uses `currentPath` from Zustand `SidebarSlice` for active state. Uses `navigate()` from `SidebarSlice` for the `onClick` handler. Maps icon strings to lucide-react components. Renders collapsible submodule groups for access-log
- [x] T038 [US1] Create `apps/desktop/src/features/navigation/index.ts` barrel export
- [x] T039 [US1] Update `apps/desktop/src/App.tsx` authenticated view to render a layout shell with `SidebarProvider` from `@ramcar/ui`, `AppSidebar` on the left, and page content on the right

**Checkpoint**: Both apps display a sidebar with all modules. Clicking items navigates to the correct page. Submodules expand/collapse. Active item is highlighted. Deep-linking to submodule routes auto-expands the parent.

---

## Phase 5: User Story 3 - Collapse and Expand the Sidebar (Priority: P2)

**Goal**: Users can toggle the sidebar between full-width (icon + label) and collapsed (icon-only) modes. Preference persists across sessions.

**Independent Test**: Toggle collapse, refresh the page — sidebar stays collapsed. Toggle back, refresh — sidebar stays expanded. Hover over collapsed icons to see tooltips.

### Implementation for User Story 3

- [x] T040 [US3] Web: Add `SidebarTrigger` button (from `@ramcar/ui`) to the `(dashboard)/layout.tsx` — positioned at the top of the sidebar or in the top bar area. Wire `defaultOpen` prop on `SidebarProvider` to read from `localStorage` key `ramcar-sidebar-collapsed`. Use shadcn sidebar's built-in `onOpenChange` callback to persist state to `localStorage`
- [x] T041 [P] [US3] Desktop: Add `SidebarTrigger` button in `App.tsx` layout shell. Wire `SidebarProvider` `defaultOpen` and `onOpenChange` to the `SidebarSlice` `collapsed`/`toggleCollapsed` state (which already persists to localStorage per T011)
- [x] T042 [US3] Both apps: Verify that `SidebarMenuButton` items in collapsed mode show `Tooltip` with the translated module name on hover (this should be built into shadcn sidebar's `tooltip` prop on `SidebarMenuButton` — configure it in the AppSidebar components created in T034/T037)

**Checkpoint**: Sidebar toggles between collapsed and expanded. Tooltips appear on hover in collapsed mode. Preference persists across refresh/restart.

---

## Phase 6: User Story 4 - Top Bar with Theme Toggle (Priority: P2)

**Goal**: A sticky top bar above the content area with theme toggle (light/dark) and the existing language switcher.

**Independent Test**: Verify the top bar is visible on every page. Toggle theme — the entire app switches. Switch language — all labels update. Scroll the page — top bar stays fixed.

### Implementation for User Story 4

#### Web App

- [x] T043 [US4] Add `ThemeProvider` from `next-themes` to `apps/web/src/app/[locale]/layout.tsx` — wrap the `body` children with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`. Set `suppressHydrationWarning` on the `<html>` element
- [x] T044 [P] [US4] Create `apps/web/src/features/navigation/components/theme-toggle.tsx` — button with `Sun`/`Moon` icon from lucide-react, uses `useTheme()` from `next-themes` to toggle between light and dark
- [x] T045 [US4] Create `apps/web/src/features/navigation/components/top-bar.tsx` — sticky `header` element with `bg-background border-b` styling, height 48-56px. Right side: `ThemeToggle` + existing `LanguageSwitcher` (import from `@/shared/components/language-switcher`). Left side: empty (future breadcrumbs)
- [x] T046 [US4] Integrate `TopBar` into `apps/web/src/app/[locale]/(dashboard)/layout.tsx` — render at the top of the `SidebarInset` content area. Remove the old absolute-positioned `LanguageSwitcher` from the layout

#### Desktop App

- [x] T047 [P] [US4] Create `apps/desktop/src/features/navigation/components/theme-toggle.tsx` — button with `Sun`/`Moon` icon, uses `useAppStore` to read/write `ThemeSlice` state. On mount, apply the stored theme class to `document.documentElement`
- [x] T048 [US4] Create `apps/desktop/src/features/navigation/components/top-bar.tsx` — sticky header with same structure as web. Right side: `ThemeToggle` + existing `LanguageSwitcher` (import from `@/shared/components/language-switcher`)
- [x] T049 [US4] Integrate `TopBar` into `apps/desktop/src/App.tsx` layout shell — render at the top of the content area (right of sidebar). Remove any old language switcher placement if it exists elsewhere

**Checkpoint**: Top bar visible on every page in both apps. Theme toggle works. Language switcher works from its new position. Top bar stays fixed when scrolling.

---

## Phase 7: User Story 5 - User Account Menu (Priority: P3)

**Goal**: User profile section at the bottom of the sidebar with avatar/initials, name, email. Clicking opens a menu with Account and Log Out options.

**Independent Test**: Look at the bottom of the sidebar — see user info. Click it — see dropdown with Account and Log Out. Click Account — navigate to account page. Click Log Out — triggers logout.

### Implementation for User Story 5

- [x] T050 [US5] Web: Add `SidebarFooter` section to `apps/web/src/features/navigation/components/app-sidebar.tsx` — render user avatar (using `Avatar` from `@ramcar/ui` with initials fallback), name, and truncated email. Use `DropdownMenu` from `@ramcar/ui` to show "Account" and "Log Out" options on click. In collapsed mode, show only the avatar. "Account" navigates to `/account`. "Log Out" calls the existing Supabase `signOut` flow. Labels use `useTranslations("sidebar")` for `account` and `logout` keys. User data can be read from the Supabase auth session or passed as props
- [x] T051 [P] [US5] Desktop: Add `SidebarFooter` section to `apps/desktop/src/features/navigation/components/app-sidebar.tsx` — same pattern as web. User data comes from `useAppStore` `AuthSlice`. "Account" calls `navigate("/account")` from `SidebarSlice`. "Log Out" calls `onLogout` prop (passed down from `App.tsx`)

**Checkpoint**: User profile displays at sidebar bottom. Dropdown menu shows Account and Log Out. Both options function correctly.

---

## Phase 8: User Story 6 - Mobile Responsive Sidebar (Priority: P3)

**Goal**: On small screens (web only), the sidebar is hidden by default. A hamburger button in the top bar opens it as a sheet overlay.

**Independent Test**: Resize browser to <768px — sidebar hides, hamburger appears. Tap hamburger — sidebar opens as overlay. Navigate — overlay closes. Tap outside — overlay closes.

### Implementation for User Story 6

- [x] T052 [US6] Web: Add `SidebarTrigger` (hamburger icon) to the left side of `TopBar` in `apps/web/src/features/navigation/components/top-bar.tsx` — render conditionally using the `useMobile` hook (from `@ramcar/ui`) or a Tailwind responsive class (`md:hidden`). The shadcn sidebar component already renders as a `Sheet` on mobile via `SidebarProvider` — verify this works by testing at mobile width
- [x] T053 [US6] Web: Verify and adjust that clicking a sidebar item in mobile sheet mode auto-closes the sheet. If not handled by shadcn sidebar, add `onOpenChange` handler to close the sheet on navigation

**Checkpoint**: Web app sidebar transitions to overlay mode on mobile. Hamburger button appears. Sheet opens/closes correctly. Navigation auto-dismisses the sheet.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and cross-cutting improvements.

- [x] T054 [P] Verify keyboard accessibility in both apps — Tab through all sidebar items, Enter/Space to activate, Escape to close menus/overlays. Add missing `aria-expanded` attributes on collapsible groups if not provided by shadcn primitives
- [x] T055 [P] Verify dark mode styling in both apps — sidebar, top bar, and placeholder pages all respect the current theme using correct CSS variable tokens (`bg-sidebar`, `text-sidebar-foreground`, or fallback to `bg-card`/`text-card-foreground`)
- [x] T056 [P] Verify i18n completeness — switch between es and en in both apps, confirm ALL sidebar labels, top bar elements, and placeholder page titles update correctly. Fix any missing keys
- [x] T057 Run `pnpm lint` and `pnpm typecheck` across all workspaces and fix any errors
- [x] T058 Run `pnpm build` to verify production builds succeed for all apps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US7 Placeholder Pages (Phase 3)**: Depends on Phase 2 — BLOCKS US1/US2 (sidebar needs pages to navigate to)
- **US1+US2 Sidebar (Phase 4)**: Depends on Phase 3
- **US3 Collapse (Phase 5)**: Depends on Phase 4 (sidebar must exist)
- **US4 Top Bar (Phase 6)**: Depends on Phase 4 (needs the layout shell). Can run in PARALLEL with Phase 5
- **US5 Account Menu (Phase 7)**: Depends on Phase 4 (sidebar must exist). Can run in PARALLEL with Phases 5 and 6
- **US6 Mobile (Phase 8)**: Depends on Phase 4 and Phase 6 (needs sidebar + top bar with hamburger)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    └─► Phase 2 (Foundational)
            └─► Phase 3 (US7: Placeholder Pages)
                    └─► Phase 4 (US1+US2: Sidebar Navigation)
                            ├─► Phase 5 (US3: Collapse)  ──────────────┐
                            ├─► Phase 6 (US4: Top Bar)   ──► Phase 8 (US6: Mobile)
                            └─► Phase 7 (US5: Account Menu) ──────────┘
                                                                       └─► Phase 9 (Polish)
```

### Within Each Phase

- Tasks marked [P] can run in parallel within their phase
- Placeholder pages (T015–T028, T030–T033) are all independent and highly parallelizable
- Web and desktop implementations within the same phase can often run in parallel

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can all run in parallel (after T001 if shadcn overwrites are a concern, or truly in parallel since they write to different files)
- **Phase 2**: T009 + T010 in parallel; T011 + T012 in parallel
- **Phase 3**: All placeholder page tasks (T015–T028, T030–T033) in parallel — each writes to a different file
- **Phase 4**: Web sidebar (T034–T036) and desktop sidebar (T037–T039) can run in parallel
- **Phase 5**: T040 (web) and T041 (desktop) in parallel
- **Phase 6**: T044 + T047 (theme toggles) in parallel; then T045 + T048 (top bars)
- **Phase 7**: T050 (web) and T051 (desktop) in parallel
- **Phase 9**: T054, T055, T056 all in parallel

---

## Parallel Example: Phase 3 (Placeholder Pages)

```bash
# All these can launch simultaneously — each creates a different file:
Task T015: "Create dashboard/page.tsx"
Task T016: "Create catalogs/page.tsx"
Task T017: "Create logbook pages (page.tsx + 3 subpages)"
Task T018: "Create visits-and-residents/page.tsx"
Task T019: "Create projects/page.tsx"
Task T020: "Create wifi/page.tsx"
Task T021: "Create complaints/page.tsx"
Task T022: "Create patrols/page.tsx"
Task T023: "Create amenities/page.tsx"
Task T024: "Create announcements/page.tsx"
Task T025: "Create lost-and-found/page.tsx"
Task T026: "Create history/page.tsx"
Task T027: "Create blacklist/page.tsx"
Task T028: "Create account/page.tsx"
# Desktop (also in parallel):
Task T030: "Create desktop dashboard-page.tsx"
Task T031: "Create desktop access-log pages (3 files)"
Task T032: "Create desktop patrols-page.tsx"
Task T033: "Create desktop account-page.tsx"
```

---

## Implementation Strategy

### MVP First (Phases 1–4)

1. Complete Phase 1: Setup (install shadcn components, next-themes)
2. Complete Phase 2: Foundational (shared config, translations, store slices)
3. Complete Phase 3: US7 Placeholder Pages (all routes exist)
4. Complete Phase 4: US1+US2 Sidebar Navigation (core navigation works)
5. **STOP and VALIDATE**: Both apps have a working sidebar with all modules, submodules, active states, and placeholder pages

### Incremental Delivery

1. **MVP** (Phases 1–4): Sidebar navigation works end-to-end in both apps
2. **+US3** (Phase 5): Sidebar collapse with persistence
3. **+US4** (Phase 6): Top bar with theme toggle and language switcher
4. **+US5** (Phase 7): User account menu in sidebar footer
5. **+US6** (Phase 8): Mobile responsive sidebar (web only)
6. **Polish** (Phase 9): Accessibility, theme, i18n verification, lint/build

### Single Developer Strategy

Work sequentially through phases 1 → 2 → 3 → 4 (MVP), then 5 → 6 → 7 → 8 → 9. Within each phase, parallelize where marked [P].

---

## Notes

- [P] tasks = different files, no dependencies — safe to parallelize
- [Story] labels map tasks to spec.md user stories for traceability
- US1 and US2 are combined in Phase 4 because submodule support is structurally part of building the sidebar
- shadcn sidebar component provides built-in support for collapse, tooltips, and mobile sheet — tasks reference configuring these features, not building from scratch
- Desktop app uses Zustand-based navigation (no router library) — the `SidebarSlice.navigate()` function is the routing mechanism
- Web app uses Next.js App Router with `Link` components — no custom routing needed
- Commit after each completed phase or logical task group
