# Vercel Deployment Design

## Overview

Deploy the Ramcar Platform monorepo apps to Vercel using two separate Vercel projects connected to the same GitHub repository. Start with `apps/www` (landing page) now, and `apps/web` (portal) in the near future.

## Goals

- Deploy `apps/www` to production at `ramcarsoft.com`
- Prepare for `apps/web` deployment at `app.ramcarsoft.com`
- Automatic preview deployments on PRs
- Automatic production deploys on merge to `main`
- Smart build filtering — only rebuild apps affected by changes

## Non-Goals

- CI/CD beyond Vercel (GitHub Actions, etc.)
- Backend (`apps/api`) or desktop (`apps/desktop`) deployment
- Turborepo remote caching (can be added later)
- Environment variable management via `dotenvx` in Vercel builds

## Architecture

### Two Vercel Projects

Both projects connect to the same `ramcar-platform` GitHub repo.

| Project | Package Name | Root Directory | Domain | Framework |
|---------|-------------|---------------|--------|-----------|
| `ramcarsoft-www` | `@ramcar/www` | `apps/www` | `ramcarsoft.com` | Next.js |
| `ramcarsoft-web` | `@ramcar/web` | `apps/web` | `app.ramcarsoft.com` | Next.js |

### Build Configuration

Per-project settings in the Vercel dashboard:

**`ramcarsoft-www`:**
- Build Command: `cd ../.. && pnpm turbo build --filter=@ramcar/www`
- Output Directory: `.next` (auto-detected)
- Install Command: (leave blank — Vercel auto-detects pnpm and runs `pnpm install` at the repo root)
- Node.js Version: 22.x
- Environment Variables: None (purely static site)

**`ramcarsoft-web`:**
- Build Command: `cd ../.. && pnpm turbo build --filter=@ramcar/web`
- Output Directory: `.next` (auto-detected)
- Install Command: (leave blank — same as above)
- Node.js Version: 22.x
- Environment Variables (set when ready to deploy):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Vercel auto-detects pnpm from the `packageManager` field in the root `package.json` and runs `pnpm install` at the repo root automatically. Setting Root Directory to `apps/www` or `apps/web` scopes the build context, but the full monorepo is accessible. The `cd ../..` in the Build Command navigates to the repo root so Turborepo can resolve workspace dependencies.

**Important:** The Build Command calls `pnpm turbo build` directly rather than the root `pnpm build` script. The root script wraps turbo with `dotenvx` (for local encrypted env files), which is not needed in Vercel builds — Vercel injects env vars natively.

### Build Filtering (Ignored Build Step)

Since both projects share the same repo, every push triggers both. To avoid unnecessary builds, each project uses Vercel's Ignored Build Step setting:

**`ramcarsoft-www`:**
```bash
npx turbo-ignore @ramcar/www
```

**`ramcarsoft-web`:**
```bash
npx turbo-ignore @ramcar/web
```

`turbo-ignore` inspects the Turborepo dependency graph and compares against the last successful deploy. It returns exit code 0 (skip) if nothing relevant changed, or 1 (build). Note: this is the opposite of typical Unix conventions — Vercel's Ignored Build Step treats exit 0 as "skip this build" and exit 1 as "proceed with build".

Examples:
- Change only `apps/www/` → only `ramcarsoft-www` builds
- Change `packages/config/` → both build (shared dependency)
- Change `apps/api/` → neither builds

## DNS Configuration

The domain `ramcarsoft.com` is managed through Squarespace (originally Google Workspace). Google Workspace email (`info@ramcarsoft.com`) is active and must be preserved.

**Decision: Keep DNS at Squarespace.** Add records manually rather than transferring nameservers to Vercel. This avoids risk of breaking Google Workspace email by accidentally dropping MX/SPF/DKIM/DMARC records.

### DNS Records to Add in Squarespace

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | `@` | `76.76.21.21` | Points `ramcarsoft.com` to Vercel |
| CNAME | `www` | `cname.vercel-dns.com` | Points `www.ramcarsoft.com` to Vercel |
| CNAME | `app` | `cname.vercel-dns.com` | Points `app.ramcarsoft.com` to Vercel |

**Do NOT modify or remove existing records**, especially:
- MX records (Google Workspace email)
- TXT records for SPF (`v=spf1 include:_spf.google.com ...`)
- CNAME/TXT records for DKIM
- TXT records for DMARC

Vercel will verify domain ownership and provision SSL certificates automatically after DNS records propagate.

## Deployment Workflow

### Branch Strategy

- `main` branch → production deployment
- PR branches → preview deployments with unique URLs

### Flow: PR Opened/Updated

1. GitHub webhook notifies both Vercel projects
2. Each project runs `turbo-ignore` to check for relevant changes
3. If changes detected, project builds and creates a preview deployment
4. Vercel comments the preview URL on the PR

### Flow: Merge to `main`

1. GitHub webhook notifies both Vercel projects
2. Each project runs `turbo-ignore`
3. Relevant project(s) build and deploy to production
4. `ramcarsoft-www` serves at `ramcarsoft.com`
5. `ramcarsoft-web` serves at `app.ramcarsoft.com`

## Implementation Order

0. Connect GitHub repo to Vercel (install Vercel GitHub App, grant access to `ramcar-platform` repo)
1. Create `ramcarsoft-www` Vercel project, configure build settings
2. Add DNS records in Squarespace for `ramcarsoft.com` and `www.ramcarsoft.com`
3. Assign domain in Vercel, verify, and deploy
4. (Future) Create `ramcarsoft-web` Vercel project, configure build settings and env vars
5. (Future) Add `app` CNAME in Squarespace, assign domain in Vercel

## No Code Changes Required

Everything is configured through the Vercel dashboard and DNS provider. No `vercel.json`, no build scripts, and no code changes needed in the repository.
