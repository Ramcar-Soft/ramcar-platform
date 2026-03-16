# Monorepo Scaffold Design — ramcar-platform

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Project scaffold only — no features, no DB schemas/migrations

---

## Decisions

| Decision | Choice |
|---|---|
| Next.js apps | `create-next-app` via pnpx |
| NestJS API | `@nestjs/cli new` then adapt |
| Electron desktop | `create-electron-vite` via pnpx |
| packages/ui | shadcn/ui initialized with Button, Card, Input |
| ESLint | Flat config (`eslint.config.mjs`) |
| Node version | 22 LTS |
| Supabase | `supabase init` |
| Package scope | `@ramcar/*` |
| Approach | CLI-First, Adapt After |

---

## 1. Root Monorepo Configuration

**Files at repo root:**

| File | Purpose |
|---|---|
| `.nvmrc` | `22` — enforces Node 22 LTS |
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*` as workspaces |
| `package.json` | Root: `name: "ramcar-platform"`, `private: true`, `engines: { node: ">=22" }`. Scripts: turbo commands (`dev`, `build`, `lint`, `typecheck`, `test`) + Supabase DB scripts (`db:migrate`, `db:new`, `db:types`, `db:reset`, `db:start`) |
| `turbo.json` | Pipeline: `build` (dependsOn `^build`, outputs `.next/**`, `dist/**`, `out/**`), `dev` (persistent, no cache), `lint`, `typecheck` (dependsOn `^build`), `test` (dependsOn `^build`, outputs `coverage/**`) |
| `.gitignore` | Comprehensive monorepo gitignore: `node_modules`, `.next`, `dist`, `out`, `.turbo`, `.env*`, `.DS_Store`, `*.tsbuildinfo`, `.vercel`, Electron build outputs, Supabase local files |

The existing `.gitignore` is replaced entirely (current one is Next.js-only and too narrow for the monorepo).

---

## 2. Shared Configs — `packages/config`

`@ramcar/config` — private package, no build step.

| File | Purpose |
|---|---|
| `tsconfig.base.json` | Base TS config: `strict: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"` |
| `tsconfig.react.json` | Extends base, adds `jsx: "react-jsx"` — for web, www, desktop renderer, ui |
| `tsconfig.node.json` | Extends base, adds Node-specific settings — for api, desktop main |
| `eslint.config.mjs` | Shared flat config: typescript-eslint, prettier plugin, import rules |
| `prettier.config.mjs` | Shared Prettier config — single source of truth |

Each app/package creates its own `eslint.config.mjs` that imports and extends the shared config. Prettier is referenced via package.json or local `.prettierrc.mjs` re-export.

---

## 3. Apps

### 3.1 `apps/web` — Authenticated Web Portal

- **Scaffold:** `pnpx create-next-app@latest apps/web --typescript --tailwind --app --src-dir --eslint`
- **Adapt:**
  - `tsconfig.json` extends `@ramcar/config/tsconfig.react.json`
  - ESLint flat config imports `@ramcar/config`
  - Workspace deps: `@ramcar/ui`, `@ramcar/shared`, `@ramcar/store`
  - Clean boilerplate page content (keep `app/layout.tsx`, `app/page.tsx` minimal)
  - Create empty `src/features/` and `src/shared/` directories with `.gitkeep`

### 3.2 `apps/www` — Public Landing Page

- **Scaffold:** `pnpx create-next-app@latest apps/www --typescript --tailwind --app --src-dir --eslint`
- **Adapt:**
  - Same tsconfig/eslint adaptation as web
  - Workspace deps: `@ramcar/ui`, `@ramcar/shared` (no store or minimal)
  - Clean boilerplate, create empty `src/features/` and `src/shared/` with `.gitkeep`

### 3.3 `apps/api` — NestJS Backend

- **Scaffold:** `pnpx @nestjs/cli new apps/api --package-manager pnpm --strict`
- **Adapt:**
  - `tsconfig.json` extends `@ramcar/config/tsconfig.node.json`
  - Replace NestJS default `.eslintrc.js` with flat config importing `@ramcar/config`
  - Workspace deps: `@ramcar/shared`, `@ramcar/db-types`
  - Create empty `src/common/`, `src/modules/`, `src/infrastructure/` directories with `.gitkeep`
  - Keep generated `app.module.ts`, `app.controller.ts`, `app.service.ts`, `main.ts`

### 3.4 `apps/desktop` — Electron + Vite + React

- **Scaffold:** `pnpx create-electron-vite apps/desktop` (React + TypeScript template)
- **Adapt:**
  - Main process tsconfig extends `@ramcar/config/tsconfig.node.json`
  - Renderer tsconfig extends `@ramcar/config/tsconfig.react.json`
  - ESLint flat config importing `@ramcar/config`
  - Add Tailwind CSS to renderer
  - Workspace deps: `@ramcar/ui`, `@ramcar/shared`, `@ramcar/store`
  - Create empty `src/main/services/`, `src/main/repositories/`, `src/main/ipc/` with `.gitkeep`
  - Create empty `src/renderer/features/`, `src/renderer/shared/` with `.gitkeep`
  - Set up `src/preload/index.ts` with minimal contextBridge skeleton

---

## 4. Shared Packages

### 4.1 `packages/ui` — Design System

- `@ramcar/ui`, main entry `src/index.ts`
- tsconfig extends `@ramcar/config/tsconfig.react.json`
- Tailwind CSS with shared theme tokens (colors, typography)
- shadcn/ui initialized: `components.json` pointing to `src/components/`
- Base components added via shadcn CLI: **Button**, **Card**, **Input**
- `src/index.ts` re-exports all components
- `src/lib/utils.ts` — `cn()` utility (shadcn standard)
- Dependencies: `tailwindcss`, `tailwind-merge`, `clsx`, `class-variance-authority`, relevant Radix primitives

### 4.2 `packages/shared` — Types, Validators, Utils

- `@ramcar/shared`, main entry `src/index.ts`
- tsconfig extends `@ramcar/config/tsconfig.base.json`
- `src/index.ts` — barrel export (empty)
- Empty directories: `src/types/`, `src/validators/`, `src/utils/` (with `.gitkeep`)
- Dependencies: `zod`

### 4.3 `packages/store` — Zustand Store

- `@ramcar/store`, main entry `src/index.ts`
- tsconfig extends `@ramcar/config/tsconfig.react.json`
- `src/index.ts` — exports `createStore` factory and `StoreProvider` (minimal SSR-safe skeleton)
- Empty `src/slices/` directory with `.gitkeep`
- Dependencies: `zustand`, `react`

### 4.4 `packages/db-types` — Generated Database Types

- `@ramcar/db-types`, main entry `src/index.ts`
- tsconfig extends `@ramcar/config/tsconfig.base.json`
- `src/index.ts` re-exports from `src/types.ts`
- `src/types.ts` — placeholder comment: "Generated by supabase gen types. Do not edit manually."
- No dependencies (pure types)

---

## 5. Supabase Folder

- `supabase init` at repo root generates `supabase/config.toml`
- `supabase/migrations/` — left empty (no schemas)
- `supabase/seed.sql` — created manually with comment header

---

## 6. Verification

After scaffold is complete:

1. `pnpm install` — all workspace dependencies resolve
2. `pnpm turbo build` — all apps and packages build without errors
3. `pnpm turbo lint` — ESLint passes across all workspaces
4. `pnpm turbo typecheck` — TypeScript compiles cleanly
5. Smoke test: `apps/web` imports and renders `<Button />` from `@ramcar/ui`

---

## 7. Final Directory Tree

```
/
├── .nvmrc
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── apps/
│   ├── web/          # Next.js (create-next-app, adapted)
│   ├── www/          # Next.js (create-next-app, adapted)
│   ├── desktop/      # Electron+Vite+React (create-electron-vite, adapted)
│   └── api/          # NestJS (nest new, adapted)
├── packages/
│   ├── config/       # tsconfigs, eslint, prettier
│   ├── ui/           # shadcn/ui with Button, Card, Input
│   ├── shared/       # Zod, types, utils (empty dirs)
│   ├── store/        # Zustand factory + provider skeleton
│   └── db-types/     # Placeholder for generated types
└── supabase/
    ├── config.toml
    ├── migrations/
    └── seed.sql
```

**CLAUDE.md** will be updated at the end to reflect the actual project state.
