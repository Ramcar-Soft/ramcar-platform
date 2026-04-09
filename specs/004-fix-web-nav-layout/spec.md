# Feature Specification: Fix Web Navigation Layout Not Rendering

**Feature Branch**: `004-fix-web-nav-layout`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "Bug: Web app dashboard and pages do not render sidebar and topbar navigation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticated User Sees Navigation Shell (Priority: P1)

When an authenticated user accesses the web application at the root URL (`/`), they should see the full navigation shell — sidebar and topbar — wrapping the page content, just as they would on any other dashboard page.

Currently, after login the user lands on the `(protected)` route group page which renders a standalone card with user info (name, email, role, logout button) centered on screen with no sidebar or topbar. The `(dashboard)` route group — which includes the `DashboardShell` with `AppSidebar` and `TopBar` — is only activated for pages explicitly nested inside `(dashboard)/`.

**Why this priority**: Without the sidebar and topbar, users have no way to navigate to any other section of the application after logging in. This is a core usability blocker.

**Independent Test**: Navigate to the root URL after authentication and verify the sidebar and topbar are visible. User should be able to click sidebar links to navigate to other sections.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they access the root URL (`/`), **Then** they see the full navigation shell (sidebar + topbar) wrapping the page content
2. **Given** an authenticated user, **When** they are on any authenticated page, **Then** they always see the sidebar and topbar navigation
3. **Given** an unauthenticated user, **When** they access the root URL, **Then** they are redirected to the login page (no navigation shell visible on login)

---

### User Story 2 - Sidebar Navigation Works Across All Pages (Priority: P1)

All authenticated pages (dashboard, blacklist, patrols, logbook, etc.) must share the same navigation shell so users can move between sections seamlessly.

**Why this priority**: Even once the root page shows navigation, all other dashboard pages must also consistently show the same shell for coherent navigation.

**Independent Test**: Navigate to `/dashboard`, `/blacklist`, `/patrols`, `/logbook`, and any other dashboard route. Verify the sidebar and topbar appear on each page.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the dashboard page, **When** they click a sidebar link to "Patrols," **Then** the Patrols page loads with the same sidebar and topbar still visible
2. **Given** an authenticated user, **When** they navigate to any page within the `(dashboard)` route group, **Then** the sidebar and topbar are rendered consistently

---

### Edge Cases

- What happens when the user navigates directly to a deep link (e.g., `/logbook/visitors`) while authenticated? The navigation shell should still render.
- What happens when the user's session expires mid-navigation? They should be redirected to login without seeing a broken layout.
- What happens when the root page (`/`) is accessed? It should either redirect to `/dashboard` or render within the navigation shell.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the sidebar navigation component on every authenticated page
- **FR-002**: System MUST display the topbar component (with sidebar trigger, theme toggle, language switcher) on every authenticated page
- **FR-003**: The root authenticated route (`/`) MUST either redirect the user to the dashboard page or render the dashboard content within the navigation shell
- **FR-004**: The `(protected)` route group's standalone page (user info card) MUST be removed or relocated so it no longer renders without the navigation shell
- **FR-005**: The login page and other unauthenticated pages MUST NOT display the sidebar or topbar navigation
- **FR-006**: All routes currently under the `(dashboard)` route group MUST continue to render correctly with the navigation shell

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of authenticated pages display both the sidebar and topbar navigation — no authenticated page renders without the navigation shell
- **SC-002**: Users can navigate to any section of the application from any other section using the sidebar, without encountering a page missing navigation
- **SC-003**: The login page remains free of navigation shell elements (sidebar, topbar)
- **SC-004**: Direct URL access to any authenticated page (e.g., bookmarked deep links) renders the full navigation shell
