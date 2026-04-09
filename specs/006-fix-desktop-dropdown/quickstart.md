# Quickstart: Fix Desktop Sidebar Dropdown Menu

## Verification Scenarios

### Scenario 1: Dropdown Displays Menu Items (Primary)

1. Start the desktop app: `pnpm --filter desktop dev`
2. Log in with any user account (guard, admin, resident)
3. In the sidebar footer, click the user avatar/info area
4. **Expected**: A dropdown menu appears above the avatar area showing:
   - "Account" option with a user icon
   - "Logout" option with a logout icon
   - Both items have readable text with proper contrast
5. Click "Account" → navigates to the account page
6. Click the avatar again → click "Logout" → returns to login screen

### Scenario 2: Sidebar Collapsed Mode

1. With the desktop app running, collapse the sidebar to icon mode (click the rail or use keyboard shortcut Ctrl+B)
2. Click the small avatar icon in the collapsed sidebar footer
3. **Expected**: Dropdown appears with visible "Account" and "Logout" options
4. Both actions work correctly

### Scenario 3: Dark Mode

1. Switch the desktop app to dark mode (if theme toggle exists) or set system to dark mode
2. Click the avatar in the sidebar footer
3. **Expected**: Dropdown renders with dark background and light text (proper contrast)
4. Both menu items are clearly readable

### Scenario 4: Light Mode

1. Switch to light mode
2. Click the avatar in the sidebar footer
3. **Expected**: Dropdown renders with light background and dark text (proper contrast)
4. Both menu items are clearly readable

### Scenario 5: No Web Regression

1. Start the web app: `pnpm --filter web dev`
2. Log in with any user account
3. Click the sidebar avatar/user info area
4. **Expected**: Dropdown shows "Account" and "Logout" with correct styling (unchanged behavior)
5. Both actions work correctly

### Scenario 6: Build Verification

1. Run `pnpm typecheck` — all workspaces pass
2. Run `pnpm lint` — all workspaces pass
3. Run `pnpm build` — all workspaces build successfully
