# Sheet Sidebar Animation Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the missing open/close slide+fade animations on the shared Sheet component (and all other shadcn primitives using `animate-in`/`animate-out` utilities) by installing `tw-animate-css` in `packages/ui` and importing it from the shared CSS that all consumer apps already load.

**Architecture:** One dependency install in `packages/ui` + one `@import` line in `packages/ui/src/theme.css`. Both consumer apps (`apps/web` and `apps/desktop`) already import `@ramcar/ui/theme.css`, so they both pick up the animation utilities with zero per-app file changes.

**Tech Stack:** `tw-animate-css` (CSS-only animation utilities, shadcn's official Tailwind v4 replacement for `tailwindcss-animate`), Tailwind CSS v4, pnpm workspaces.

---

## Spec note: corrected target file

The spec document identifies the target as `packages/ui/src/globals.css`. The package.json exports map shows:

```json
"./globals.css": "./src/globals.css",
"./theme.css":   "./src/theme.css"
```

Both `apps/web/src/app/globals.css` and `apps/desktop/src/index.css` contain:

```css
@import "@ramcar/ui/theme.css";
```

This resolves to `packages/ui/src/theme.css`, **not** `globals.css`. The `@import "tw-animate-css"` line therefore belongs in `packages/ui/src/theme.css` — that is what this plan implements.

---

## Files

| Action | Path |
|--------|------|
| Modify | `packages/ui/package.json` — add `tw-animate-css` to `dependencies` |
| Modify | `packages/ui/src/theme.css` — add `@import "tw-animate-css";` as first line |
| Read-only verify | `apps/web/src/app/globals.css` — confirm already imports `@ramcar/ui/theme.css` |
| Read-only verify | `apps/desktop/src/index.css` — confirm already imports `@ramcar/ui/theme.css` |

---

## Task 1: Install `tw-animate-css` in the UI package

**Files:**
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Install the package**

Run from the repo root (pnpm resolves `--filter` to the package):

```bash
pnpm add tw-animate-css --filter @ramcar/ui
```

Expected output: a line like `+ tw-animate-css x.y.z` — no errors, no peer-dep warnings that are new.

- [ ] **Step 2: Verify the installed version and pin it explicitly**

Run:

```bash
cat packages/ui/package.json | grep tw-animate-css
```

Expected output (example, actual version may differ):

```
"tw-animate-css": "^1.0.4"
```

pnpm adds a `^` range by default. The spec asks to pin an explicit minor — change `^1.0.4` to `~1.0.4` (allows only patch bumps within `1.0.x`, preventing shadcn-version drift). Make this edit now if needed:

The `dependencies` block in `packages/ui/package.json` should read:

```json
"dependencies": {
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0",
  "lucide-react": "^0.460.0",
  "next-themes": "^0.4.6",
  "radix-ui": "^1.4.3",
  "sonner": "^2.0.7",
  "tailwind-merge": "^2.6.0",
  "tw-animate-css": "~1.0.4"
}
```

(Replace `1.0.4` with whatever version pnpm installed in Step 1 — keep only the `~major.minor.patch` form.)

- [ ] **Step 3: Confirm `pnpm-lock.yaml` was updated**

Run:

```bash
git diff --name-only
```

Expected: both `packages/ui/package.json` and `pnpm-lock.yaml` appear as modified.

---

## Task 2: Import `tw-animate-css` in the shared theme CSS

**Files:**
- Modify: `packages/ui/src/theme.css`

- [ ] **Step 1: Add the import as the first line of `theme.css`**

Current `packages/ui/src/theme.css` starts with:

```css
@custom-variant dark (&:is(.dark *));
```

Replace the entire beginning of the file so the import appears on line 1:

```css
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));
```

No other lines change. The `@theme inline`, `:root`, `.dark`, and `@layer base` blocks are untouched.

- [ ] **Step 2: Verify the file starts correctly**

Run:

```bash
head -5 packages/ui/src/theme.css
```

Expected output:

```
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
```

---

## Task 3: Build verification

- [ ] **Step 1: Run full workspace checks**

Run from the repo root:

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: all three pass with no new errors or warnings attributable to this change.

If the build fails with a CSS resolution error like `Could not resolve "tw-animate-css"`, it means pnpm did not hoist the package correctly. Fix: also add `tw-animate-css` to the failing app's own `package.json` dependencies and re-run `pnpm install`. Then retry the build.

- [ ] **Step 2: Commit**

```bash
git add packages/ui/package.json packages/ui/src/theme.css pnpm-lock.yaml
git commit -m "fix: install tw-animate-css to restore sheet slide/fade animations"
```

---

## Task 4: Manual QA checklist (no automated test possible for CSS animation)

This task cannot be automated — open the apps in a browser/Electron and verify visually.

- [ ] **Step 1: Web — Sheet animation**

```bash
pnpm dev
```

Open `apps/web` in a browser, log in, navigate to the access-events page, and open the right sidebar.

- Slide-in from the right over ~500ms on open.
- Slide-out to the right over ~300ms on close.
- Overlay fades in/out alongside the content panel.

- [ ] **Step 2: Web — spot-check other primitives**

Still in `apps/web`:

- Open a `Dialog` — confirm it fades in/out subtly.
- Open a `DropdownMenu` — confirm it fades in.
- Open a `Select` — confirm the dropdown fades/slides in.
- Hover a `Tooltip` — confirm it fades in.

None of these should jump. If any looks wrong (e.g., a component had a layered animation that relied on the utility being a no-op), fix it at the specific component, not by removing the library.

- [ ] **Step 3: Desktop — Sheet animation**

In the Electron dev shell:

```bash
pnpm --filter @ramcar/desktop dev
```

Open the sheet in the guard booth renderer. Confirm the same slide+fade animation runs smoothly.

- [ ] **Step 4: Reduced-motion check**

Enable **System Settings → Accessibility → Display → Reduce motion** on macOS, then reload both apps.

Confirm:
- The Sheet opens and closes instantly (no slide animation, no lingering overlay).
- No broken layout, no overlay stuck on screen.

Disable the setting again after verification.
