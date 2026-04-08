# shadcn/ui Migration & Theme Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-copied shadcn components with CLI-managed ones, apply the Luma/Green/Mist theme, and upgrade shared packages from Tailwind v3 to v4.

**Architecture:** `packages/ui` is the single source of truth for the design system. It owns `components.json` (shadcn CLI config), `globals.css` (theme tokens), and all UI components. Consuming apps (`web`, `desktop`) import components and the CSS — they do not define their own tokens. `apps/www` is excluded and keeps its own palette.

**Tech Stack:** shadcn/ui (Luma style), Tailwind CSS v4, Radix UI, CVA, Lucide icons, Inter + Geist fonts

**Spec:** `docs/superpowers/specs/2026-04-07-shadcn-ui-migration-design.md`

---

## File Map

### `packages/config`
- **Delete:** `tailwind.preset.ts` (unused brand colors, replaced by shadcn tokens)
- **Modify:** `package.json` (remove `./tailwind` export, bump tailwindcss to v4)

### `packages/ui`
- **Delete:** `tailwind.config.ts` (v3 config, no longer needed in v4)
- **Delete:** `postcss.config.js` (v3 PostCSS config, replaced with v4-compatible version)
- **Delete:** `src/components/ui/button.tsx` (will be recreated by shadcn CLI)
- **Delete:** `src/components/ui/card.tsx` (will be recreated by shadcn CLI)
- **Delete:** `src/components/ui/input.tsx` (will be recreated by shadcn CLI)
- **Create:** `components.json` (shadcn CLI config)
- **Create:** `postcss.config.mjs` (v4-compatible PostCSS config)
- **Modify:** `src/globals.css` (rewritten by shadcn init with Luma/Green/Mist tokens)
- **Modify:** `package.json` (bump tailwindcss to v4, add `@tailwindcss/postcss`, drop autoprefixer)
- **Modify:** `src/index.ts` (verify exports match CLI-generated component names)

### `apps/web`
- **Modify:** `tailwind.config.ts` (remove shared preset import)
- **Modify:** `src/app/globals.css` (strip duplicate tokens, keep only Tailwind import + app overrides)
- **Modify:** `src/app/layout.tsx` (add Inter font, wire font CSS variables)

### `apps/desktop`
- **Modify:** `tailwind.config.ts` (remove shared preset import)
- **Modify:** `src/index.css` (replace Vite boilerplate with Tailwind v4 + shared theme import)
- **Modify:** `src/main.tsx` (add `@ramcar/ui/globals.css` import)

---

## Task 1: Remove the shared Tailwind preset from `packages/config`

**Files:**
- Delete: `packages/config/tailwind.preset.ts`
- Modify: `packages/config/package.json`

- [ ] **Step 1: Delete the preset file**

```bash
rm packages/config/tailwind.preset.ts
```

- [ ] **Step 2: Remove the `./tailwind` export and bump tailwindcss in `packages/config/package.json`**

Edit `packages/config/package.json`. Remove the `"./tailwind"` export entry and bump `tailwindcss` to `^4`:

```json
{
  "name": "@ramcar/config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./tsconfig.base.json": "./tsconfig.base.json",
    "./tsconfig.react.json": "./tsconfig.react.json",
    "./tsconfig.node.json": "./tsconfig.node.json",
    "./eslint": "./eslint.config.mjs",
    "./prettier": "./prettier.config.mjs"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^10.0.0",
    "prettier": "^3.0.0",
    "typescript-eslint": "^8.0.0",
    "tailwindcss": "^4"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/config/tailwind.preset.ts packages/config/package.json
git commit -m "chore(config): remove unused tailwind preset, bump to v4

The brand color scale was unused across all apps. Theme colors are now
managed by shadcn CSS variables in packages/ui.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Remove shared preset imports from consuming apps

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/desktop/tailwind.config.ts`

- [ ] **Step 1: Update `apps/web/tailwind.config.ts`**

Remove the shared preset import. Keep the content paths (still needed for Tailwind to scan classes in `packages/ui`):

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Update `apps/desktop/tailwind.config.ts`**

Same change — remove the preset import:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/tailwind.config.ts apps/desktop/tailwind.config.ts
git commit -m "chore(web,desktop): remove deleted tailwind preset import

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Upgrade `packages/ui` to Tailwind v4

**Files:**
- Delete: `packages/ui/tailwind.config.ts`
- Delete: `packages/ui/postcss.config.js`
- Create: `packages/ui/postcss.config.mjs`
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Delete the v3 Tailwind config**

```bash
rm packages/ui/tailwind.config.ts
```

- [ ] **Step 2: Replace the PostCSS config with v4-compatible version**

Delete the old CJS config and create a new ESM one:

```bash
rm packages/ui/postcss.config.js
```

Create `packages/ui/postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 3: Update `packages/ui/package.json`**

Bump `tailwindcss` to v4, add `@tailwindcss/postcss`, remove `autoprefixer` (built into Tailwind v4):

```json
{
  "name": "@ramcar/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/globals.css"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.460.0",
    "tailwind-merge": "^2.6.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@ramcar/config": "workspace:*",
    "@tailwindcss/postcss": "^4",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^10.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4",
    "postcss": "^8.0.0",
    "typescript": "^5.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

- [ ] **Step 4: Install updated dependencies**

```bash
pnpm install
```

Expected: Lock file updates. No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/tailwind.config.ts packages/ui/postcss.config.js packages/ui/postcss.config.mjs packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): upgrade to Tailwind v4

Remove v3 tailwind.config.ts (config is now CSS-based).
Replace PostCSS config with v4-compatible @tailwindcss/postcss.
Drop autoprefixer (built into Tailwind v4).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Initialize shadcn CLI and apply Luma/Green/Mist theme

**Files:**
- Create: `packages/ui/components.json`
- Modify: `packages/ui/src/globals.css`

This task sets up the shadcn CLI configuration and writes the theme tokens. The `shadcn init` command generates both files.

- [ ] **Step 1: Delete the existing components (they'll be re-added via CLI in the next task)**

```bash
rm packages/ui/src/components/ui/button.tsx
rm packages/ui/src/components/ui/card.tsx
rm packages/ui/src/components/ui/input.tsx
```

- [ ] **Step 2: Run shadcn init in `packages/ui`**

```bash
cd packages/ui && pnpx shadcn@latest init
```

When prompted, select:
- **Style:** Luma
- **Base color:** Mist
- **CSS variables:** Yes
- **CSS file location:** src/globals.css
- **Tailwind config/CSS variables:** Use CSS variables
- **Components import alias:** @/components
- **Utils import alias:** @/lib/utils
- **React Server Components:** No (this is a shared package, not a Next.js app)

This generates `components.json` and rewrites `src/globals.css` with the full Luma/Green/Mist theme tokens (light mode `:root`, dark mode `.dark`, sidebar tokens, chart colors).

> **Note:** If the CLI does not offer "Luma" as a style option (older CLI version), use "new-york" as the base style and manually apply the Luma/Green/Mist CSS variables from the shadcn Create page (preset `b3dRfX4mKO`). Open the preset URL in a browser, click "Create Project", and copy the generated CSS variables into `src/globals.css`.

- [ ] **Step 3: Verify `components.json` was created**

```bash
cat packages/ui/components.json
```

Expected: A JSON file with `style`, `tailwind`, `aliases` sections. The `aliases.ui` path should resolve to `src/components/ui` and `aliases.utils` to `src/lib/utils`. The `$schema` field should reference the shadcn schema.

Verify the alias paths use `@/` which maps to `./src/*` via the existing `tsconfig.json` paths config.

- [ ] **Step 4: Verify `globals.css` has theme tokens**

```bash
head -60 packages/ui/src/globals.css
```

Expected: An `@import "tailwindcss"` directive at the top, followed by `:root` with CSS custom properties (HSL values) for `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1` through `--chart-5`, `--sidebar-*` variants, and `--radius`. A `.dark` block with the dark-mode equivalents.

The primary color should be a **green** hue (not gray). If the tokens look like the default gray theme, the Luma/Green selection was not applied — re-run init or manually replace the CSS variables from the preset.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/ui/components.json packages/ui/src/globals.css packages/ui/src/components/ui/
git commit -m "feat(ui): initialize shadcn CLI with Luma/Green/Mist theme

Set up components.json for CLI-managed component workflow.
Applied Luma style with Green theme, Mist base color, Teal chart colors.
Removed old hand-copied components (will be re-added via CLI next).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Re-add components via shadcn CLI

**Files:**
- Create: `packages/ui/src/components/ui/button.tsx`
- Create: `packages/ui/src/components/ui/card.tsx`
- Create: `packages/ui/src/components/ui/input.tsx`
- Modify: `packages/ui/src/index.ts` (verify exports)

- [ ] **Step 1: Add button, card, and input via CLI**

```bash
cd packages/ui && pnpx shadcn@latest add button card input
```

Expected: Three files created in `src/components/ui/`. The CLI reads `components.json` to know where to write them and what style (Luma) to use.

- [ ] **Step 2: Verify the generated files exist**

```bash
ls -la packages/ui/src/components/ui/
```

Expected: `button.tsx`, `card.tsx`, `input.tsx` present.

- [ ] **Step 3: Verify `src/index.ts` exports are still valid**

Read `packages/ui/src/index.ts`:

```ts
// Components
export { Button, buttonVariants } from "./components/ui/button";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/ui/card";
export { Input } from "./components/ui/input";

// Utils
export { cn } from "./lib/utils";
```

Check that the CLI-generated components export the same names. If any export name changed (unlikely but possible with different shadcn styles), update `index.ts` to match.

Common differences to watch for:
- `buttonVariants` might not be exported by default in some styles — if missing from the generated `button.tsx`, add `export { buttonVariants }` to the component file
- `CardFooter` order might differ — verify all six Card sub-components are exported

- [ ] **Step 4: Run typecheck to verify everything compiles**

```bash
cd ../..
pnpm typecheck
```

Expected: No type errors. If there are errors in `packages/ui`, they likely come from import path differences — fix by updating the generated components to use `@/lib/utils` instead of `../../lib/utils` or vice versa depending on what the CLI generated.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/ui/ packages/ui/src/index.ts packages/ui/src/lib/
git commit -m "feat(ui): re-add button, card, input via shadcn CLI

Components now managed by shadcn CLI (Luma style).
Same API surface — no breaking changes to consumers.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Simplify `apps/web` CSS and add Inter font

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Simplify `apps/web/src/app/globals.css`**

The current file duplicates theme tokens that now live in `@ramcar/ui/globals.css`. Strip it down to just the Tailwind import. The theme tokens are imported via `@ramcar/ui/globals.css` in `layout.tsx`.

Replace the entire contents of `apps/web/src/app/globals.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 2: Update `apps/web/src/app/layout.tsx` to add Inter font and wire CSS variables**

```tsx
import type { Metadata } from "next";
import React from "react";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import "@ramcar/ui/globals.css";

const geistSans = Geist({
  variable: "--font-heading",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ramcar Web",
  description: "Ramcar Web Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${inter.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

Key changes:
- Added `Inter` import from `next/font/google`
- Changed Geist variable from `--font-geist-sans` to `--font-heading` (matches shadcn theme expectations)
- Added Inter with variable `--font-body`
- Removed `Geist_Mono` (not used in the Luma theme — re-add later if needed for code blocks)
- Added `font-body` class to `<body>` so the body text uses Inter by default

- [ ] **Step 3: Verify the web app starts**

```bash
pnpm --filter @ramcar/web dev
```

Expected: Dev server starts without errors. Visit the page — text should render in Inter, headings in Geist. The Button component should have the green-themed primary color from the Luma/Mist theme instead of the previous gray.

Stop the dev server after verifying.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat(web): simplify CSS to use shared theme, add Inter font

Theme tokens now come from @ramcar/ui/globals.css.
Geist for headings, Inter for body text.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Update `apps/desktop` to use shared theme

**Files:**
- Modify: `apps/desktop/src/index.css`
- Modify: `apps/desktop/src/main.tsx`

- [ ] **Step 1: Replace `apps/desktop/src/index.css` with Tailwind v4 setup**

The current file has Vite boilerplate styles. Replace with a clean Tailwind v4 setup that works with the shared theme:

```css
@import "tailwindcss";

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
```

The shadcn theme tokens (background, foreground, etc.) come from `@ramcar/ui/globals.css` imported in `main.tsx`.

- [ ] **Step 2: Add `@ramcar/ui/globals.css` import to `apps/desktop/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import '@ramcar/ui/globals.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Use contextBridge - ping example
window.api?.ping().then((result) => console.log("ping:", result)).catch(() => {})
```

Note: `@ramcar/ui/globals.css` is imported **before** `./index.css` so local styles can override if needed.

- [ ] **Step 3: Delete the unused `apps/desktop/src/App.css`**

This file contains Vite template styles (logo spin animations, etc.) that don't apply to the Ramcar desktop app:

```bash
rm apps/desktop/src/App.css
```

Check if `App.tsx` imports it:

```bash
grep "App.css" apps/desktop/src/App.tsx
```

If it does, remove that import line from `App.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/index.css apps/desktop/src/main.tsx apps/desktop/src/App.css apps/desktop/src/App.tsx
git commit -m "feat(desktop): adopt shared shadcn theme from packages/ui

Import @ramcar/ui/globals.css for theme tokens.
Replace Vite boilerplate CSS with clean Tailwind v4 setup.
Remove unused App.css template styles.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Install all dependencies**

```bash
pnpm install
```

Expected: Clean install, no peer dependency warnings related to tailwindcss version mismatches between packages.

- [ ] **Step 2: Run typecheck across all workspaces**

```bash
pnpm typecheck
```

Expected: No type errors in any workspace. If `packages/ui` has errors, they're likely import path issues in CLI-generated components — fix the paths to match the `@/*` alias in `tsconfig.json`.

- [ ] **Step 3: Run lint across all workspaces**

```bash
pnpm lint
```

Expected: No lint errors. If the shadcn-generated components have lint issues (e.g., different quote style, missing semicolons), fix them to match the project's ESLint/Prettier config.

- [ ] **Step 4: Run build**

```bash
pnpm build
```

Expected: All apps build successfully. Watch for:
- `apps/web`: Next.js build should complete without CSS or module resolution errors
- `apps/desktop`: Vite build should complete — CSS imports from `@ramcar/ui` resolve correctly
- `apps/www`: Should be unaffected — no changes were made

- [ ] **Step 5: Verify `apps/web` renders correctly**

```bash
pnpm --filter @ramcar/web dev
```

Open in browser and verify:
- Body text uses Inter font
- The Button component has green-themed primary color (not gray)
- No broken styles or missing CSS variables in the console

- [ ] **Step 6: Commit any fixes from verification, if needed**

If any fixes were applied during verification:

```bash
git add -A
git commit -m "fix(ui): resolve post-migration lint/type issues

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
