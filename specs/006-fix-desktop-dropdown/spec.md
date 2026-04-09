# Feature Specification: Fix Desktop Sidebar Dropdown Menu

**Feature Branch**: `006-fix-desktop-dropdown`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "the desktop app have a Bug, where the sidebar avatar user dropddown to display account and logout actions are not displayed, when clicking it seems there's more content because the scroll is displayed but not visible at all, only desktop issue"

## User Scenarios & Testing

### User Story 1 - Sidebar Dropdown Menu Displays Account and Logout Options (Priority: P1)

As a desktop app user (any role: guard, admin, resident, or super admin), when I click on my avatar/user info area in the sidebar footer, a dropdown menu should appear showing "Account" and "Logout" options. Currently, clicking the avatar area shows a scroll indicator suggesting content exists, but the menu items are not visible. This is a desktop-only regression; the identical interaction works correctly in the web application.

**Why this priority**: This is a critical usability bug. Without a visible logout option, users cannot securely end their session from the sidebar. Without the account option, users cannot navigate to their profile settings. These are fundamental application actions.

**Independent Test**: Log in to the desktop app as any role. Click the user avatar in the sidebar footer. Verify the dropdown appears with visible "Account" and "Logout" options. Click each to confirm they work.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the desktop app with the sidebar expanded, **When** the user clicks the avatar/user info area in the sidebar footer, **Then** a dropdown menu appears showing "Account" and "Logout" as clearly readable, clickable options
2. **Given** the dropdown menu is open, **When** the user clicks "Account", **Then** the app navigates to the account/profile page
3. **Given** the dropdown menu is open, **When** the user clicks "Logout", **Then** the user is logged out and returned to the login screen
4. **Given** a logged-in user with the sidebar collapsed to icon mode, **When** the user clicks the avatar icon, **Then** the dropdown menu still appears with visible options
5. **Given** the desktop app is in dark mode, **When** the user opens the avatar dropdown, **Then** the menu items are readable with appropriate contrast (light text on dark background)
6. **Given** the desktop app is in light mode, **When** the user opens the avatar dropdown, **Then** the menu items are readable with appropriate contrast (dark text on light background)

---

### User Story 2 - No Regression on Web Sidebar Dropdown (Priority: P2)

The fix must not introduce any regression in the web application's sidebar dropdown, which currently works correctly for all roles and themes.

**Why this priority**: The web app is the primary platform for administrators and residents. Any regression there would affect the majority of users.

**Independent Test**: After applying the fix, log in to the web app as any role. Click the sidebar avatar. Verify the dropdown still shows Account and Logout options correctly in both light and dark themes.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the web app, **When** the user clicks the avatar in the sidebar footer, **Then** the dropdown menu shows "Account" and "Logout" options with correct styling (same behavior as before the fix)

---

### Edge Cases

- What happens when the sidebar is collapsed to icon mode and the user clicks the avatar?
- What happens when the desktop window is resized to a very narrow width while the dropdown is open?
- How does the dropdown behave in both light and dark themes on the desktop?
- What happens if the user rapidly clicks the avatar area (toggle open/close)?

## Requirements

### Functional Requirements

- **FR-001**: The desktop sidebar footer dropdown MUST display "Account" and "Logout" menu items as visible, readable text when the avatar/user info area is clicked
- **FR-002**: The dropdown menu items MUST be clickable and trigger their respective actions (navigate to account page, log out)
- **FR-003**: The dropdown MUST render with correct visual contrast in both light and dark themes on the desktop app
- **FR-004**: The dropdown MUST work regardless of sidebar state (expanded or collapsed to icon mode)
- **FR-005**: The fix MUST NOT alter the web application's sidebar dropdown behavior
- **FR-006**: The dropdown MUST position itself correctly relative to the trigger element (above the avatar area, as configured with `side="top"`)

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of dropdown interactions on the desktop app result in visible, readable "Account" and "Logout" options appearing
- **SC-002**: Users can complete the logout action from the sidebar dropdown within 2 clicks (click avatar, click Logout)
- **SC-003**: Dropdown menu items maintain readable contrast ratio (4.5:1 minimum per WCAG AA) in both light and dark themes
- **SC-004**: Zero regressions in the web application's sidebar dropdown behavior after the fix is applied

## Assumptions

- The desktop app uses the same shared UI component library (`@ramcar/ui`) as the web app for the sidebar and dropdown components
- The dropdown menu uses a portal-based rendering strategy that renders content outside the sidebar's DOM hierarchy
- The desktop and web apps may use different underlying library versions or rendering engines that affect component behavior
- The web app's sidebar dropdown currently works correctly and can serve as the reference behavior
- The bug manifests visually as a dropdown container that opens (scroll bar appears) but whose internal content (menu items) is not painted or readable
