# @ramcar/ui

Domain-agnostic **design-system primitives** for the Ramcar platform — shadcn/ui components built on Radix + Tailwind, plus shared global CSS and theme tokens. Consumed by `apps/web`, `apps/www`, `apps/desktop`, and `@ramcar/features`.

## Why this package exists

`@ramcar/ui` is the single source of primitive UI components (Button, Sheet, Table, Input, Select, Dialog, Skeleton, Badge, Sonner toaster, …). Primitives are copied in via `pnpx shadcn@latest add <component>` (not npm-installed), then re-exported from `src/index.ts` so consumers import everything from `@ramcar/ui`.

Keeping `@ramcar/ui` **primitives-only** is deliberate (spec 014, clarification Q1). It stays domain-agnostic so it can be reused outside the portal + booth in the future (mobile, internal tools). Vertical feature slices — anything that knows about visitors, residents, providers, or the NestJS API — do NOT belong here; they live in [`@ramcar/features`](../features/README.md).

## What this package owns

- **Components** (`src/components/`) — shadcn primitives: Button, Sheet, Table, Dialog, Input, Select, Label, Textarea, Skeleton, Badge, Sonner toaster, etc.
- **Hooks** (`src/hooks/`) — primitive-level hooks (e.g., `useIsMobile`), nothing domain-specific.
- **Lib** (`src/lib/`) — `cn()` class-name helper and other primitive utilities (`clsx` + `tailwind-merge`).
- **Styles** — `src/globals.css` (Tailwind entry) and `src/theme.css` (CSS variables for tokens, radius, dark/light mode via `next-themes`).

Exports:

```ts
import { Button, Sheet, Table } from "@ramcar/ui";
import "@ramcar/ui/globals.css";
import "@ramcar/ui/theme.css";
```

## What does NOT belong here

- No business/domain logic (visitors, residents, providers) — that lives in `@ramcar/features`.
- No TanStack Query hooks that hit the NestJS API.
- No Zod validators — those live in `@ramcar/shared`.
- No Zustand store or slices — those live in `@ramcar/store`.
- No i18n strings — those live in `@ramcar/i18n`.
- No Next.js-only or Electron-only APIs. `@ramcar/ui` must render under any React host (Next.js App Router, Vite + Electron renderer, Next.js marketing site).

## Dependencies

Runtime: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `next-themes`, `sonner`. Peers: `react`, `react-dom`.

Tailwind: consumers configure a shared preset from `@ramcar/config/tailwind` and MUST include `packages/ui/src/**` in their Tailwind `content` paths so utility classes used by primitives are emitted.

## Adding a new primitive

```bash
cd packages/ui
pnpx shadcn@latest add <component>
# Re-export from src/index.ts
```

Then bump consumers' Tailwind `content` paths if needed.

## Scripts

```bash
pnpm --filter @ramcar/ui typecheck
pnpm --filter @ramcar/ui lint
pnpm --filter @ramcar/ui test
```

## Position in the package graph

```
@ramcar/features ─┐
apps/web ─────────┤──→ @ramcar/ui ──→ (radix, tailwind, lucide)
apps/desktop ─────┤
apps/www ─────────┘
```

Unidirectional. `@ramcar/ui` depends on nothing in `@ramcar/*` except `@ramcar/config` (dev-only).
