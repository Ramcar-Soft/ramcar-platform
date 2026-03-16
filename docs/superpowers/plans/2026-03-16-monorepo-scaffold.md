# Monorepo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the ramcar-platform Turborepo monorepo with all apps, shared packages, tooling config, and Supabase — scaffold only, no feature code or DB schemas.

**Architecture:** pnpm workspaces + Turborepo monorepo containing 4 apps (2 Next.js, 1 NestJS, 1 Electron+Vite+React) and 5 shared packages (@ramcar/config, @ramcar/ui, @ramcar/shared, @ramcar/store, @ramcar/db-types). CLI-first scaffold for apps, then adapt to monorepo conventions.

**Tech Stack:** pnpm 10.x, Turborepo, TypeScript, Next.js 14+, NestJS, Electron + Vite, shadcn/ui, Tailwind CSS, Zustand, Zod, Supabase CLI

**Spec:** `docs/superpowers/specs/2026-03-16-monorepo-scaffold-design.md`

---

## Chunk 1: Root Monorepo Foundation + `packages/config`

Everything else depends on this. Root config files, then the shared tooling configs that all apps/packages extend.

### Task 1: Root monorepo config files

**Files:**
- Create: `.nvmrc`
- Create: `.npmrc`
- Create: `pnpm-workspace.yaml`
- Modify: `package.json` (replace entirely)
- Create: `turbo.json`
- Modify: `.gitignore` (replace entirely)

- [ ] **Step 1: Create `.nvmrc`**

```
22
```

- [ ] **Step 2: Create `.npmrc`**

```
strict-peer-dependencies=true
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create root `package.json`**

```json
{
  "name": "ramcar-platform",
  "private": true,
  "packageManager": "pnpm@10.28.2",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "db:migrate": "supabase db push",
    "db:new": "supabase migration new",
    "db:types": "supabase gen types typescript --local > packages/db-types/src/types.ts",
    "db:reset": "supabase db reset",
    "db:start": "supabase start"
  }
}
```

- [ ] **Step 5: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": [
    "NEXT_PUBLIC_*",
    "SUPABASE_*"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "out/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

- [ ] **Step 6: Replace `.gitignore`**

```gitignore
# dependencies
node_modules/
.pnp
.pnp.js

# builds
.next/
out/
dist/
build/

# turbo
.turbo/

# env
.env
.env*.local

# misc
.DS_Store
*.pem
*.tsbuildinfo
next-env.d.ts

# debug
npm-debug.log*
pnpm-debug.log*

# vercel
.vercel

# electron
release/
*.exe
*.dmg
*.snap

# supabase local
supabase/.branches
supabase/.temp

# IDE
.idea/
.vscode/
*.swp
*.swo

# coverage
coverage/
```

- [ ] **Step 7: Install turbo as root dev dependency**

Run: `pnpm add -Dw turbo`
Expected: `turbo` added to root `package.json` devDependencies

- [ ] **Step 8: Verify root setup**

Run: `pnpm turbo --version`
Expected: Turbo version printed without errors

- [ ] **Step 9: Commit**

```bash
git add .nvmrc .npmrc pnpm-workspace.yaml package.json turbo.json .gitignore pnpm-lock.yaml
git commit -m "chore: initialize monorepo root with pnpm + Turborepo config"
```

---

### Task 2: `packages/config` — Shared tooling configs

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.base.json`
- Create: `packages/config/tsconfig.react.json`
- Create: `packages/config/tsconfig.node.json`
- Create: `packages/config/eslint.config.mjs`
- Create: `packages/config/prettier.config.mjs`
- Create: `packages/config/tailwind.preset.ts`

- [ ] **Step 1: Create directory**

Run: `mkdir -p packages/config`

- [ ] **Step 2: Create `packages/config/package.json`**

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
    "./prettier": "./prettier.config.mjs",
    "./tailwind": "./tailwind.preset.ts"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^10.0.0",
    "prettier": "^3.0.0",
    "typescript-eslint": "^8.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

- [ ] **Step 3: Create `packages/config/tsconfig.base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create `packages/config/tsconfig.react.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

- [ ] **Step 5: Create `packages/config/tsconfig.node.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "types": ["node"]
  }
}
```

- [ ] **Step 6: Create `packages/config/eslint.config.mjs`**

```js
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/out/**"],
  },
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
```

- [ ] **Step 7: Create `packages/config/prettier.config.mjs`**

```js
/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  tabWidth: 2,
  printWidth: 100,
};
```

- [ ] **Step 8: Create `packages/config/tailwind.preset.ts`**

```ts
import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
      },
    },
  },
};

export default preset;
```

- [ ] **Step 9: Install dependencies**

Run: `pnpm install`
Expected: Workspace dependencies resolve, `pnpm-lock.yaml` updated

- [ ] **Step 10: Commit**

```bash
git add packages/config/ pnpm-lock.yaml
git commit -m "chore: add packages/config with tsconfigs, eslint, prettier, tailwind preset"
```

---

## Chunk 2: Shared Packages (`db-types`, `shared`, `store`)

These packages have no CLI scaffold — all created manually. They must exist before apps reference them as workspace deps.

### Task 3: `packages/db-types` — Generated type placeholder

**Files:**
- Create: `packages/db-types/package.json`
- Create: `packages/db-types/tsconfig.json`
- Create: `packages/db-types/src/types.ts`
- Create: `packages/db-types/src/index.ts`

- [ ] **Step 1: Create directory**

Run: `mkdir -p packages/db-types/src`

- [ ] **Step 2: Create `packages/db-types/package.json`**

```json
{
  "name": "@ramcar/db-types",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@ramcar/config": "workspace:*",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create `packages/db-types/tsconfig.json`**

```json
{
  "extends": "@ramcar/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `packages/db-types/src/types.ts`**

```ts
// Auto-generated by: supabase gen types typescript --local
// Do not edit manually. Run `pnpm db:types` from repo root to regenerate.

export type Database = Record<string, never>;
```

- [ ] **Step 5: Create `packages/db-types/src/index.ts`**

```ts
export type { Database } from "./types";
```

- [ ] **Step 6: Commit**

```bash
git add packages/db-types/
git commit -m "chore: add packages/db-types placeholder for generated Supabase types"
```

---

### Task 4: `packages/shared` — Types, validators, utils

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/.gitkeep`
- Create: `packages/shared/src/validators/.gitkeep`
- Create: `packages/shared/src/utils/.gitkeep`

- [ ] **Step 1: Create directories**

Run: `mkdir -p packages/shared/src/{types,validators,utils}`

- [ ] **Step 2: Create `packages/shared/package.json`**

```json
{
  "name": "@ramcar/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@ramcar/config": "workspace:*",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "@ramcar/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `packages/shared/src/index.ts`**

```ts
// Barrel export — add types, validators, and utils as they are created
export {};
```

- [ ] **Step 5: Create `.gitkeep` files**

Run: `touch packages/shared/src/types/.gitkeep packages/shared/src/validators/.gitkeep packages/shared/src/utils/.gitkeep`

- [ ] **Step 6: Commit**

```bash
git add packages/shared/
git commit -m "chore: add packages/shared with zod, empty type/validator/util dirs"
```

---

### Task 5: `packages/store` — Zustand store skeleton

**Files:**
- Create: `packages/store/package.json`
- Create: `packages/store/tsconfig.json`
- Create: `packages/store/src/index.ts`
- Create: `packages/store/src/slices/.gitkeep`

- [ ] **Step 1: Create directories**

Run: `mkdir -p packages/store/src/slices`

- [ ] **Step 2: Create `packages/store/package.json`**

```json
{
  "name": "@ramcar/store",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zustand": "^5.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@ramcar/config": "workspace:*",
    "@types/react": "^19.0.0",
    "react": "^19.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create `packages/store/tsconfig.json`**

```json
{
  "extends": "@ramcar/config/tsconfig.react.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `packages/store/src/index.ts`**

```ts
"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { createStore as createZustandStore, type StoreApi } from "zustand";

// Minimal store shape — slices will be added as features are built
export interface AppState {
  // placeholder
}

export const createStore = () => {
  return createZustandStore<AppState>()(() => ({}));
};

type AppStore = StoreApi<AppState>;

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore>(undefined);
  if (!storeRef.current) {
    storeRef.current = createStore();
  }
  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useAppStore must be used within a StoreProvider");
  }
  return store;
}
```

- [ ] **Step 5: Create `.gitkeep`**

Run: `touch packages/store/src/slices/.gitkeep`

- [ ] **Step 6: Install all workspace dependencies so far**

Run: `pnpm install`
Expected: All workspace packages resolve. Lock file updated.

- [ ] **Step 7: Commit**

```bash
git add packages/store/ pnpm-lock.yaml
git commit -m "chore: add packages/store with Zustand factory + SSR-safe StoreProvider"
```

---

## Chunk 3: Scaffold Apps via CLI

Use each framework's CLI to create the apps, then adapt them to the monorepo. Each task scaffolds one app and does the full adaptation.

### Task 6: `apps/web` — Next.js authenticated portal

**Files:**
- Create via CLI: `apps/web/` (entire directory)
- Modify: `apps/web/package.json` (add workspace deps, rename)
- Modify: `apps/web/tsconfig.json` (extend shared config)
- Create: `apps/web/eslint.config.mjs`
- Modify: `apps/web/tailwind.config.ts` (shared preset + ui content paths)
- Modify: `apps/web/src/app/layout.tsx` (minimal content)
- Modify: `apps/web/src/app/page.tsx` (minimal content)
- Create: `apps/web/src/features/.gitkeep`
- Create: `apps/web/src/shared/.gitkeep`

- [ ] **Step 1: Scaffold via create-next-app**

Run: `pnpx create-next-app@latest apps/web --typescript --tailwind --app --src-dir --no-eslint --no-git --use-pnpm`
Expected: Next.js app created at `apps/web/` with App Router, Tailwind, TypeScript, src directory

- [ ] **Step 2: Update `apps/web/package.json`**

Update the `name` field to `@ramcar/web`. Add workspace dependencies:

```json
"name": "@ramcar/web",
```

Runtime workspace deps (these provide components/types/stores used at build and runtime):
```bash
cd apps/web && pnpm add @ramcar/ui@workspace:* @ramcar/shared@workspace:* @ramcar/store@workspace:*
```

Dev-only workspace deps:
```bash
cd apps/web && pnpm add -D @ramcar/config@workspace:*
```

Add to `scripts`:
```json
"typecheck": "tsc --noEmit",
"lint": "eslint ."
```

- [ ] **Step 3: Update `apps/web/next.config.mjs` (or `next.config.ts`)**

Add `transpilePackages` so Next.js can process raw TypeScript from workspace packages:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ramcar/ui", "@ramcar/shared", "@ramcar/store"],
};

export default nextConfig;
```

Note: If `create-next-app` generated `next.config.ts`, adapt accordingly (same content, TypeScript syntax).

- [ ] **Step 4: Replace `apps/web/tsconfig.json`**

```json
{
  "extends": "@ramcar/config/tsconfig.react.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create `apps/web/eslint.config.mjs`**

```js
import baseConfig from "@ramcar/config/eslint";

export default [
  ...baseConfig,
  {
    rules: {
      // Next.js specific overrides if needed
    },
  },
];
```

- [ ] **Step 6: Update `apps/web/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
import sharedPreset from "@ramcar/config/tailwind";

const config: Config = {
  presets: [sharedPreset as Config],
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

- [ ] **Step 7: Simplify `apps/web/src/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">Ramcar Web Portal</h1>
    </main>
  );
}
```

- [ ] **Step 8: Clean `apps/web/src/app/layout.tsx`**

Keep the generated layout but remove any boilerplate metadata descriptions. Ensure it has the basic structure with `<html>` and `<body>` tags, fonts, and global CSS import.

- [ ] **Step 9: Create feature/shared directories**

Run: `mkdir -p apps/web/src/features apps/web/src/shared && touch apps/web/src/features/.gitkeep apps/web/src/shared/.gitkeep`

- [ ] **Step 10: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Next.js builds successfully

- [ ] **Step 11: Commit**

```bash
git add apps/web/
git commit -m "chore: scaffold apps/web via create-next-app, adapt to monorepo"
```

---

### Task 7: `apps/www` — Next.js public landing page

**Files:**
- Create via CLI: `apps/www/` (entire directory)
- Modify: `apps/www/package.json`
- Modify: `apps/www/tsconfig.json`
- Create: `apps/www/eslint.config.mjs`
- Modify: `apps/www/tailwind.config.ts`
- Modify: `apps/www/src/app/page.tsx`
- Create: `apps/www/src/features/.gitkeep`
- Create: `apps/www/src/shared/.gitkeep`

- [ ] **Step 1: Scaffold via create-next-app**

Run: `pnpx create-next-app@latest apps/www --typescript --tailwind --app --src-dir --no-eslint --no-git --use-pnpm`
Expected: Next.js app created at `apps/www/`

- [ ] **Step 2: Update `apps/www/package.json`**

Update name to `@ramcar/www`. Add workspace deps (no store):

Runtime workspace deps:
```bash
cd apps/www && pnpm add @ramcar/ui@workspace:* @ramcar/shared@workspace:*
```

Dev-only workspace deps:
```bash
cd apps/www && pnpm add -D @ramcar/config@workspace:*
```

Add to `scripts`:
```json
"typecheck": "tsc --noEmit",
"lint": "eslint ."
```

- [ ] **Step 3: Update `apps/www/next.config.mjs` (or `next.config.ts`)**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ramcar/ui", "@ramcar/shared"],
};

export default nextConfig;
```

- [ ] **Step 4: Replace `apps/www/tsconfig.json`**

```json
{
  "extends": "@ramcar/config/tsconfig.react.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create `apps/www/eslint.config.mjs`**

```js
import baseConfig from "@ramcar/config/eslint";

export default [
  ...baseConfig,
  {
    rules: {
      // www-specific overrides if needed
    },
  },
];
```

- [ ] **Step 6: Update `apps/www/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
import sharedPreset from "@ramcar/config/tailwind";

const config: Config = {
  presets: [sharedPreset as Config],
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

- [ ] **Step 7: Simplify `apps/www/src/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">Ramcar — Residential Security Platform</h1>
    </main>
  );
}
```

- [ ] **Step 8: Create feature/shared directories**

Run: `mkdir -p apps/www/src/features apps/www/src/shared && touch apps/www/src/features/.gitkeep apps/www/src/shared/.gitkeep`

- [ ] **Step 9: Verify build**

Run: `cd apps/www && pnpm build`
Expected: Next.js builds successfully

- [ ] **Step 10: Commit**

```bash
git add apps/www/
git commit -m "chore: scaffold apps/www via create-next-app, adapt to monorepo"
```

---

### Task 8: `apps/api` — NestJS backend

**Files:**
- Create via CLI: `apps/api/` (entire directory)
- Modify: `apps/api/package.json`
- Modify: `apps/api/tsconfig.json`
- Create: `apps/api/eslint.config.mjs`
- Delete: `apps/api/.eslintrc.js` (if generated)
- Create: `apps/api/src/common/.gitkeep`
- Create: `apps/api/src/modules/.gitkeep`
- Create: `apps/api/src/infrastructure/.gitkeep`

- [ ] **Step 1: Scaffold via NestJS CLI**

Run: `cd apps && pnpx @nestjs/cli new api --package-manager pnpm --strict --skip-git`
Expected: NestJS app created at `apps/api/` with strict TypeScript, no nested .git

- [ ] **Step 2: Update `apps/api/package.json`**

Update name to `@ramcar/api`. Add workspace deps:

Runtime workspace deps:
```bash
cd apps/api && pnpm add @ramcar/shared@workspace:* @ramcar/db-types@workspace:*
```

Dev-only workspace deps:
```bash
cd apps/api && pnpm add -D @ramcar/config@workspace:*
```

Add/update scripts:
```json
"typecheck": "tsc --noEmit"
```

Ensure `lint` script uses: `eslint .`

- [ ] **Step 3: Update `apps/api/tsconfig.json`**

```json
{
  "extends": "@ramcar/config/tsconfig.node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2022",
    "sourceMap": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

Note: Keep `apps/api/tsconfig.build.json` as NestJS uses it for its build step. Ensure it extends the local `tsconfig.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 4: Delete legacy ESLint config and create flat config**

Run: `rm -f apps/api/.eslintrc.js apps/api/.eslintrc.json`

Create `apps/api/eslint.config.mjs`:

```js
import baseConfig from "@ramcar/config/eslint";

export default [
  ...baseConfig,
  {
    rules: {
      // NestJS uses empty constructors for DI
      "@typescript-eslint/no-empty-function": "off",
    },
  },
];
```

- [ ] **Step 5: Create architecture directories**

Run: `mkdir -p apps/api/src/common apps/api/src/modules apps/api/src/infrastructure && touch apps/api/src/common/.gitkeep apps/api/src/modules/.gitkeep apps/api/src/infrastructure/.gitkeep`

- [ ] **Step 6: Verify build**

Run: `cd apps/api && pnpm build`
Expected: NestJS compiles successfully to `dist/`

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "chore: scaffold apps/api via NestJS CLI, adapt to monorepo"
```

---

### Task 9: `apps/desktop` — Electron + Vite + React

**Files:**
- Create via CLI: `apps/desktop/` (entire directory)
- Modify: `apps/desktop/package.json`
- Modify: main process tsconfig (extends node config)
- Modify: renderer process tsconfig (extends react config)
- Create: `apps/desktop/eslint.config.mjs`
- Create: `apps/desktop/src/renderer/tailwind.config.ts` (or root-level, depends on scaffold output)
- Create: architecture directories (main/services, main/repositories, main/ipc, renderer/features, renderer/shared)

- [ ] **Step 1: Scaffold via create-electron-vite**

Run: `pnpx create-electron-vite apps/desktop`
When prompted, select: **React** + **TypeScript**
Expected: Electron + Vite + React app created at `apps/desktop/`

- [ ] **Step 2: Examine scaffold output**

Run: `ls -la apps/desktop/ && ls -la apps/desktop/src/`
Note: The exact directory structure may vary by `electron-vite` version. Adapt the following steps to match the actual output. Typical structure:
```
apps/desktop/
├── electron.vite.config.ts
├── package.json
├── src/
│   ├── main/        (or index.ts at root)
│   ├── preload/
│   └── renderer/
```

- [ ] **Step 3: Update `apps/desktop/package.json`**

Update name to `@ramcar/desktop`. Add workspace deps:

Runtime workspace deps:
```bash
cd apps/desktop && pnpm add @ramcar/ui@workspace:* @ramcar/shared@workspace:* @ramcar/store@workspace:*
```

Dev-only workspace deps:
```bash
cd apps/desktop && pnpm add -D @ramcar/config@workspace:*
```

Add Tailwind deps:
```bash
cd apps/desktop && pnpm add -D tailwindcss postcss autoprefixer
```

Add scripts:
```json
"typecheck": "tsc --noEmit",
"lint": "eslint ."
```

- [ ] **Step 4: Update tsconfig files**

For the main process tsconfig (e.g., `tsconfig.node.json` or `tsconfig.main.json`):
```json
{
  "extends": "@ramcar/config/tsconfig.node.json",
  "compilerOptions": {
    "outDir": "./dist/main"
  },
  "include": ["src/main/**/*"]
}
```

For the renderer process tsconfig (e.g., `tsconfig.web.json` or `tsconfig.renderer.json`):
```json
{
  "extends": "@ramcar/config/tsconfig.react.json",
  "compilerOptions": {
    "outDir": "./dist/renderer"
  },
  "include": ["src/renderer/**/*"]
}
```

Note: Adapt file names to match what electron-vite generates. The root `tsconfig.json` should reference both via `references` or the electron-vite config handles this.

- [ ] **Step 5: Create `apps/desktop/eslint.config.mjs`**

```js
import baseConfig from "@ramcar/config/eslint";

export default [
  ...baseConfig,
  {
    rules: {
      // Desktop-specific overrides if needed
    },
  },
];
```

- [ ] **Step 6: Add Tailwind to renderer**

Create `apps/desktop/tailwind.config.ts` (or place inside renderer directory if electron-vite expects it there):

```ts
import type { Config } from "tailwindcss";
import sharedPreset from "@ramcar/config/tailwind";

const config: Config = {
  presets: [sharedPreset as Config],
  content: [
    "./src/renderer/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

Create `apps/desktop/postcss.config.js`:
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Add to the renderer's main CSS file (e.g., `src/renderer/src/assets/main.css` or equivalent):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Create architecture directories**

```bash
mkdir -p apps/desktop/src/main/services apps/desktop/src/main/repositories apps/desktop/src/main/ipc
mkdir -p apps/desktop/src/renderer/features apps/desktop/src/renderer/shared
touch apps/desktop/src/main/services/.gitkeep apps/desktop/src/main/repositories/.gitkeep apps/desktop/src/main/ipc/.gitkeep
touch apps/desktop/src/renderer/features/.gitkeep apps/desktop/src/renderer/shared/.gitkeep
```

Note: If the scaffold puts renderer source in `src/renderer/src/`, create the dirs inside `src/renderer/src/` instead.

- [ ] **Step 8: Set up minimal preload/contextBridge skeleton**

Locate the preload file generated by electron-vite (typically `src/preload/index.ts`). Replace its contents with a minimal contextBridge skeleton:

```ts
import { contextBridge, ipcRenderer } from "electron";

// Minimal context bridge — extend as features are built
const api = {
  ping: () => ipcRenderer.invoke("ping"),
};

contextBridge.exposeInMainWorld("api", api);
```

Also add a type declaration file `src/preload/index.d.ts` so the renderer can access `window.api` with types:

```ts
export interface ElectronAPI {
  ping: () => Promise<string>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
```

- [ ] **Step 9: Verify build**

Run: `cd apps/desktop && pnpm build`
Expected: Electron app builds successfully (main + renderer + preload)

- [ ] **Step 10: Commit**

```bash
git add apps/desktop/
git commit -m "chore: scaffold apps/desktop via create-electron-vite, adapt to monorepo"
```

---

## Chunk 4: `packages/ui` with shadcn/ui + Cross-Package Verification

### Task 10: `packages/ui` — Design system with shadcn/ui

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/tailwind.config.ts`
- Create: `packages/ui/postcss.config.js`
- Create: `packages/ui/components.json`
- Create: `packages/ui/src/lib/utils.ts`
- Create: `packages/ui/src/index.ts`
- Created by shadcn CLI: `packages/ui/src/components/ui/button.tsx`
- Created by shadcn CLI: `packages/ui/src/components/ui/card.tsx`
- Created by shadcn CLI: `packages/ui/src/components/ui/input.tsx`

- [ ] **Step 1: Create directories**

Run: `mkdir -p packages/ui/src/components/ui packages/ui/src/lib`

- [ ] **Step 2: Create `packages/ui/package.json`**

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
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create `packages/ui/tsconfig.json`**

```json
{
  "extends": "@ramcar/config/tsconfig.react.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `packages/ui/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
import sharedPreset from "@ramcar/config/tailwind";

const config: Config = {
  presets: [sharedPreset as Config],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create `packages/ui/postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `packages/ui/src/globals.css`**

This file must include shadcn/ui CSS custom properties. The `shadcn init` or `shadcn add` commands will inject these automatically. If setting up manually, include the Tailwind directives plus the CSS variables block:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

Note: These are the neutral base color values for shadcn/ui new-york style with `cssVariables: true`. The exact values may differ slightly — if `shadcn init` runs successfully later (Step 9), let it overwrite this file.

- [ ] **Step 7: Create `packages/ui/src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 8: Create `packages/ui/components.json`**

This is the shadcn/ui config. If `pnpx shadcn@latest init` works in the package directory, use it. Otherwise create manually:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 9: Add shadcn/ui components**

Try the CLI first from `packages/ui/`:
```bash
cd packages/ui && pnpx shadcn@latest add button card input
```

**If the CLI fails** (common in monorepo packages without a framework), use the manual fallback:

1. Visit the shadcn registry and copy component source code:
   - Button: `https://ui.shadcn.com/docs/components/button` → copy into `src/components/ui/button.tsx`
   - Card: `https://ui.shadcn.com/docs/components/card` → copy into `src/components/ui/card.tsx`
   - Input: `https://ui.shadcn.com/docs/components/input` → copy into `src/components/ui/input.tsx`
2. Ensure imports in copied files use `@/lib/utils` for `cn()` (matches the tsconfig paths alias)
3. Verify `@radix-ui/react-slot` and `lucide-react` are in `package.json` dependencies (added in Step 2)
4. Run `pnpm install` to resolve any new Radix primitives the components may need

Note: If the CLI runs and overwrites `globals.css`, verify the CSS variables block is still present.

- [ ] **Step 10: Create `packages/ui/src/index.ts`**

```ts
// Components
export { Button, buttonVariants } from "./components/ui/button";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/ui/card";
export { Input } from "./components/ui/input";

// Utils
export { cn } from "./lib/utils";
```

Note: Adjust exports to match the actual shadcn output (component names and exports may vary slightly by version).

- [ ] **Step 11: Install dependencies**

Run: `pnpm install`
Expected: All workspace deps resolve, Radix primitives installed by shadcn

- [ ] **Step 12: Verify typecheck**

Run: `cd packages/ui && pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 13: Commit**

```bash
git add packages/ui/ pnpm-lock.yaml
git commit -m "chore: add packages/ui with shadcn/ui (Button, Card, Input) + Tailwind"
```

---

### Task 11: Smoke test — `apps/web` imports `@ramcar/ui`

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Ensure `apps/web` imports shadcn CSS**

In `apps/web/src/app/layout.tsx`, add the shadcn globals CSS import alongside the existing global CSS import:

```tsx
import "@ramcar/ui/globals.css";
```

This ensures the shadcn CSS custom properties (colors, radius, etc.) are available. Place this import before any local CSS imports.

- [ ] **Step 2: Update `apps/web/src/app/page.tsx` to import Button**

```tsx
import { Button } from "@ramcar/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Ramcar Web Portal</h1>
      <Button>Get Started</Button>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Next.js builds with the Button component from `@ramcar/ui` rendered

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/layout.tsx
git commit -m "chore: smoke test — apps/web imports Button from @ramcar/ui"
```

---

## Chunk 5: Supabase + Full Verification + CLAUDE.md

### Task 12: Supabase initialization

**Files:**
- Create via CLI: `supabase/config.toml`
- Create via CLI: `supabase/migrations/` (empty)
- Create: `supabase/seed.sql`

- [ ] **Step 1: Initialize Supabase**

Run: `supabase init`
Expected: `supabase/config.toml` created, `supabase/` directory structure generated

If `supabase` CLI is not installed:
Run: `pnpm add -Dw supabase`
Then: `pnpx supabase init`

- [ ] **Step 2: Create `supabase/seed.sql`**

```sql
-- Development seed data
-- Run with: supabase db reset
-- This file is executed after all migrations when resetting the local database.
```

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "chore: initialize Supabase CLI config"
```

---

### Task 13: Full monorepo verification

- [ ] **Step 1: Clean install (keep lockfile)**

Run: `rm -rf node_modules apps/*/node_modules packages/*/node_modules && pnpm install`
Expected: All workspace dependencies resolve from the existing lockfile. Then verify lockfile integrity:
Run: `pnpm install --frozen-lockfile`
Expected: Passes without error (lockfile is in sync)

- [ ] **Step 2: Turbo build**

Run: `pnpm build`
Expected: All apps and packages build without errors. Check output for each workspace.

- [ ] **Step 3: Turbo lint**

Run: `pnpm lint`
Expected: ESLint passes across all workspaces. Fix any issues.

- [ ] **Step 4: Turbo typecheck**

Run: `pnpm typecheck`
Expected: TypeScript compiles cleanly in all workspaces. Fix any issues.

- [ ] **Step 5: Fix any issues found**

If any step above fails, fix the issues and re-run until all pass. Common issues:
- Missing peer dependencies → add them
- TypeScript path resolution → check tsconfig extends
- ESLint config import errors → check exports map in `@ramcar/config`
- Tailwind not finding classes → check content paths

- [ ] **Step 6: Commit any fixes**

Stage only the files you fixed (avoid `git add -A` which may stage unintended files):
```bash
git add <specific-files-fixed>
git commit -m "fix: resolve build/lint/typecheck issues from full verification"
```

---

### Task 14: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace `CLAUDE.md` with full project documentation**

Write the following content to `CLAUDE.md`:

````markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Ramcar Platform — a multi-tenant residential security platform. This Turborepo monorepo contains the web portal, landing page, Electron desktop app for guard booths, and NestJS backend API. The mobile app lives in a separate repository (`ramcar-mobile`).

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Language:** TypeScript (all apps and packages)
- **Node:** 22 LTS (enforced via `.nvmrc` and `engines`)
- **Frontend:** Next.js 14+ (App Router), shadcn/ui, Tailwind CSS, Zustand, TanStack Query v5
- **Backend:** NestJS (modular monolith)
- **Desktop:** Electron + Vite + React (offline-first, SQLite)
- **Database:** PostgreSQL via Supabase (RLS, Auth, Storage, Realtime)
- **Auth:** Supabase Auth (JWT, 2FA TOTP)

## Monorepo Structure

```
apps/web       — Next.js authenticated portal (Admin + Resident)
apps/www       — Next.js public landing page (marketing, no auth)
apps/desktop   — Electron + Vite + React guard booth app (offline-first)
apps/api       — NestJS backend REST API

packages/config    — Shared tsconfigs, ESLint flat config, Prettier, Tailwind preset
packages/ui        — shadcn/ui design system (shared React components)
packages/shared    — TypeScript types, Zod validators, utilities
packages/store     — Zustand store (shared between web and desktop)
packages/db-types  — TypeScript types generated from Supabase schema

supabase/          — Supabase CLI root (migrations, seed, config)
```

## Commands

```bash
pnpm dev          # Start all apps in development
pnpm build        # Build all apps and packages
pnpm lint         # ESLint across all workspaces
pnpm typecheck    # TypeScript check across all workspaces
pnpm test         # Run tests across all workspaces

# Database (run from repo root)
pnpm db:start     # Start local Supabase
pnpm db:migrate   # Push migrations to remote
pnpm db:new       # Create new migration file
pnpm db:types     # Regenerate TypeScript types from schema
pnpm db:reset     # Reset local database with seed data
```

## Architecture

### `apps/web` and `apps/www` — Feature-Based + App Router

**Directory roles:**
- `src/app/` — Routing ONLY (page.tsx, layout.tsx, route groups). No business logic.
- `src/features/[domain]/` — All domain logic (components, hooks, API calls, types). Self-contained vertical slice.
- `src/shared/` — Cross-feature utilities, generic components, HTTP client.

**Import rules (strictly enforced):**
```
app/ → features/, shared/       (app imports from features and shared)
features/A/ ✗ features/B/       (features NEVER import from each other)
shared/ ✗ features/             (shared NEVER imports from features)
```

**State management:**
- React Query (TanStack Query v5) owns all server/async state
- Zustand (from @ramcar/store) owns client/UI state (toasts, modals, sidebar)
- React Query keys always include tenantId: `[resource, tenantId, modifier, filters]`
- No overlap between React Query and Zustand

`apps/www` is the same architecture but simpler — no auth, no store.

### `apps/api` — Modular Monolith + Repository Pattern

**Request flow:** `HTTP Request → Controller → Service → Repository → Supabase/Postgres`

**Directory roles:**
- `src/common/` — Guards (JwtAuth, Roles, Tenant), decorators (@CurrentTenant, @Roles), interceptors, exception filters, Zod validation pipe
- `src/modules/[domain]/` — One NestJS module per business domain
- `src/infrastructure/` — Supabase client singleton, Storage service, BullMQ queue

**Simple module:** `module + controller + service + repository + dto/`

**Complex module (blacklist, visits, users, sync):** adds `use-cases/` directory and repository interface (domain port).

**Tenant isolation:**
- TenantGuard extracts tenant_id from JWT once per request
- @CurrentTenant() decorator injects it into controllers/services
- Every query MUST be filtered by tenant_id — no unscoped queries allowed

**RBAC:** `SuperAdmin > Admin (per tenant) > Guard > Resident`
Enforced at NestJS guards (API) + Postgres RLS (DB).

**Module import rules:**
- Cross-module communication goes through NestJS DI (exported services), never direct file imports
- common/ is imported by all modules, never the reverse
- infrastructure/ is imported by modules that need it, never the reverse

### `apps/desktop` — Feature-Based (Renderer) + Service/Repository (Main)

Two-process architecture communicating ONLY via IPC.

**Main process (Node.js):**
- `src/main/services/` — Business logic, SyncEngine, auto-updater
- `src/main/repositories/` — ONLY point of contact with SQLite
- `src/main/ipc/` — IPC handlers (delegate to services/repos, NO business logic)

**Renderer process (React + Vite):**
- `src/renderer/features/` — Same Feature-Based pattern as apps/web
- `src/renderer/shared/` — Generic components, useIpc hooks, useSyncStatus

**Preload (Context Bridge):** `src/preload/index.ts` is the ONLY contract between processes. If a function is not declared there, the renderer cannot call it.

**Offline-first:** SQLite (main process only) + Outbox pattern with UUID event_id for idempotent sync. SyncSlice states: `idle | syncing | error | offline`.

### Shared Packages

- **@ramcar/shared** — Zod schemas define DTOs once, reused by API validation AND frontend forms
- **@ramcar/store** — Zustand with slice pattern. SSR-safe via createStore() factory + StoreProvider context
- **@ramcar/ui** — shadcn/ui components copied (not installed as dep). Built on Radix + Tailwind.
- **@ramcar/db-types** — Auto-generated from Supabase schema. Never edit manually.

## Coding Conventions

- All workspace packages use `@ramcar/` scope
- ESLint: flat config (`eslint.config.mjs`), extends `@ramcar/config/eslint`
- Prettier: shared config from `@ramcar/config/prettier`
- Tailwind: shared preset from `@ramcar/config/tailwind`, each consumer sets content paths including `packages/ui`
- TypeScript: strict mode, extends shared tsconfigs from `@ramcar/config`
- Next.js apps override `jsx: "preserve"` (Next.js handles JSX transformation)

## Adding New Features

1. **Frontend (web/www):** Create `src/features/[domain]/` with components, hooks, types. Wire into `src/app/` routes.
2. **Backend (api):** Create `src/modules/[domain]/` with module, controller, service, repository, dto/. Register in AppModule.
3. **Desktop:** Main process: `src/main/` (service + repository + IPC handler). Renderer: `src/renderer/features/[domain]/`. Bridge: add to `src/preload/index.ts`.
4. **Shared types/validators:** Add to `packages/shared/src/types/` or `packages/shared/src/validators/`.
5. **UI components:** `cd packages/ui && pnpx shadcn@latest add [component]`, then re-export from `src/index.ts`.
6. **Database migrations:** `pnpm db:new [name]`, write SQL, `pnpm db:migrate`, `pnpm db:types`.
````

- [ ] **Step 2: Verify CLAUDE.md is comprehensive**

Read through it and ensure an engineer with zero context could:
- Understand the project structure
- Run dev/build/lint commands
- Know where to put new code
- Follow the architectural rules

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with full project architecture and conventions"
```
