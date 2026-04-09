# Feature Specification: Role-Based Navigation & Access Control

**Feature Branch**: `005-role-based-navigation`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "Finish the implementation of role-based access for routes and sidebar modules. Use user role to build sidebar menu options. Display a post-login loading animation to allow time for role fetching and prevent UI flashing. Ensure Supabase-related code is separated from React components into hooks or contexts. Review Supabase client usage patterns across web and desktop apps."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Role-Appropriate Sidebar Menu (Priority: P1)

An authenticated user logs in and sees only the sidebar menu items that correspond to their assigned role and platform. An Admin on the web portal sees management modules (catalogs, logbook, projects, etc.) while a Resident on the same portal sees only their relevant modules (dashboard, complaints, amenities, my visits). A Guard on the desktop app sees patrol and access log modules only.

**Why this priority**: This is the core of the feature — without role-filtered menus, users are exposed to functionality they cannot use, creating confusion and a false sense of access. This is the minimum viable deliverable.

**Independent Test**: Log in as each role (Super Admin, Admin, Guard, Resident) on both web and desktop platforms and verify only the permitted menu items appear.

**Acceptance Scenarios**:

1. **Given** a user with the "admin" role logs into the web portal, **When** the sidebar loads, **Then** the sidebar displays only modules assigned to the "admin" role for the "web" platform (dashboard, catalogs, logbook, visits-and-residents, projects, wifi, complaints, amenities, announcements, lost-and-found, history, blacklist).
2. **Given** a user with the "resident" role logs into the web portal, **When** the sidebar loads, **Then** the sidebar displays only modules assigned to the "resident" role for the "web" platform (dashboard, complaints, amenities, my visits).
3. **Given** a user with the "guard" role logs into the desktop app, **When** the sidebar loads, **Then** the sidebar displays only modules assigned to the "guard" role for the "desktop" platform (dashboard, patrols, access log with sub-items).
4. **Given** a user with the "super_admin" role logs in on any platform, **When** the sidebar loads, **Then** the sidebar displays all modules available for that platform.
5. **Given** a user whose role changes (e.g., promoted from Resident to Admin), **When** they log in again, **Then** the sidebar reflects the updated role's menu items.

---

### User Story 2 - Smooth Post-Login Loading Experience (Priority: P2)

After a user successfully authenticates, a visually polished loading screen is displayed while the system retrieves the user's role and prepares the navigation. This prevents users from seeing a flash of empty content, a flash of wrong menu items, or a layout shift as the sidebar populates.

**Why this priority**: First impressions after login define perceived quality. A loading screen eliminates jarring visual artifacts and provides a professional transition into the application, while also allowing the system time to fetch session data without the user noticing latency.

**Independent Test**: Log in and verify that a loading animation is displayed immediately after authentication and disappears once the sidebar and main content are fully rendered.

**Acceptance Scenarios**:

1. **Given** a user submits valid login credentials, **When** authentication succeeds, **Then** a loading animation is displayed before any dashboard content or sidebar appears.
2. **Given** the loading screen is displayed, **When** the user's role and navigation data have been fully retrieved, **Then** the loading screen transitions smoothly to the full application view (sidebar + content).
3. **Given** the loading screen is displayed, **When** more than 10 seconds elapse without completing the load, **Then** the system displays a friendly message indicating a delay and offers a retry option.
4. **Given** a user is already authenticated and refreshes the page, **When** the page reloads, **Then** the loading screen is displayed briefly while session data is revalidated, preventing content flashing.

---

### User Story 3 - Route-Level Access Protection (Priority: P3)

If a user attempts to navigate to a route they are not authorized for (e.g., by typing a URL directly), the system blocks access and redirects them to an appropriate page. This prevents unauthorized access to features beyond what the sidebar alone controls.

**Why this priority**: Sidebar filtering alone is not sufficient security — users can still access routes via direct URL entry. Route-level protection is essential for enforcing the access model and preventing data exposure.

**Independent Test**: Log in as a Resident and manually navigate to an Admin-only route (e.g., /catalogs); verify redirection to the dashboard.

**Acceptance Scenarios**:

1. **Given** a user with the "resident" role is authenticated on the web portal, **When** they navigate directly to `/catalogs` (an admin-only route), **Then** they are redirected to their default permitted page (dashboard).
2. **Given** a user with the "guard" role is authenticated on the desktop app, **When** they attempt to navigate to a route not assigned to the "guard" role, **Then** they are redirected to the dashboard.
3. **Given** a user with the "admin" role is authenticated, **When** they navigate to any route assigned to the "admin" role, **Then** the page renders normally without redirection.
4. **Given** an unauthenticated user, **When** they attempt to access any protected route, **Then** they are redirected to the login page (existing behavior preserved).

---

### User Story 4 - Accurate User Identity Display (Priority: P4)

The sidebar footer displays the actual logged-in user's name, email, and role — not hardcoded placeholder values. This applies to both the web portal and the desktop app.

**Why this priority**: Displaying hardcoded "Admin" text regardless of who is logged in is misleading and erodes user trust. Accurate identity display also helps users confirm they are logged into the correct account.

**Independent Test**: Log in as different users and verify the sidebar footer shows each user's real name, email, and avatar initial.

**Acceptance Scenarios**:

1. **Given** a user named "María García" with email "maria@example.com" is logged in on the web portal, **When** the sidebar renders, **Then** the footer shows "María García", "maria@example.com", and the initial "M" in the avatar.
2. **Given** a user is logged in on the desktop app, **When** the sidebar renders, **Then** the footer shows the user's actual name, email, and initial (existing desktop behavior preserved and verified).

---

### User Story 5 - Centralized Session State Management (Priority: P5)

User authentication state (session, profile, role) is managed centrally rather than being fetched independently by each component. This ensures consistent behavior across the application, reduces redundant network calls, and makes it easier to maintain and extend authentication logic in the future.

**Why this priority**: Without centralized state, individual components make their own session calls, leading to inconsistencies, race conditions, and duplicated logic scattered throughout the codebase. This is foundational for the other user stories (particularly P1 and P4) to work reliably.

**Independent Test**: Navigate through multiple pages and features; verify that user state is consistent across all components and that session information is not fetched redundantly on each navigation.

**Acceptance Scenarios**:

1. **Given** a user is authenticated on the web portal, **When** they navigate between pages, **Then** the user's identity and role remain consistent across all components without re-fetching session data on every navigation.
2. **Given** a user is authenticated on the desktop app, **When** they navigate between features, **Then** the user's identity and role remain consistent (verifying existing desktop behavior is maintained).
3. **Given** a user logs out, **When** the session is cleared, **Then** all components immediately reflect the logged-out state and the user is redirected to the login page.

---

### Edge Cases

- What happens when a user's role is missing or null in their profile? The system should treat them as having the most restrictive access (equivalent to no role) and redirect to a "contact your administrator" page.
- What happens when the sidebar configuration defines a module for a platform/role combination that has no corresponding route/page implemented yet? The menu item should still appear but navigate to a "coming soon" or placeholder page rather than a broken route.
- What happens when the role fetch fails due to a network error? The loading screen should show an error state with a retry option rather than displaying a broken sidebar.
- What happens when a user has an active session but their role was revoked by an administrator? On the next page navigation or session revalidation, the system should re-fetch the role and update the sidebar accordingly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST filter sidebar menu items based on the authenticated user's role and the current platform (web or desktop) before rendering the navigation.
- **FR-002**: System MUST display a loading screen with a visual animation immediately after successful authentication and during initial session restoration (page refresh), persisting until the user's role is resolved and the navigation is fully prepared.
- **FR-003**: System MUST block access to routes that are not assigned to the authenticated user's role, redirecting unauthorized route access to the user's default permitted page (dashboard).
- **FR-004**: System MUST display the authenticated user's actual name, email, and avatar initial in the sidebar footer on both web and desktop platforms.
- **FR-005**: System MUST manage authentication state (session, user profile, role) through a centralized mechanism rather than direct per-component authentication service calls, ensuring all components share a single source of truth for the current user's state.
- **FR-006**: System MUST gracefully handle the absence of a user role by restricting navigation to the most limited set and displaying guidance to contact an administrator.
- **FR-007**: System MUST handle session loading failures (network errors, timeouts) by displaying an error state with a retry option instead of rendering a broken or empty interface.
- **FR-008**: System MUST ensure the loading screen transition to the full application view is seamless — no flash of empty content, no flash of incorrect menu items, and no layout shift during the transition.
- **FR-009**: System MUST preserve existing platform-based filtering logic (web items for web, desktop items for desktop) in addition to applying role-based filtering.
- **FR-010**: System MUST redirect a user to the login page if their session is invalid or expired (preserving existing behavior).

### Key Entities

- **User Profile**: Represents the authenticated user's identity including their name, email, tenant association, and assigned role. The role determines which navigation items and routes the user can access.
- **Sidebar Item**: A navigation entry with an associated set of permitted roles and platforms. Items may contain nested sub-items. Only items matching the user's role and current platform are displayed.
- **Role**: One of four access levels (Super Admin, Admin, Guard, Resident) that governs which modules and routes a user can access. Super Admin has the broadest access; each subsequent role has progressively more focused access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sidebar menu items displayed to a user match their assigned role and platform — no unauthorized items visible.
- **SC-002**: Users see a loading screen within 200ms of completing authentication — no flash of empty or incorrect content.
- **SC-003**: 100% of direct URL navigation attempts to unauthorized routes result in redirection to the user's default page.
- **SC-004**: Sidebar footer displays the correct user identity (name, email, initial) for every authenticated session.
- **SC-005**: User profile and role data is fetched once per session establishment (login or page refresh), not redundantly on each navigation or component render.
- **SC-006**: Session loading failures display an actionable error state within 10 seconds rather than leaving the user on a blank or broken screen.
- **SC-007**: All four roles (Super Admin, Admin, Guard, Resident) have correct navigation filtering on both web and desktop platforms.

## Assumptions

- User roles are already stored in the authentication provider's metadata (app_metadata.role) and do not require database schema changes.
- The existing sidebar configuration (`sidebarItems` with `roles` and `platforms` arrays) is the single source of truth for which menu items each role can access on each platform.
- The existing `getItemsForRole()` utility function correctly implements the filtering logic and can be used as-is.
- Role changes happen at the administrator level and take effect on the user's next login or session refresh — real-time role revocation mid-session is not required.
- The loading screen animation uses only CSS-based animations (Tailwind CSS utilities) and does not require external animation libraries.
- The desktop app already has a centralized auth state pattern via its store; the web app needs to adopt a similar centralized pattern.

## Scope Boundaries

### In Scope

- Role-based sidebar menu filtering for web and desktop apps
- Post-login and page-refresh loading screen
- Route-level access protection based on user role
- Accurate user identity display in sidebar footer
- Centralized auth state management for the web app
- Review and alignment of Supabase client usage patterns with project coding standards

### Out of Scope

- Changes to the role assignment workflow (how admins assign roles to users)
- Mobile app navigation (separate repository)
- Backend API role enforcement (NestJS guards — handled separately)
- Database schema changes or migrations
- New role creation or modification of existing role definitions
- Multi-factor authentication or session management changes
- Admin UI for managing role-permission mappings
