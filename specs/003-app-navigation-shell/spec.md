# Feature Specification: App Navigation Shell

**Feature Branch**: `003-app-navigation-shell`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "Create the left side navigation bar and the top bar for both web and desktop apps"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate Between Modules via Sidebar (Priority: P1)

An authenticated user (admin on web, guard on desktop) sees a vertical sidebar listing all available modules for their role. They click a module name to navigate to that section. The sidebar clearly indicates which module is currently active.

**Why this priority**: The sidebar is the primary navigation mechanism for the entire platform. Without it, users have no way to move between modules. Every other feature depends on this navigation being in place.

**Independent Test**: Can be fully tested by logging in and clicking each sidebar item — the user should land on the corresponding page with the correct item highlighted.

**Acceptance Scenarios**:

1. **Given** a user is on any page, **When** they look at the sidebar, **Then** they see a list of all modules available for their role with recognizable icons and translated labels.
2. **Given** a user is on the Dashboard, **When** they click the "Complaints" module, **Then** the application navigates to the Complaints page and the sidebar highlights "Complaints" as the active item.
3. **Given** a user navigates directly to a URL (e.g., `/catalogs`), **When** the page loads, **Then** the sidebar highlights the corresponding module as active.
4. **Given** a user is on any page in `apps/web`, **When** they view the sidebar, **Then** they see the full Admin module set (Dashboard, Catalogs, Logbook, Visits & Residents, Projects, Wi-Fi, Complaints, Patrols, Amenities, Announcements, Lost & Found, History, Blacklist).
5. **Given** a user is on any page in `apps/desktop`, **When** they view the sidebar, **Then** they see the full Guard module set (Dashboard, Access Log, Patrols).

---

### User Story 2 - Expand and Navigate Submodules (Priority: P1)

Some modules (Logbook, Access Log) contain submodules. The user clicks the parent module to reveal its children (e.g., Visitors, Providers, Residents), then clicks a submodule to navigate to it.

**Why this priority**: Submodule navigation is part of the core navigation flow — Logbook (web) and Access Log (desktop) are the most-used modules in daily operations.

**Independent Test**: Click a parent module with submodules, verify children appear, click a child, verify navigation occurs and both parent and child are visually indicated as active.

**Acceptance Scenarios**:

1. **Given** the Logbook module is collapsed, **When** the user clicks it, **Then** the submodules (Visitors, Providers, Residents) appear with an expand animation.
2. **Given** the Logbook module is expanded, **When** the user clicks it again, **Then** the submodules collapse with a collapse animation.
3. **Given** a user navigates to `/logbook/visitors`, **When** the page loads, **Then** the Logbook module is automatically expanded and the Visitors submodule is highlighted.
4. **Given** a user navigates to a parent route that has submodules (e.g., `/logbook`), **When** the page loads, **Then** they are redirected to the first submodule (e.g., `/logbook/visitors`).

---

### User Story 3 - Collapse and Expand the Sidebar (Priority: P2)

The user can toggle the sidebar between a full-width state (icon + label) and a collapsed state (icon only) to gain more screen real estate for the content area. The preference persists across sessions.

**Why this priority**: While the sidebar works in expanded mode by default, the collapse feature improves usability on smaller screens and is a standard expectation for enterprise-style dashboards.

**Independent Test**: Toggle the sidebar to collapsed, refresh the page, verify it remains collapsed. Toggle back and verify it stays expanded after another refresh.

**Acceptance Scenarios**:

1. **Given** the sidebar is expanded, **When** the user clicks the collapse toggle, **Then** the sidebar smoothly animates to a narrow icon-only view.
2. **Given** the sidebar is collapsed, **When** the user hovers over an icon, **Then** a tooltip appears showing the module name in the current language.
3. **Given** the sidebar is collapsed, **When** the user clicks the expand toggle, **Then** the sidebar smoothly animates back to the full-width view with icons and labels.
4. **Given** the user collapses the sidebar and closes the application, **When** they reopen it, **Then** the sidebar is still in the collapsed state.

---

### User Story 4 - View and Interact with Top Bar (Priority: P2)

The user sees a persistent horizontal bar at the top of the content area with quick-access controls: a theme toggle (light/dark mode) and a language switcher.

**Why this priority**: The top bar provides essential utility controls (theme and language) and establishes the visual framework for future features like breadcrumbs and notifications.

**Independent Test**: Verify the top bar is visible on every page, toggle the theme, switch the language — all without navigating away.

**Acceptance Scenarios**:

1. **Given** a user is on any page, **When** they look at the top of the content area, **Then** they see a horizontal bar with theme and language controls on the right side.
2. **Given** the app is in light mode, **When** the user clicks the theme toggle, **Then** the entire application switches to dark mode immediately.
3. **Given** the app is in dark mode, **When** the user clicks the theme toggle, **Then** the entire application switches to light mode immediately.
4. **Given** the app is in Spanish, **When** the user clicks the language switcher, **Then** all sidebar labels, top bar elements, and page content switch to English.
5. **Given** the user scrolls the page content, **When** they scroll down, **Then** the top bar remains fixed at the top of the content area.

---

### User Story 5 - Access User Account Menu (Priority: P3)

The user sees their profile information at the bottom of the sidebar. They can click it to access account-related actions (Account settings, Log out).

**Why this priority**: Profile and logout are important but secondary to navigation. Users need to log out, but this doesn't block other feature work.

**Independent Test**: Click the user profile section at the bottom of the sidebar, verify a menu appears with Account and Log Out options, click each to verify the expected behavior.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they look at the bottom of the sidebar, **Then** they see their avatar (or initials), name, and email.
2. **Given** the sidebar is collapsed, **When** the user looks at the bottom, **Then** they see only their avatar (or initials).
3. **Given** a user clicks on their profile section, **When** the menu appears, **Then** they see "Account" and "Log out" options with translated labels.
4. **Given** a user clicks "Account" in the menu, **When** the navigation occurs, **Then** they are taken to a placeholder Account page.
5. **Given** a user clicks "Log out" in the menu, **When** the action fires, **Then** the logout flow is initiated.

---

### User Story 6 - Navigate on Small Screens (Priority: P3)

On mobile-width or small screens (web app), the sidebar is hidden by default. A hamburger button in the top bar opens it as an overlay that can be dismissed.

**Why this priority**: Mobile responsiveness is important for the web portal but not critical for the initial desktop guard application. It rounds out the navigation experience.

**Independent Test**: Resize the browser to mobile width, verify sidebar is hidden, tap the hamburger button, verify the sidebar appears as an overlay, navigate to a module, verify the overlay closes.

**Acceptance Scenarios**:

1. **Given** the browser width is below the responsive breakpoint, **When** the page loads, **Then** the sidebar is hidden and a hamburger icon appears in the top bar.
2. **Given** the sidebar overlay is closed on a small screen, **When** the user taps the hamburger icon, **Then** the sidebar appears as an overlay on top of the content.
3. **Given** the sidebar overlay is open, **When** the user selects a module, **Then** the application navigates to that page and the overlay automatically closes.
4. **Given** the sidebar overlay is open, **When** the user taps outside the overlay or presses Escape, **Then** the overlay closes.

---

### User Story 7 - Placeholder Pages for All Modules (Priority: P1)

Every module and submodule in the sidebar has a corresponding placeholder page that displays the translated module name. This ensures all navigation routes are functional and testable.

**Why this priority**: Without placeholder pages, sidebar links lead to errors. These pages are the minimum scaffolding needed to validate the entire navigation flow end-to-end.

**Independent Test**: Click every sidebar item (and subitem) — each should land on a page showing the translated module name centered on screen, with no errors.

**Acceptance Scenarios**:

1. **Given** a user clicks any module in the sidebar, **When** the page loads, **Then** a placeholder page is displayed showing the translated module name.
2. **Given** a user is on a placeholder page, **When** they switch the language, **Then** the displayed module name updates to the new language.
3. **Given** all sidebar modules exist, **When** a user systematically navigates to every module and submodule, **Then** every route resolves successfully without errors.

---

### Edge Cases

- What happens when the user's session has no user profile data (name/email missing)? The sidebar user section should display a generic fallback (e.g., "User" with a default initial avatar).
- What happens when a sidebar module's route is visited via deep link on first load? The sidebar must correctly expand the parent and highlight the active item.
- What happens when the browser window is resized from desktop to mobile width while the sidebar is expanded? The sidebar should transition to overlay mode without breaking the layout.
- What happens when the user rapidly toggles the sidebar collapse button? The animation should complete gracefully without visual glitches or broken state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a vertical sidebar listing all navigation modules relevant to the current application (Admin modules for web, Guard modules for desktop).
- **FR-002**: The system MUST use a single, centralized navigation configuration that both web and desktop apps consume — adding or removing a module in one place reflects in both apps.
- **FR-003**: All sidebar labels MUST be rendered using the internationalization system — no hardcoded display strings. Labels must update when the user changes language.
- **FR-004**: The sidebar MUST support collapsible parent-child module groups (e.g., Logbook with Visitors/Providers/Residents submodules). Clicking a parent toggles the child list.
- **FR-005**: The sidebar MUST visually indicate the currently active module (and submodule, if applicable) based on the current route.
- **FR-006**: If the user navigates to a parent route that has submodules, the system MUST redirect to the first submodule.
- **FR-007**: The sidebar MUST support a collapsed state (icon-only) and an expanded state (icon + label), toggleable by the user.
- **FR-008**: The user's sidebar collapse preference MUST persist across sessions.
- **FR-009**: In collapsed mode, hovering over an icon MUST show a tooltip with the module name.
- **FR-010**: A user profile section at the bottom of the sidebar MUST display the user's avatar (or initials), name, and email. In collapsed mode, only the avatar is shown.
- **FR-011**: Clicking the user profile section MUST open a menu with "Account" and "Log Out" options.
- **FR-012**: A horizontal top bar MUST be displayed above the content area, fixed in position during scrolling.
- **FR-013**: The top bar MUST contain a theme toggle (light/dark mode) and the existing language switcher, both positioned on the right side.
- **FR-014**: The theme toggle MUST switch the entire application between light and dark modes.
- **FR-015**: On small screens (web only), the sidebar MUST be hidden by default and accessible via a hamburger menu in the top bar, displayed as a dismissible overlay.
- **FR-016**: Every module and submodule route MUST have a corresponding placeholder page that displays the translated module name.
- **FR-017**: All interactive sidebar and top bar elements MUST be keyboard accessible (Tab navigation, Enter/Space activation, Escape to dismiss menus/overlays) and use appropriate ARIA attributes.
- **FR-018**: The sidebar and top bar MUST respect the current theme (light/dark), using the design system's color tokens.

### Key Entities

- **Navigation Item**: A module entry in the sidebar (key, icon name, route, optional sub-items, role visibility, platform visibility).
- **Navigation Sub-Item**: A child entry under a parent module (key, route).
- **User Profile Display**: A representation of the current user's identity in the sidebar (name, email, avatar URL or initials fallback).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to any module in the sidebar within 2 clicks (1 click for top-level modules, 2 clicks for submodules after expanding parent).
- **SC-002**: 100% of sidebar module and submodule routes resolve to a functional page without errors.
- **SC-003**: Switching between light and dark themes applies instantly with no visible flash or layout shift.
- **SC-004**: Changing the language updates all sidebar labels and placeholder page titles without requiring a full page reload.
- **SC-005**: Sidebar collapse/expand preference survives application restart — verified by closing and reopening the app.
- **SC-006**: All sidebar items and top bar controls are reachable via keyboard-only navigation (Tab, Enter, Space, Escape).
- **SC-007**: Adding a new module to the shared navigation configuration makes it appear in the sidebar without modifying any app-specific code.
- **SC-008**: The navigation shell (sidebar + top bar + content area) renders correctly on screen widths from 375px (mobile) to 2560px (ultrawide), with the sidebar transitioning to overlay mode below the responsive breakpoint on web.

## Assumptions

- Role-based filtering of sidebar items is deferred to a future task. For now, the web app renders the full Admin sidebar and the desktop app renders the full Guard sidebar.
- No real authentication data is used for the user profile section — hardcoded or mock data is acceptable for avatar, name, and email.
- The "Log Out" action in the user menu triggers the existing auth logout flow or a stub if no logout is yet implemented.
- The "Account" page is a placeholder — no settings functionality is required.
- The desktop app does not require responsive/mobile behavior (it runs in a fixed-size Electron window).
- The left side of the top bar is intentionally left empty — it is reserved for future features (breadcrumbs, search).

## Out of Scope

- Real role-based filtering of sidebar items based on authenticated user's role.
- Breadcrumb navigation in the top bar.
- Notification bell or other top bar widgets beyond theme and language toggles.
- Any functional page content beyond the placeholder module name display.
- Mobile app navigation (separate repository).
- Search functionality.
