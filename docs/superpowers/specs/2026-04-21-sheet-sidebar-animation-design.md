# Sheet Sidebar Animation Fix — Design

**Date:** 2026-04-21
**Owner:** Ivan
**Status:** Approved (design phase)
**Branch:** `fix/right-sidebar-animation`

## Problem

The shared right-side Sheet used for forms across the access-events modules (and other features that reuse `@ramcar/ui`'s `Sheet` component) is expected to slide in from the right on open and slide out to the right on close, with the overlay fading. Today it has no transition at all — the Sheet appears and disappears instantly.

The same silent failure affects every other shadcn primitive in the codebase that relies on the same class-based transition convention (`Dialog`, `DropdownMenu`, `Select`, `Popover`, `Tooltip`, `HoverCard`, `Tabs` content). The visual jump is just smallest on those, so it has gone unnoticed.

## Root cause

`packages/ui/src/components/ui/sheet.tsx` (lines 39, 63–71) uses Tailwind utility classes that were historically provided by the `tailwindcss-animate` plugin — `animate-in`, `animate-out`, `slide-in-from-right`, `slide-out-to-right`, `fade-in-0`, `fade-out-0`, etc.

This repository is on Tailwind CSS v4 (`@import "tailwindcss";` across `packages/ui`, `apps/web`, `apps/desktop`, `apps/www`). In v4 the legacy `tailwindcss-animate` plugin does not apply — shadcn's official replacement is the CSS-only library `tw-animate-css`, which must be imported explicitly. Neither `tailwindcss-animate` nor `tw-animate-css` is installed or imported anywhere in the workspace. The only animation keyframes currently defined are the accordion keyframes inside `node_modules/shadcn/dist/tailwind.css`.

Therefore every `animate-in` / `animate-out` / `slide-*` / `fade-*` class on `Sheet` (and all other affected primitives) resolves to an undefined utility and is a silent no-op. Radix correctly emits `data-[state=open]` and `data-[state=closed]` on the content element, but nothing in the CSS cascade reacts to those states, so the transition never runs.

## Goals

- Restore the intended open/close slide+fade animation for the shared Sheet component in both consumer apps (`apps/web`, `apps/desktop`).
- Fix the same latent issue for all other shadcn primitives that share the class convention, in one change, with no per-component edits.
- Respect the OS `prefers-reduced-motion` setting.

## Non-goals

- No JavaScript / TSX changes to `sheet.tsx` or any other shadcn component.
- No changes to `apps/www` (marketing landing — does not consume `@ramcar/ui/theme.css` and does not render `Sheet`).
- No introduction of a motion library (e.g., framer-motion).
- No tweaks to the existing `duration-300` / `duration-500` timing on `sheet.tsx`. They are fine once the animation utilities actually resolve.
- No new animation design tokens in `theme.css`. YAGNI until a second component needs to diverge.

## Approach (chosen)

Install `tw-animate-css` once in the shared UI package and import it from the shared theme CSS. Because `apps/web/src/app/globals.css` and `apps/desktop/src/index.css` both `@import "@ramcar/ui/theme.css";` (which resolves to `packages/ui/src/theme.css`), both apps receive the utilities with zero per-app changes.

### Alternatives considered

- **Hand-rolled `@keyframes` for Sheet only.** Rejected: leaves every other shadcn primitive silently broken and reinvents a battle-tested library.
- **Swap Sheet transitions for framer-motion.** Rejected: heavier than the problem warrants, mismatches shadcn's class-based convention, adds bundle weight.

## Changes

### 1. `packages/ui/package.json`

Add `tw-animate-css` to `dependencies`. It is a runtime CSS asset consumed by every app that imports `@ramcar/ui/theme.css`, so it belongs in `dependencies`, not `devDependencies`.

### 2. `packages/ui/src/theme.css`

Insert one line as the very first line of the file (before `@custom-variant dark`):

```css
@import "tw-animate-css";
```

No other edits to this file. The `@custom-variant dark`, `@theme inline`, `:root`, `.dark`, and `@layer base` blocks are untouched.

### 3. No other file changes

- `packages/ui/src/components/ui/sheet.tsx` — unchanged. Existing classes already match what `tw-animate-css` exposes.
- `apps/web/src/app/globals.css` — unchanged. Already imports `@ramcar/ui/theme.css`.
- `apps/desktop/src/index.css` — unchanged. Already imports `@ramcar/ui/theme.css`.
- `apps/www/src/app/globals.css` — unchanged. Out of scope.

## Resolution model (why one install is enough)

Tailwind v4's CSS compiler resolves `@import` relative to the file in which the `@import` statement appears. When an app's `globals.css` imports `@ramcar/ui/theme.css`, the compiler then processes the nested `@import "tw-animate-css";` as if it lived inside `packages/ui/src/theme.css`. Resolution therefore looks for `tw-animate-css` starting from `packages/ui/node_modules`, which is exactly what pnpm provides when the dependency is declared in `packages/ui/package.json`. No hoisting assumptions, no duplicated installs in every consumer.

## Behavior after the fix

- **Sheet open:** slides in from the right over ~500ms (from `data-[state=open]:duration-500` on the content element); overlay fades in.
- **Sheet close:** slides out to the right over ~300ms (from `data-[state=closed]:duration-300`); overlay fades out. Radix already defers unmount until the close transition ends, so there is no unmount flash.
- **`prefers-reduced-motion: reduce`:** `tw-animate-css` guards its keyframe utilities with a `@media (prefers-reduced-motion: reduce)` zero-duration rule out of the box, so users with that system setting will see an instant state change with no custom code.
- **Other primitives restored as a side effect:** `Dialog`, `DropdownMenu`, `Select`, `Popover`, `Tooltip`, `HoverCard`, `Tabs` content. `Accordion` is unaffected (its keyframes are defined locally in `shadcn/tailwind.css` and continue to work).

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Any other shadcn primitive was relying on the classes being no-ops (e.g., something layered its own transition assuming the utility did nothing). | Low | Spot-check `Dialog`, `DropdownMenu`, `Select`, `Popover`, `Tooltip` in both apps during QA. If any surprise animation appears, fix at the specific component, not by removing the library. |
| `tw-animate-css` version drifts from the shadcn CLI's assumed version. | Low | Pin an explicit minor in `packages/ui/package.json`. Bump only when the shadcn CLI updates its reference. |
| `tw-animate-css` not resolvable in an app's CSS graph after install. | Very low | Covered by the resolution model above; if it surfaces, add it to the offending app's `package.json` too. |

## Verification plan

Manual QA (explicit click-through, not just a typecheck):

1. **Web (`apps/web`)** — start `pnpm dev`, log in, open the access-events right sidebar. Confirm:
   - Slide-in from the right ~500ms on open.
   - Slide-out to the right ~300ms on close.
   - Overlay fades in/out alongside.
2. **Web — spot checks** — open a Dialog, a DropdownMenu, a Select, a Tooltip. Confirm each now fades/slides subtly and nothing jumps awkwardly.
3. **Desktop (`apps/desktop`)** — start the Electron dev shell, open the same Sheet in the guard booth renderer. Confirm the animation runs at ~60fps with no jank.
4. **Reduced motion** — enable macOS **System Settings → Accessibility → Display → Reduce motion**, reload each app. Confirm the Sheet snaps open/closed without animation and there is no broken layout or lingering overlay.
5. **Build integrity** — from the repo root:
   ```bash
   pnpm typecheck && pnpm lint && pnpm build
   ```
   All three must pass with no new warnings attributable to this change.

## Rollback

Single-commit scope. If a regression surfaces, `git revert` the commit removes the CSS import and the `dependencies` entry — no code changes in components to unwind.

## Follow-ups (not in this change)

- Decide whether `apps/www` should pick up `tw-animate-css` the next time it gains an animated shadcn primitive.
- Evaluate whether the existing `duration-500` open / `duration-300` close feels right after users see the animation in context; tweak only if feedback comes in.
