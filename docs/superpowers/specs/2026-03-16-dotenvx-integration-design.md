# dotenvx Integration Design

## Overview

Integrate [dotenvx](https://dotenvx.com/) into the RamcarSoftPlatform monorepo to encrypt environment variables and commit them safely to git. This replaces the current approach of gitignored plaintext `.env` files with encrypted files that are version-controlled, enabling reproducible environments and straightforward CI/CD key distribution.

## Goals

1. **Encrypted secrets in git** — `.env.local`, `.env.development`, and `.env` (production) are encrypted and committed
2. **Multi-environment switching** — explicit `-f` flag selects which environment to decrypt
3. **CI/CD-ready key distribution** — decryption keys can be injected as pipeline secrets
4. **Minimal config** — single wrapper at the Turborepo level, all apps inherit vars

## Non-Goals

- Per-app `.env` files (deferred — root-level only for now)
- Env validation (separate concern, not part of this integration)
- CI/CD pipeline setup (design accounts for it, but not implemented yet)

## Environments

| File | Purpose | URLs point to | Default for |
|------|---------|---------------|-------------|
| `.env.local` | Local development | `localhost` / `127.0.0.1` (local Supabase, local API) | `pnpm dev`, `pnpm test`, `db:*` |
| `.env.development` | Remote dev/staging | Remote Supabase dev project, remote APIs | `pnpm dev:remote` |
| `.env` | Production | Production Supabase, production APIs | `pnpm build:production` |

## File Structure

```
ramcar-platform/
├── .env.local                # encrypted, committed — localhost URLs
├── .env.development          # encrypted, committed — remote dev URLs
├── .env                      # encrypted, committed — production URLs
├── .env.keys                 # decryption keys, NEVER committed
├── .env.example              # plaintext template with placeholder values, committed
```

## Gitignore Changes

Root `.gitignore` env section — full before/after:

```diff
 # env
-.env
-.env*.local
+# dotenvx - keys are NEVER committed
+.env.keys
```

The old bare `.env` rule and `.env*.local` rule are both removed — all three env files (`.env`, `.env.local`, `.env.development`) are now encrypted and safe to commit. Only `.env.keys` (the decryption keys) must be gitignored.

`apps/web/.gitignore` and `apps/www/.gitignore` keep their `.env*` ignore rules since env files live at the root only. `supabase/.gitignore` already ignores `.env.keys`.

## Package Scripts

Root `package.json` scripts wrap Turborepo with dotenvx:

```jsonc
{
  "scripts": {
    "dev": "dotenvx run -f .env.local -- turbo dev",
    "dev:remote": "dotenvx run -f .env.development -- turbo dev",
    "build": "dotenvx run -f .env.local -- turbo build",
    "build:development": "dotenvx run -f .env.development -- turbo build",
    "build:production": "dotenvx run -f .env -- turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "dotenvx run -f .env.local -- turbo test",
    "db:start": "dotenvx run -f .env.local -- supabase start",
    "db:migrate": "dotenvx run -f .env.local -- supabase db push",
    "db:new": "supabase migration new",
    "db:types": "dotenvx run -f .env.local -- supabase gen types typescript --local > packages/db-types/src/types.ts",
    "db:reset": "dotenvx run -f .env.local -- supabase db reset"
  }
}
```

- `dotenvx` installed as a root `devDependency`
- Only commands that need env vars are wrapped — `lint`, `typecheck`, and `db:new` are not
- **`pnpm dev`** defaults to `.env.local` (localhost URLs) — the most common workflow
- **`pnpm dev:remote`** uses `.env.development` for testing against remote Supabase dev instance
- **`pnpm build:production`** explicitly uses `.env` (production) for CI/CD or intentional production builds
- All `db:*` scripts use `.env.local` since they target the local Supabase instance
- Ad-hoc usage: `dotenvx run -f .env.local -- <any command>`

## Turbo.json

Update `globalEnv` to cover all env vars that affect builds:

```diff
 "globalEnv": [
   "NEXT_PUBLIC_*",
-  "SUPABASE_*"
+  "SUPABASE_*",
+  "PORT",
+  "LINEAR_*",
+  "SENDGRID_*",
+  "OPENAI_*"
 ]
```

Without these additions, changing `PORT`, `LINEAR_API_KEY`, etc. would not invalidate Turbo's cache, leading to stale builds. Since dotenvx injects vars into the process environment before Turbo runs, cache invalidation works correctly once the vars are listed.

## Environment Variables

Adopts Supabase's new API key naming (per [deprecation notice](https://github.com/orgs/supabase/discussions/29260)):

| Variable | Description | Exposed to browser |
|----------|-------------|-------------------|
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_PUBLISHABLE_KEY` | Replaces `SUPABASE_ANON_KEY` | No |
| `SUPABASE_SECRET_KEY` | Replaces `SUPABASE_SERVICE_ROLE_KEY` | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for browser clients | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Replaces `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `PORT` | API server port | No |
| `LINEAR_API_KEY` | Linear issue tracker API key | No |
| `LINEAR_TEAM_ID` | Linear team identifier | No |
| `SENDGRID_API_KEY` | Email delivery (Supabase Auth) | No |
| `OPENAI_API_KEY` | Supabase Studio AI features | No |

**Supabase key migration note:** Legacy `anon` and `service_role` keys are being phased out through late 2026. Since this project is greenfield, we adopt the new `publishable`/`secret` naming from the start.

### Electron Desktop App Note

The desktop app runs two processes (main + renderer). When `dotenvx run -- turbo dev` spawns the Electron dev command, the main process inherits all env vars. The Vite dev server for the renderer is spawned by the main process and also inherits them. Renderer-accessible vars must use the `VITE_` prefix and be defined in `apps/desktop/vite.config.ts` via `define` or Vite's built-in `.env` support. For now, the desktop app primarily needs env vars in the main process (Supabase sync, SQLite), so no special handling is required. If the renderer needs vars in the future, expose them through Vite's `define` config.

## Updating Secrets Workflow

To add or change a secret:

1. **Decrypt:** `dotenvx decrypt -f .env.development`
2. **Edit:** modify the plaintext `.env.development`
3. **Re-encrypt:** `dotenvx encrypt -f .env.development`
4. **Commit:** the re-encrypted file (`.env.keys` is unchanged)

## CI/CD Key Distribution (Design Only)

`.env.keys` contains one private key per environment:

```
DOTENV_PRIVATE_KEY_LOCAL=...
DOTENV_PRIVATE_KEY_DEVELOPMENT=...
DOTENV_PRIVATE_KEY_PRODUCTION=...
```

In CI, the relevant key is set as a pipeline secret. dotenvx auto-detects it from the environment:

```yaml
# GitHub Actions example
env:
  DOTENV_PRIVATE_KEY_PRODUCTION: ${{ secrets.DOTENV_PRIVATE_KEY_PRODUCTION }}
steps:
  - run: pnpm build:production  # dotenvx decrypts .env using the env var
```

For now, `.env.keys` is stored locally and backed up in a secure vault (e.g., 1Password).

### Developer Onboarding

When a new developer joins:

1. Download `.env.keys` from the team's 1Password vault (or receive it securely)
2. Place it at the monorepo root (`ramcar-platform/.env.keys`)
3. Run `pnpm dev` — dotenvx will auto-decrypt `.env.local` using the keys
4. Verify: `dotenvx run -f .env.local -- printenv | grep SUPABASE` should show the local Supabase vars

## Migration Steps

1. Install `dotenvx` as root devDependency
2. Create `.env.local` with localhost URLs (local Supabase at `127.0.0.1:54321`, local API at `localhost:3000`)
3. Consolidate current `.env` and `.env.development` into a new plaintext `.env.development` with remote dev URLs
4. Create `.env` with production values
5. Run `dotenvx encrypt` to encrypt all three files in-place
6. Create `.env.example` with placeholder values (see below)
7. Update `.gitignore` (remove bare `.env` and `.env*.local` rules, add `.env.keys`)
8. Update `turbo.json` `globalEnv` with additional vars
9. Update root `package.json` scripts to wrap with `dotenvx run`
10. Remove old unencrypted env files from git tracking
11. Commit encrypted files + updated config

### `.env.example` Contents

```bash
# Supabase — URLs differ per environment:
#   .env.local:       http://127.0.0.1:54321 (local Supabase)
#   .env.development: https://your-project.supabase.co (remote dev)
#   .env:             https://your-project.supabase.co (production)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key

# Next.js public vars (same URL pattern as above)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# API
PORT=3000

# Linear
LINEAR_API_KEY=your-linear-api-key
LINEAR_TEAM_ID=your-team-id

# External services
SENDGRID_API_KEY=your-sendgrid-key
OPENAI_API_KEY=your-openai-key
```

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Losing `.env.keys` = losing access to secrets | Back up in 1Password or similar vault |
| Accidentally committing `.env.keys` | `.gitignore` rule + pre-commit hook (optional) |
| dotenvx version drift across team | Pinned version in `package.json` |
| Framework-specific env loading conflicts | dotenvx injects before frameworks load, taking precedence |
