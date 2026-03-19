# Vercel Deployment Implementation Plan

> **For agentic workers:** This is a configuration-only plan (no code changes). All tasks involve external service configuration (Vercel dashboard, Squarespace DNS). Steps use checkbox (`- [ ]`) syntax for tracking. Execute sequentially — each task depends on the previous one.

**Goal:** Deploy `apps/www` (landing page) to production at `ramcarsoft.com` via Vercel.

**Architecture:** Two separate Vercel projects connected to the same GitHub monorepo. Each project builds only its own app using Turborepo filtering and skips builds when unaffected via `turbo-ignore`. DNS stays at Squarespace to preserve Google Workspace email.

**Tech Stack:** Vercel, pnpm, Turborepo, Next.js 16, Squarespace DNS

**Spec:** `docs/superpowers/specs/2026-03-18-vercel-deployment-design.md`

---

### Task 1: Connect GitHub Repo to Vercel

**Context:** One-time setup. The Vercel GitHub App must have access to the `ramcar-platform` repo before any project can be created.

- [ ] **Step 1: Log in to Vercel**

  Go to https://vercel.com and log in with your account.

- [ ] **Step 2: Start new project flow**

  Click "Add New..." > "Project" from the dashboard.

- [ ] **Step 3: Connect GitHub**

  If not already connected, Vercel will prompt you to install the Vercel GitHub App. Grant access to the `ramcar-platform` repository (you can scope access to just this repo rather than all repos).

- [ ] **Step 4: Verify connection**

  You should see `ramcar-platform` listed in the "Import Git Repository" screen. **Do not click Import yet** — we'll configure the project in the next task.

---

### Task 2: Create and Configure `ramcar-www` Vercel Project

**Context:** This creates the Vercel project for the landing page app with the correct monorepo build settings.

- [ ] **Step 1: Import the repository**

  From the "Import Git Repository" screen, select `ramcar-platform` and click "Import".

- [ ] **Step 2: Set project name**

  Set the project name to `ramcar-www`.

- [ ] **Step 3: Set Framework Preset**

  Select "Next.js" as the framework preset (may be auto-detected).

- [ ] **Step 4: Set Root Directory**

  Click "Edit" next to Root Directory and set it to `apps/www`.

- [ ] **Step 5: Configure Build & Development Settings**

  Expand "Build & Development Settings" and configure:

  | Setting | Value |
  |---------|-------|
  | Build Command | `cd ../.. && pnpm turbo build --filter=@ramcar/www` |
  | Output Directory | (leave default — auto-detected as `.next`) |
  | Install Command | (leave blank — Vercel auto-detects pnpm) |

  **Why `cd ../..`?** The Root Directory is `apps/www`, but Turborepo needs to run from the repo root to resolve workspace dependencies.

  **Why `pnpm turbo build` instead of `pnpm build`?** The root `pnpm build` script wraps turbo with `dotenvx` for local encrypted env files. Vercel doesn't need `dotenvx` — it injects env vars natively.

- [ ] **Step 6: Set Node.js version**

  In the Vercel dashboard, go to Project Settings > General > Node.js Version and set it to **22.x** (matching the project's `.nvmrc` and `engines` field).

- [ ] **Step 7: Skip environment variables**

  `apps/www` is a purely static site with no env vars. Leave this section empty.

- [ ] **Step 8: Deploy**

  Click "Deploy". Vercel will run the first build from the `main` branch.

- [ ] **Step 9: Verify initial deployment**

  Wait for the build to complete. Check:
  - Build logs show `pnpm install` running at repo root
  - Build logs show `turbo build --filter=@ramcar/www` executing
  - The deployment succeeds and you can see the landing page at the generated `.vercel.app` URL

  If the build fails, check:
  - Node.js version is 22.x (not 18 or 20)
  - The Build Command is exactly `cd ../.. && pnpm turbo build --filter=@ramcar/www`
  - Root Directory is `apps/www`
  - If framework preset does not auto-detect Next.js 16 correctly, manually set Output Directory to `.next`

---

### Task 3: Configure Build Filtering (Ignored Build Step)

**Context:** Without this, every push to the repo triggers a build for this project — even changes to unrelated apps like `apps/api`. The Ignored Build Step tells Vercel to skip builds when nothing relevant changed. **Complete this immediately after Task 2, before merging any further PRs**, to avoid unnecessary builds.

- [ ] **Step 1: Open project settings**

  In the Vercel dashboard, go to the `ramcar-www` project > Settings > Git.

- [ ] **Step 2: Set Ignored Build Step**

  Find the "Ignored Build Step" section and set the command to:

  ```
  npx turbo-ignore @ramcar/www
  ```

  This uses Turborepo's dependency graph to check if `apps/www` or any of its workspace dependencies changed since the last successful deploy. If nothing changed, the build is skipped (exit 0). If changes are detected, the build proceeds (exit 1). Note: this is the opposite of typical Unix conventions — Vercel's Ignored Build Step treats exit 0 as "skip" and exit 1 as "proceed".

- [ ] **Step 3: Save and verify**

  Save the setting. To verify it works, push a commit that only changes a file in `apps/api/` or `apps/web/` — the `ramcar-www` build should be skipped. You'll see "Build skipped" in the Vercel deployment log.

---

### Task 4: Add DNS Records in Squarespace

**Context:** The domain `ramcarsoft.com` is managed through Squarespace. Google Workspace email (`info@ramcarsoft.com`) is active — **do NOT touch existing DNS records**.

- [ ] **Step 1: Log in to Squarespace**

  Go to your Squarespace account and navigate to the domain management page for `ramcarsoft.com`.

- [ ] **Step 2: Screenshot existing DNS records**

  Before making any changes, take a screenshot of all existing DNS records as a backup. Pay special attention to:
  - MX records (Google Workspace email routing)
  - TXT records (SPF, DKIM, DMARC for email authentication)

- [ ] **Step 3: Add A record for apex domain**

  | Type | Name/Host | Value | TTL |
  |------|-----------|-------|-----|
  | A | `@` | `76.76.21.21` | Default/Auto |

  This points `ramcarsoft.com` to Vercel's edge network.

- [ ] **Step 4: Add CNAME for `www` subdomain**

  | Type | Name/Host | Value | TTL |
  |------|-----------|-------|-----|
  | CNAME | `www` | `cname.vercel-dns.com` | Default/Auto |

  This points `www.ramcarsoft.com` to Vercel.

- [ ] **Step 5: (Optional) Add CNAME for `app` subdomain**

  If you want to prepare for `apps/web` deployment now:

  | Type | Name/Host | Value | TTL |
  |------|-----------|-------|-----|
  | CNAME | `app` | `cname.vercel-dns.com` | Default/Auto |

  This can also be done later when you create the `ramcar-web` Vercel project.

- [ ] **Step 6: Verify existing records are untouched**

  Compare the current DNS records with your screenshot from Step 2. Confirm that all MX, TXT (SPF/DKIM/DMARC), and other pre-existing records are still present and unchanged.

- [ ] **Step 7: Wait for DNS propagation**

  DNS changes can take up to 48 hours to propagate, but typically complete within minutes to a few hours. You can check propagation status at https://dnschecker.org by looking up `ramcarsoft.com`.

---

### Task 5: Assign Custom Domain in Vercel

**Context:** After DNS records are pointing to Vercel, assign the domain to the `ramcar-www` project so Vercel knows which project to serve.

- [ ] **Step 1: Open domain settings**

  In the Vercel dashboard, go to `ramcar-www` project > Settings > Domains.

- [ ] **Step 2: Add `ramcarsoft.com`**

  Type `ramcarsoft.com` and click "Add". Vercel will check DNS and show verification status.

- [ ] **Step 3: Add `www.ramcarsoft.com`**

  Type `www.ramcarsoft.com` and click "Add". Set `ramcarsoft.com` as the primary domain. Configure `www.ramcarsoft.com` to redirect (301) to `ramcarsoft.com`.

- [ ] **Step 4: Verify domain status**

  Both domains should show a green checkmark indicating:
  - DNS is correctly configured
  - SSL certificate has been provisioned (automatic via Let's Encrypt)

  If verification fails, double-check:
  - The A record value is exactly `76.76.21.21`
  - The CNAME value is exactly `cname.vercel-dns.com`
  - DNS has had time to propagate

- [ ] **Step 5: Test the live site**

  Visit `https://ramcarsoft.com` in your browser. Verify:
  - The landing page loads correctly
  - HTTPS is working (no certificate warnings)
  - `www.ramcarsoft.com` redirects to `ramcarsoft.com` (or vice versa)

---

### Task 6: Verify End-to-End Deployment Workflow

**Context:** Confirm that the full PR preview + production deploy workflow works as expected.

- [ ] **Step 1: Test preview deployment**

  Create a test branch, make a small change to `apps/www` (e.g., update a text string), and open a PR against `main`. Verify:
  - Vercel builds a preview deployment
  - Vercel posts a comment on the PR with the preview URL
  - The preview shows your change

- [ ] **Step 2: Test build filtering**

  Open a **separate PR** that only changes a file outside `apps/www` (e.g., `apps/api/` or `README.md`). Using a separate PR ensures `turbo-ignore` gets a clean comparison. Verify:
  - The `ramcar-www` build is skipped ("Build skipped" in Vercel)

- [ ] **Step 3: Test production deployment**

  Merge the PR into `main`. Verify:
  - Vercel triggers a production build for `ramcar-www`
  - The production site at `ramcarsoft.com` updates with the change

- [ ] **Step 4: Verify email still works**

  Send a test email to `info@ramcarsoft.com` to confirm Google Workspace email routing was not affected by the DNS changes.

---

### Future: Task 7 — Deploy `apps/web` to `app.ramcarsoft.com`

This task is deferred. When ready, follow the same pattern:

1. Create a new Vercel project `ramcar-web` from the same GitHub repo
2. Set Root Directory to `apps/web`
3. Set Build Command to `cd ../.. && pnpm turbo build --filter=@ramcar/web`
4. Set Ignored Build Step to `npx turbo-ignore @ramcar/web`
5. Set Node.js version to 22.x
6. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
7. Add `app` CNAME in Squarespace if not done in Task 4 Step 5
8. Assign `app.ramcarsoft.com` domain in Vercel
