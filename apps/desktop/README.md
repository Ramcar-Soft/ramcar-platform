# RamcarSoft Desktop

Electron + Vite + React app for the guard booth. Offline-first, syncs to the NestJS API via an outbox + Supabase Realtime.

## Tech stack

- **Electron 30** with `vite-plugin-electron` (main + preload bundled by Vite)
- **React 19** + TypeScript (strict) renderer, **Tailwind 4** + `@ramcar/ui` (shadcn/ui)
- **better-sqlite3** for the local cache + outbox (main process only)
- **Supabase JS** — auth + realtime only in the renderer (no `.from()` / `.rpc()` / `.storage`)
- **TanStack Query v5** for renderer data hooks
- **Zustand** (`@ramcar/store`) for client/UI state
- **react-i18next** + `@ramcar/i18n` shared message catalogs (`en`, `es`)
- **electron-builder** for packaging, **electron-updater** + **electron-log** for auto-updates

## Local development

Prereqs: Node 22 (`.nvmrc`), pnpm (root `packageManager` field), local Supabase running (`pnpm db:start` from repo root).

The renderer needs Supabase credentials at build/dev time. Vite reads them from process env and inlines via `define`:

| Var | Notes |
| --- | --- |
| `SUPABASE_URL` | Local: `http://127.0.0.1:54321`. Loaded by `dotenvx` from `.env.local` at the repo root. |
| `SUPABASE_PUBLISHABLE_KEY` | Local anon key from `supabase status`. |

From the repo root:

```bash
pnpm dev                          # runs all apps via turbo
pnpm --filter=@ramcar/desktop dev # desktop only
```

`pnpm dev` (inside `apps/desktop`) starts Vite + Electron. The renderer hot-reloads; main/preload changes restart Electron.

The auto-updater is **disabled in dev** (guarded by `app.isPackaged`), so the toast and badge will only fire in packaged builds. To preview the badge UX in dev you need to ship a tagged release first (or temporarily mutate `updaterStore` from a devtools-exposed handle).

## Project layout

Two processes, one IPC contract.

```
electron/                  Main process (Node) — bundled to dist-electron/main.js
  main.ts                  App lifecycle, window creation, registers all IPC + services
  preload.ts               Context-bridge — the ONLY contract with the renderer
  preload.d.ts             Renderer-side types for window.api
  ipc/                     IPC handlers (delegate to services/repos, no business logic)
    settings-handlers.ts   get/set-language, app:version
    sync-handlers.ts       sync:status, sync:trigger, sync:outbox-count, sync:set-auth-token
    updater-handlers.ts    updater:install (renderer-triggered quitAndInstall)
    visit-persons-handlers.ts
  services/                Business logic
    sync-engine.ts         Outbox flush loop + Supabase Realtime subscriptions
    auto-updater.ts        electron-updater wiring + broadcast on update-downloaded
  repositories/            ONLY point of contact with SQLite (better-sqlite3)
    database.ts            Connection + migrations
    *-repository.ts        Per-entity CRUD, outbox writes

src/                       Renderer (React + Vite) — bundled to dist/
  App.tsx                  Auth gate → routes to LoginPage or PageRouter
  features/                Feature-based vertical slices (auth, navigation, dashboard, etc.)
  shared/
    components/page-router.tsx   Manual path-based router (no react-router)
    hooks/                       Cross-feature renderer hooks
      use-app-version.ts         Cached IPC fetch of app.getVersion()
      use-pending-update.ts      useSyncExternalStore over updater-store
      use-update-notifier.ts     Mounts the sonner toast on update-downloaded
    lib/
      supabase.ts                AUTH & REALTIME ONLY
      updater-store.ts           Module-level shared state for pending updates
      features/                  Adapters for @ramcar/features (transport, i18n, role, store)

electron-builder.json5     Packaging + publish config
vite.config.ts             Vite + electron plugin entries, env define, externals
```

### Process contract

The renderer can ONLY call what's in `electron/preload.ts`. If it isn't on `window.api`, the renderer can't reach it. When you add a new IPC method:

1. `ipcMain.handle(...)` in an `electron/ipc/*-handlers.ts` file
2. Register the handler in `electron/main.ts` `whenReady`
3. Add the wrapper to `electron/preload.ts`
4. Add the type to the matching interface in `electron/preload.d.ts`

### Offline-first / sync

All writes from the renderer go through IPC → repository → SQLite + outbox. `sync-engine.ts` flushes the outbox to the NestJS API and pulls live updates via Supabase Realtime. State machine: `idle | syncing | error | offline`. Outbox rows carry a UUID `event_id` so the API can dedupe idempotently.

## Build commands

Inside `apps/desktop`:

| Command | Effect |
| --- | --- |
| `pnpm dev` | Vite dev server + Electron with HMR |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint flat config |
| `pnpm test` / `test:watch` / `test:cov` | Vitest |
| `pnpm build` | `tsc && vite build` — compiles renderer + main, no installer |
| `pnpm dist` | Build + `electron-builder` (installer for **current OS only**, no publish) |
| `pnpm release` | Build + `electron-builder --publish always` (uploads to GitHub draft release — see below) |

Output of `dist`/`release`: `apps/desktop/release/<version>/` — DMG on macOS, NSIS `.exe` on Windows, AppImage on Linux, plus `latest.yml` / `latest-mac.yml` / `*.blockmap` files needed by the auto-updater.

### Local installer build

The `apps/desktop` scripts do **not** wrap themselves in `dotenvx`. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` must already be in `process.env` when Vite runs, otherwise `vite.config.ts` bakes `undefined` into the bundle. Run from the repo root wrapped in `dotenvx`, pointing at the env file for the Supabase project the installer should talk to:

```bash
# Prod Supabase
dotenvx run -f .env -- pnpm --filter @ramcar/desktop dist

# Remote dev Supabase
dotenvx run -f .env.development -- pnpm --filter @ramcar/desktop dist
```

`.env.local` points at local Supabase (`127.0.0.1:54321`) and is not useful for an installed app.

To build both Mac and Windows installers from a single Mac host, pass `-mw` to `electron-builder`:

```bash
dotenvx run -f .env -- pnpm --filter @ramcar/desktop exec \
  sh -c 'tsc && vite build && electron-builder -mw'
```

First run pulls a Wine container for the NSIS target. Native modules (`better-sqlite3`) are not cross-compiled — electron-builder fetches the prebuilt Windows binary from npm.

Do **not** use `pnpm release` locally unless you intend to publish — it passes `--publish always` and requires `GH_TOKEN`. Use `pnpm dist` for local artifacts.

### Cross-platform note

`electron-builder` cannot fully cross-build (signing + native modules like `better-sqlite3` need the target platform). Use the GitHub Actions matrix to produce all installers; building the wrong target locally will skip or fail.

## Auto-updater

Wired via `electron-updater`. Lives in `electron/services/auto-updater.ts` and is started from `main.ts` `whenReady`. Behavior:

- **Skipped when `!app.isPackaged`** — dev runs do not check for updates
- Checks GitHub on app start, then every hour
- Auto-downloads any newer version
- `autoInstallOnAppQuit: true` — installs silently when the app quits, even if the user ignores the prompt
- On `update-downloaded`, broadcasts `updater:update-downloaded` to every BrowserWindow with `{ version }`

### What the renderer shows

- **Sonner toast** — appears once per pending version, with "Restart now" / "Later" actions. Mounted via `<UpdateNotifier />` inside `DesktopI18nProvider` in `page-router.tsx`. "Restart now" triggers `quitAndInstall` immediately.
- **Sidebar badge** — persistent indicator in `AppSidebar` header. Shows "Update vX.Y.Z ready" pill (or a small dot when the sidebar is collapsed to icon-only). Clicking it triggers `quitAndInstall`. Stays visible until the user restarts.
- **Version display** — current `app.getVersion()` rendered as muted `vX.Y.Z` text under the "RamcarSoft" header. Hidden when sidebar is collapsed.

Both indicators read from a shared `updaterStore` (`src/shared/lib/updater-store.ts`) backed by `useSyncExternalStore`, so a single IPC subscription keeps both in sync.

i18n keys (in `@ramcar/i18n`):
- `updater.updateReady`, `updater.updateReadyVersion`, `updater.restartNow`, `updater.later` — toast
- `updater.badgeLabel`, `updater.badgeShort` — sidebar pill / tooltip

### Logs

`electron-log` writes to:

- **macOS:** `~/Library/Logs/RamcarSoft/main.log`
- **Windows:** `%USERPROFILE%\AppData\Roaming\RamcarSoft\logs\main.log`
- **Linux:** `~/.config/RamcarSoft/logs/main.log`

All `[auto-updater] ...` events are written here.

## Releasing

The `Desktop Release` GitHub Actions workflow (`.github/workflows/desktop-release.yml`) builds mac + windows in parallel and publishes a draft GitHub Release with installers + `latest.yml` files.

Triggers:
- **Tag push** matching `desktop-v*` → builds and publishes a draft release
- **Manual dispatch** → builds; optionally publishes if `publish` input is checked

Required repo secrets:
- `DESKTOP_SUPABASE_URL`
- `DESKTOP_SUPABASE_PUBLISHABLE_KEY`

Steps to ship:

```bash
# 1. Bump version (electron-updater compares package.json version against latest.yml)
cd apps/desktop
npm version patch          # 0.0.1 → 0.0.2 (or minor / major)
cd ../..
git add apps/desktop/package.json
git commit -m "chore(desktop): release v0.0.2"

# 2. Tag and push
git tag desktop-v0.0.2
git push origin main desktop-v0.0.2
```

The workflow builds, uploads installers + `latest.yml` to a **draft** release. Review and click **Publish** in the GitHub UI. Installed apps will pick up the new version on their next hourly check (or on next app start).

### Caveats

- **Mac auto-update requires code signing.** Squirrel.Mac (used by `electron-updater`) refuses to apply unsigned updates. Until you have an Apple Developer ID + notarization, mac users will need to manually download new DMGs. To enable: set `CSC_LINK` / `CSC_KEY_PASSWORD` (and `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` for notarization) as repo secrets — `electron-builder` picks them up automatically.
- **Windows NSIS auto-update works without signing**, but users see SmartScreen warnings on first install. Sign with `CSC_LINK` / `CSC_KEY_PASSWORD` to remove the warning.
- **`autoInstallOnAppQuit: true`** is intentional for the booth context — the app self-heals on shift-change quits even if no one acts on the toast/badge. Change in `electron/services/auto-updater.ts` if you want explicit-only installs.
- **Forget to bump `version`?** No update fires. `electron-updater` compares `app-update.yml` (baked from `package.json`) against the GitHub `latest.yml`.
- **Draft vs. published.** `releaseType: "draft"` (in `electron-builder.json5`) means installed apps won't see the update until you hit Publish. Switch to `"release"` once you trust the pipeline.

## Adding a new feature

See the root `CLAUDE.md` "Adding New Features" section. Quick decision tree:

- **Bi-app feature (web + desktop)** → author once in `packages/features/src/[domain]/`, both apps render via `<DomainView />`. Wire transport + i18n adapters in each app's `src/shared/lib/features/`.
- **Desktop-only feature** (e.g., `dashboard`, `account`, `patrols`, `access-log`, `auth`) → `src/features/[domain]/` here, route via `src/shared/components/page-router.tsx`.

Offline/sync concerns belong in `electron/services/` + `electron/repositories/` + `electron/ipc/`, never in the renderer.
