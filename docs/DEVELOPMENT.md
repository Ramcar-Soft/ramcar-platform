# Development Guide

Everything a new developer needs to clone the repo and start working.

## Prerequisites

Install these tools before cloning:

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 22 LTS | Runtime (enforced via `.nvmrc` and `engines`) |
| [pnpm](https://pnpm.io/) | 10.28+ | Package manager (enforced via `packageManager` field) |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Required by Supabase CLI to run local containers |
| [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) | Latest | Local Supabase stack (Postgres, Auth, Storage, Realtime) |
| [Git](https://git-scm.com/) | 2.30+ | Version control |

### Node.js via nvm (recommended)

Using [nvm](https://github.com/nvm-sh/nvm) ensures you run the exact Node version the project requires.

```bash
# Install nvm (skip if already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Restart your terminal, then:
nvm install    # reads .nvmrc → installs Node 22
nvm use        # activates Node 22 for this shell
```

> **Tip:** Add `nvm use` to your shell profile or use nvm's [auto-use](https://github.com/nvm-sh/nvm#deeper-shell-integration) feature so Node 22 activates automatically when you `cd` into the project.

### pnpm

```bash
# Via corepack (ships with Node.js)
corepack enable
corepack prepare pnpm@10.28.2 --activate

# Or standalone install
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Docker Desktop

Supabase CLI runs PostgreSQL, Auth, Storage, and other services as Docker containers. Docker Desktop must be running before any `db:*` command.

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Launch Docker Desktop and wait until the engine is running (whale icon in menu bar is steady)
3. Verify: `docker info` should show server info without errors

### Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (any platform)
npm install -g supabase

# Verify
supabase --version
```

## First-Time Setup

### 1. Clone and install

```bash
git clone <repo-url> ramcar-platform
cd ramcar-platform
nvm use          # ensure Node 22
pnpm install     # install all workspace dependencies
```

### 2. Get the environment keys

Environment files (`.env.local`, `.env.development`, `.env`) are **encrypted and committed** to git. You need the decryption keys to use them.

1. Request the `.env.keys` file from the team lead or download it from the team's **1Password vault**
2. Place it at the monorepo root:

```
ramcar-platform/
├── .env.keys          ← place here (gitignored, never committed)
├── .env.local         ← encrypted, already in repo
├── .env.development   ← encrypted, already in repo
├── .env               ← encrypted, already in repo
└── .env.example       ← plaintext reference template
```

3. Verify decryption works:

```bash
pnpm dlx @dotenvx/dotenvx run -f .env.local -- printenv | grep SUPABASE
# Should print SUPABASE_URL=http://127.0.0.1:54321 and other vars
```

> **Never share `.env.keys` over Slack, email, or any unencrypted channel.** Use 1Password or another secure vault.

### 3. Start local Supabase

Make sure Docker Desktop is running first.

```bash
pnpm db:start
```

This pulls and starts the Supabase containers (first run takes a few minutes to download images). When done, it prints the local URLs:

| Service | URL |
|---------|-----|
| API | `http://127.0.0.1:54321` |
| Studio (DB GUI) | `http://127.0.0.1:54323` |
| Inbucket (email testing) | `http://127.0.0.1:54324` |
| Database (Postgres) | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

### 4. Run development servers

```bash
pnpm dev
```

This starts all apps in parallel via Turborepo:

| App | URL | Description |
|-----|-----|-------------|
| `apps/web` | `http://localhost:3000` | Authenticated portal (Admin + Resident) |
| `apps/www` | `http://localhost:3001` | Public landing page |
| `apps/api` | `http://localhost:3002` | NestJS REST API |
| `apps/desktop` | Electron window | Guard booth app |

> **Note:** Ports may vary if already in use. Check the terminal output for actual URLs.

## Environment Variables (dotenvx)

This project uses [dotenvx](https://dotenvx.com/) to encrypt environment variables and commit them safely to git. No more passing `.env` files around — they're in the repo, encrypted.

### How it works

```
.env.local         → encrypted, committed → local dev (localhost URLs)
.env.development   → encrypted, committed → remote dev/staging
.env               → encrypted, committed → production
.env.keys          → decryption keys      → NEVER committed (gitignored)
.env.example       → plaintext template   → committed (reference only)
```

All `pnpm` scripts that need env vars are wrapped with `dotenvx run -f <file> --`:

- `pnpm dev` → decrypts `.env.local` → starts all apps with localhost URLs
- `pnpm dev:remote` → decrypts `.env.development` → starts all apps with remote Supabase
- `pnpm build:production` → decrypts `.env` → builds for production

### Current variables

| Variable | Description | Browser-exposed |
|----------|-------------|----------------|
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_PUBLISHABLE_KEY` | Public/anon key (new naming) | No |
| `SUPABASE_SECRET_KEY` | Service role key (new naming) | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for Next.js client | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public key for Next.js client | Yes |
| `PORT` | NestJS API port | No |
| `LINEAR_API_KEY` | Linear issue tracker | No |
| `LINEAR_TEAM_ID` | Linear team ID | No |
| `SENDGRID_API_KEY` | Email delivery | No |
| `OPENAI_API_KEY` | Supabase Studio AI features | No |

### Adding or changing a secret

```bash
# 1. Decrypt the target file
pnpm dlx @dotenvx/dotenvx decrypt -f .env.local

# 2. Edit the now-plaintext file with your editor
#    Add/modify the variable you need

# 3. Re-encrypt
pnpm dlx @dotenvx/dotenvx encrypt -f .env.local

# 4. Commit the re-encrypted file
git add .env.local
git commit -m "chore: update env variable X"
```

Repeat for `.env.development` or `.env` if the variable applies to those environments.

> **Important:** After encrypting, verify the file looks encrypted (starts with encrypted data, not plaintext). The `.env.keys` file is unchanged — same keys still decrypt the file.

### Running ad-hoc commands with env vars

```bash
# Run any command with local env vars injected
pnpm dlx @dotenvx/dotenvx run -f .env.local -- <your-command>

# Examples
pnpm dlx @dotenvx/dotenvx run -f .env.local -- node scripts/seed.js
pnpm dlx @dotenvx/dotenvx run -f .env.development -- supabase db push
```

## Database Commands

All database commands target the **local** Supabase instance (via `.env.local`). Docker Desktop must be running.

```bash
pnpm db:start       # Start local Supabase containers
pnpm db:reset       # Reset local DB with seed data (supabase/seed.sql)
pnpm db:new <name>  # Create a new migration file in supabase/migrations/
pnpm db:migrate     # Push migrations to the local database
pnpm db:types       # Regenerate TypeScript types → packages/db-types/src/types.ts
```

### Migration workflow

```bash
# 1. Create a migration
pnpm db:new add-visitors-table

# 2. Edit the generated SQL file in supabase/migrations/
#    Write your CREATE TABLE, ALTER, etc.

# 3. Apply to local database
pnpm db:migrate

# 4. Regenerate TypeScript types
pnpm db:types

# 5. Commit migration + updated types
git add supabase/migrations/ packages/db-types/
git commit -m "feat: add visitors table"
```

> **Never edit existing migration files.** Always create a new migration for changes.

### Connecting to local Postgres directly

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Or open **Supabase Studio** at `http://127.0.0.1:54323` for a web-based GUI.

## Available Scripts

Run from the monorepo root:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps (local env) |
| `pnpm dev:remote` | Start all apps (remote/staging env) |
| `pnpm build` | Build all apps and packages (local env) |
| `pnpm build:development` | Build for staging |
| `pnpm build:production` | Build for production |
| `pnpm lint` | ESLint across all workspaces |
| `pnpm typecheck` | TypeScript check across all workspaces |
| `pnpm test` | Run tests across all workspaces |
| `pnpm db:start` | Start local Supabase |
| `pnpm db:reset` | Reset local DB with seed data |
| `pnpm db:new <name>` | Create new migration file |
| `pnpm db:migrate` | Push migrations to local DB |
| `pnpm db:types` | Regenerate TypeScript types from schema |

### Per-app scripts

You can also run scripts for individual apps:

```bash
pnpm --filter @ramcar/web dev       # Only start the web portal
pnpm --filter @ramcar/api dev       # Only start the API
pnpm --filter @ramcar/www dev       # Only start the landing page
pnpm --filter @ramcar/desktop dev   # Only start the desktop app
```

## Monorepo Structure

```
ramcar-platform/
├── apps/
│   ├── web/           Next.js authenticated portal (Admin + Resident)
│   ├── www/           Next.js public landing page
│   ├── api/           NestJS REST API
│   └── desktop/       Electron + Vite + React guard booth app
├── packages/
│   ├── config/        Shared tsconfigs, ESLint, Prettier, Tailwind preset
│   ├── ui/            shadcn/ui design system (shared components)
│   ├── shared/        TypeScript types, Zod validators, utilities
│   ├── store/         Zustand store (shared between web and desktop)
│   └── db-types/      Auto-generated types from Supabase schema
├── supabase/
│   ├── config.toml    Local Supabase configuration
│   ├── migrations/    SQL migration files
│   └── seed.sql       Seed data for local development
├── docs/              Project documentation
├── .env.local         Encrypted env (local dev)
├── .env.development   Encrypted env (staging)
├── .env               Encrypted env (production)
├── .env.keys          Decryption keys (gitignored)
├── .env.example       Plaintext template
├── turbo.json         Turborepo pipeline config
├── pnpm-workspace.yaml
└── package.json
```

## Code Quality

### Linting and formatting

```bash
pnpm lint           # ESLint (flat config, shared via @ramcar/config/eslint)
pnpm typecheck      # TypeScript strict mode check
```

Prettier runs automatically via ESLint integration. Config is shared from `packages/config/prettier.config.mjs`:

- Semicolons: yes
- Single quotes: no (double quotes)
- Trailing commas: all
- Tab width: 2
- Print width: 100

### Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add visitor check-in flow
fix: resolve tenant isolation leak in blacklist query
chore: update dependencies
docs: add API endpoint documentation
```

## Troubleshooting

### `pnpm dev` fails with "missing environment variables"

You're missing `.env.keys`. See [Get the environment keys](#2-get-the-environment-keys).

### `pnpm db:start` fails

1. **Docker not running:** Open Docker Desktop and wait for the engine to start
2. **Port conflict:** Another service is using port 54321/54322. Stop it or change ports in `supabase/config.toml`
3. **First run slow:** Initial `db:start` downloads Docker images (~2GB). Be patient.

### `nvm use` says "N/A: version N/A is not yet installed"

```bash
nvm install   # installs the version specified in .nvmrc
nvm use
```

### TypeScript errors in IDE but `pnpm typecheck` passes

Restart your TypeScript server. In VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server".

### `pnpm install` fails with peer dependency errors

The project uses `strict-peer-dependencies=true` (`.npmrc`). If a package has unmet peers, install the required peer explicitly rather than loosening the setting.

### Supabase Studio not loading

Check that all containers are running: `supabase status`. If any show as unhealthy, try `supabase stop && pnpm db:start`.

### Desktop app doesn't open

The Electron app requires a display server. On headless Linux, this won't work. On macOS, ensure you've granted Electron the necessary permissions if prompted.
