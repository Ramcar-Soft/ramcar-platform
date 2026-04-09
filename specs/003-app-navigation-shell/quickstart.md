# Quickstart: App Navigation Shell

**Feature**: 003-app-navigation-shell  
**Date**: 2026-04-08

## Prerequisites

- Node.js 22 LTS
- pnpm installed globally
- Repository cloned and on branch `003-app-navigation-shell`

## Setup

```bash
# Install dependencies (from repo root)
pnpm install

# Start all apps in development
pnpm dev
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `packages/shared/src/navigation/sidebar-config.ts` | Single source of truth for all sidebar modules |
| `packages/i18n/src/messages/en.json` | English translations (sidebar.* keys) |
| `packages/i18n/src/messages/es.json` | Spanish translations (sidebar.* keys) |
| `packages/ui/src/components/ui/sidebar.tsx` | shadcn sidebar primitives |
| `apps/web/src/features/navigation/` | Web app sidebar + top bar wrappers |
| `apps/web/src/app/[locale]/(dashboard)/layout.tsx` | Web navigation shell layout |
| `apps/desktop/src/features/navigation/` | Desktop app sidebar + top bar wrappers |
| `packages/store/src/slices/sidebar-slice.ts` | Desktop sidebar state (collapse, current path) |
| `packages/store/src/slices/theme-slice.ts` | Desktop theme state |

## Adding a New Module to the Sidebar

1. **Edit** `packages/shared/src/navigation/sidebar-config.ts`:
   ```ts
   {
     key: "new-module",
     icon: "IconName",       // Any Lucide icon name
     route: "/new-module",
     roles: ["admin"],
     platforms: ["web"],
   }
   ```

2. **Add translations** in `packages/i18n/src/messages/en.json` and `es.json`:
   ```json
   {
     "sidebar": {
       "new-module": "New Module"
     }
   }
   ```

3. **Create the page**:
   - Web: `apps/web/src/app/[locale]/(dashboard)/new-module/page.tsx`
   - Desktop: `apps/desktop/src/features/new-module/pages/new-module-page.tsx` + register in page router

4. **Done** — the sidebar picks up the new item automatically.

## Adding a Submodule

Same as above, but nest under a parent:

```ts
{
  key: "parent-module",
  icon: "ParentIcon",
  route: "/parent-module",
  subItems: [
    { key: "child-a", route: "/parent-module/child-a" },
    { key: "child-b", route: "/parent-module/child-b" },
  ],
  roles: ["admin"],
  platforms: ["web"],
}
```

Translation keys: `sidebar.parent-module.child-a`, `sidebar.parent-module.child-b`

## Testing the Navigation

1. Start dev servers: `pnpm dev`
2. Open web app (default: `http://localhost:3000`)
3. Log in with test credentials
4. Click through every sidebar item — each should show a placeholder page with the module name
5. Toggle sidebar collapse — should animate and persist across refresh
6. Toggle theme — should switch light/dark
7. Switch language — all labels should update
8. Resize browser to mobile width — sidebar should become a sheet overlay

For desktop:
1. Start desktop dev: `cd apps/desktop && pnpm dev`
2. Log in
3. Same checks as web but for Guard modules (Dashboard, Access Log, Patrols)

## Architecture Decisions

- See [research.md](research.md) for all technical decisions and alternatives considered
- See [contracts/sidebar-config.md](contracts/sidebar-config.md) for the shared config API
- See [contracts/component-api.md](contracts/component-api.md) for component contracts
