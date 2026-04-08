# Feature Specification: Authentication — Web & Desktop

**Feature Branch**: `001-auth-login`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Authentication web & Desktop — Create login page for web & desktop, create mock users for admin/guard/resident for local development, create temporary initial home page for web & desktop, login should use Supabase Auth to save the session and be used for subsequent API requests"

## Clarifications

### Session 2026-04-07

- Q: Are roles restricted to specific platforms (guards→desktop, admin/resident→web)? → A: No. All roles (Admin, Guard, Resident) can log in on both web and desktop. The system is platform-agnostic for authentication.
- Q: Should the SuperAdmin role be included in this feature? → A: No. SuperAdmin uses the same auth mechanism but is excluded from this feature's scope — no mock user, no explicit testing. It will be managed separately.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — User Logs In via Web Portal (Priority: P1)

A user of any role (Admin, Guard, or Resident) navigates to the web portal and is presented with a login page. They enter their email and password, submit the form, and are authenticated. Upon successful login they are redirected to a temporary home/dashboard page that confirms their identity and role. The session persists across page reloads so the user does not need to log in again until the session expires.

**Why this priority**: Authentication is the foundational gate for every other feature. Without a working login flow on web, no subsequent feature can be developed or tested. All roles must be able to access the web portal.

**Independent Test**: Can be fully tested by navigating to the web app, entering valid credentials for any role, and verifying redirection to the home page with the correct role displayed.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user visits the web portal, **When** they land on any protected route, **Then** they are redirected to the login page.
2. **Given** a user is on the login page, **When** they enter valid credentials (any role: Admin, Guard, or Resident) and submit, **Then** they are authenticated and redirected to the home page showing their name and role.
3. **Given** a user is on the login page, **When** they enter an incorrect password, **Then** an error message is displayed and they remain on the login page.
4. **Given** a user is on the login page, **When** they enter a non-existent email, **Then** an error message is displayed (without revealing whether the email exists).
5. **Given** an authenticated user refreshes the browser, **When** the page reloads, **Then** they remain authenticated and on the home page.

---

### User Story 2 — User Logs In via Desktop App (Priority: P1)

A user of any role opens the Electron desktop application. They see a login screen, enter their credentials, and are authenticated. Upon success they see a temporary home screen confirming their identity and role. The session is saved locally so the user stays logged in even if the app is restarted.

**Why this priority**: The desktop app must support authentication independently of the web app for all roles. Guards primarily use the desktop app at guard booths, but admins and residents may also use it.

**Independent Test**: Can be fully tested by launching the desktop app, entering valid credentials for any role, and verifying the home screen displays the correct role. Restart the app and verify the session persists.

**Acceptance Scenarios**:

1. **Given** the desktop app is launched without an active session, **When** the app opens, **Then** the login screen is displayed.
2. **Given** a user is on the login screen, **When** they enter valid credentials (any role: Admin, Guard, or Resident) and submit, **Then** they are authenticated and see the home screen with their name and role.
3. **Given** a user enters invalid credentials, **When** they submit, **Then** an error message is displayed and they remain on the login screen.
4. **Given** an authenticated user closes and reopens the desktop app, **When** the app restarts, **Then** they remain authenticated and see the home screen (session persistence).

---

### User Story 3 — Developer Seeds Mock Users for Local Development (Priority: P2)

A developer setting up the project locally can seed the database with predefined test users for each role (admin, guard, resident). These mock users have known credentials documented in the project so any team member can immediately log in and test any role without manual user creation.

**Why this priority**: Mock users are essential for development velocity. Without them, every developer must manually create test accounts, slowing onboarding and testing.

**Independent Test**: Can be tested by running the database seed command and then logging in with each mock user's documented credentials.

**Acceptance Scenarios**:

1. **Given** a developer has a fresh local database, **When** they run the seed command, **Then** at least three mock users are created: one admin, one guard, and one resident.
2. **Given** mock users exist in the local database, **When** a developer logs in with any mock user's credentials on web or desktop, **Then** authentication succeeds and the correct role is displayed.
3. **Given** mock users are seeded, **When** a developer checks the seed documentation, **Then** all mock user emails and passwords are clearly listed.

---

### User Story 4 — Authenticated User Logs Out (Priority: P2)

An authenticated user (any role, any platform) can log out. Upon logout, the session is destroyed and they are returned to the login page. Subsequent visits to protected pages redirect back to login.

**Why this priority**: Logout is a basic security requirement and completes the authentication lifecycle.

**Independent Test**: Can be tested by logging in, clicking logout, and verifying redirection to the login page. Then attempting to access a protected route and confirming redirection to login.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the web portal, **When** they click the logout button, **Then** their session is destroyed and they are redirected to the login page.
2. **Given** an authenticated user on the desktop app, **When** they click the logout button, **Then** their session is destroyed and they see the login screen.
3. **Given** a user has logged out, **When** they try to navigate to a protected page, **Then** they are redirected to the login page.

---

### Edge Cases

- What happens when a user's session token expires while they are actively using the app? The system should detect the expired session and redirect to login with a "Session expired" message.
- What happens when a user attempts to log in with an account that has been deactivated? The system should display a generic authentication error without revealing account status.
- What happens when the network is unavailable on the desktop app during login? The system should display a clear "No connection" error. (Note: offline access for already-authenticated guards will be addressed in a future offline-first feature.)
- What happens when multiple login attempts fail consecutively? Supabase Auth provides built-in rate limiting; the system should display appropriate messaging when rate-limited.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present a login page requiring email and password on both web and desktop platforms. All roles (Admin, Guard, Resident) are permitted to log in on either platform.
- **FR-002**: System MUST authenticate users via Supabase Auth using email/password credentials.
- **FR-003**: System MUST persist the authenticated session so users remain logged in across page reloads (web) and app restarts (desktop).
- **FR-004**: System MUST redirect unauthenticated users to the login page when they attempt to access any protected route.
- **FR-005**: System MUST display the authenticated user's name and role (Admin, Guard, or Resident) on the temporary home page after login.
- **FR-006**: System MUST provide a logout action that destroys the session and returns the user to the login page.
- **FR-007**: System MUST display user-friendly error messages for failed authentication attempts without revealing whether an email exists in the system.
- **FR-008**: System MUST include a database seed mechanism that creates at least three mock users (one per role: Admin, Guard, Resident) with documented credentials for local development.
- **FR-009**: System MUST use the authenticated session token for all subsequent API requests to the backend.
- **FR-010**: System MUST display a temporary home page for each platform (web and desktop) that serves as a landing page after successful authentication.
- **FR-011**: System MUST differentiate the home page experience based on the user's role (at minimum, display the role name; distinct layouts per role are optional for this feature).

### Key Entities

- **User**: Represents a person who can authenticate. Key attributes: email, name, role (Admin, Guard, Resident), tenant association.
- **Session**: Represents an active authenticated session. Key attributes: user reference, access token, refresh token, expiry timestamp.
- **Mock User**: A predefined user record created during database seeding for development purposes. Key attributes: known email, known password, assigned role, assigned tenant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the login flow (open app/page, enter credentials, reach home page) in under 10 seconds on both platforms.
- **SC-002**: All three mock users (admin, guard, resident) can successfully log in on both web and desktop platforms.
- **SC-003**: An authenticated user's session survives a page reload (web) or app restart (desktop) without requiring re-authentication.
- **SC-004**: Unauthenticated users are always redirected to the login page — no protected content is ever visible without authentication.
- **SC-005**: After logout, no protected content is accessible until re-authentication.
- **SC-006**: Failed login attempts display an error message within 3 seconds without exposing whether the email exists.

## Assumptions

- Supabase Auth is the sole authentication provider; no third-party OAuth or SSO is needed for this feature.
- The "temporary home page" is a minimal placeholder — it will be replaced by full dashboards in future features.
- The RBAC system beyond login (page-level access control, feature gating per role) is out of scope. This feature only validates that the role is correctly identified and displayed.
- The SuperAdmin role exists in the platform's RBAC hierarchy but is excluded from this feature. SuperAdmin accounts will be managed separately (e.g., direct database configuration or a future admin setup feature). The same authentication mechanism applies to SuperAdmin; it simply is not tested or seeded here.
- 2FA/TOTP is part of the platform's roadmap but is out of scope for this initial authentication feature.
- The desktop app requires network connectivity for initial login. Offline authentication for previously authenticated sessions will be handled in a separate offline-first feature.
- Mock users are for local development only and must never be seeded in production environments.
- Each mock user belongs to a single test tenant for development purposes.
