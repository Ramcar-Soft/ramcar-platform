# Research: App Translations (i18n)

**Feature**: 002-app-translations  
**Date**: 2026-04-08

## R1: i18n Library for Web App (`apps/web`)

**Decision**: Use `next-intl` v4

**Rationale**:
- Already proven in the same monorepo (`apps/www` uses next-intl v4 successfully)
- First-class support for Next.js App Router with `[locale]` dynamic segments
- `localePrefix: "as-needed"` gives exactly the URL pattern required: no prefix for default locale (Spanish), `/en` prefix for English
- Works in both Server Components (`getTranslations()`) and Client Components (`useTranslations()`)
- Handles metadata generation, middleware locale detection, and navigation link rewriting
- The `createNavigation()` API provides locale-aware `Link`, `redirect`, `usePathname`, `useRouter`

**Alternatives considered**:
- **react-intl (FormatJS)**: More focused on formatting (dates, numbers), heavier, no Next.js-specific routing support
- **i18next + next-i18next**: next-i18next doesn't support App Router well; would require custom setup
- **Custom solution**: Unnecessary given next-intl handles all requirements natively

**Key configuration** (mirroring `apps/www` pattern with simplified locale codes):

```typescript
// apps/web/src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed", // no prefix for "es", "/en" prefix for English
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

```typescript
// apps/web/src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import es from "@ramcar/i18n/messages/es";
import en from "@ramcar/i18n/messages/en";

const messages = { es, en } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "es" | "en")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: messages[locale as keyof typeof messages],
  };
});
```

## R2: i18n Library for Desktop App (`apps/desktop`)

**Decision**: Use `i18next` + `react-i18next`

**Rationale**:
- Most popular i18n library for React apps (non-Next.js)
- Lightweight, works with Vite + React without SSR complications
- Supports the same nested JSON message format as next-intl (e.g., `{"auth": {"login": {"title": "..."}}}`)
- `useTranslation()` hook API is straightforward for client-side React
- Built-in fallback language support (`fallbackLng: "es"`)
- Translations can be imported directly from the shared package and initialized at app startup — no runtime fetching needed

**Alternatives considered**:
- **next-intl**: Not applicable — requires Next.js
- **react-intl (FormatJS)**: Heavier, overkill for a desktop app with 2 locales
- **Custom solution with React Context**: Would work but reinvents basic i18n features (interpolation, pluralization, namespace support)

**Key configuration**:

```typescript
// apps/desktop/src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "@ramcar/i18n/messages/es";
import en from "@ramcar/i18n/messages/en";

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: "es", // default, will be overridden by persisted preference
  fallbackLng: "es",
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
```

## R3: Shared Translations Package (`@ramcar/i18n`)

**Decision**: New workspace package at `packages/i18n` exporting JSON message files and TypeScript types

**Rationale**:
- Follows the existing `@ramcar/*` workspace package convention (same pattern as `@ramcar/shared`)
- Direct TypeScript source exports (no build step needed) — matches `@ramcar/shared` approach with `"main": "./src/index.ts"`
- JSON files for each locale, imported by both apps at build time
- Type generation from the default locale's JSON structure ensures type-safe keys in both consumers

**Alternatives considered**:
- **Put translations in `@ramcar/shared`**: Mixes concerns; `@ramcar/shared` is for Zod validators/types/utilities, not UI strings
- **Duplicate JSON in each app**: Violates single-source-of-truth requirement from the spec
- **External translation service (Crowdin, Lokalise)**: Overkill for 2 locales; adds external dependency

**Message format compatibility**:
Both next-intl and i18next support nested JSON. The only difference is how they're imported:
- **next-intl**: Expects a flat messages object per locale (passed to `NextIntlClientProvider` or `getRequestConfig`)
- **i18next**: Expects messages nested under `resources.{locale}.translation`

This difference is handled at the import site, not in the shared package. The JSON files are identical for both consumers.

**Package structure**:

```
packages/i18n/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Re-exports: locales config, types, message imports
│   ├── locales.ts        # Constants: LOCALES, DEFAULT_LOCALE, Locale type
│   ├── types.ts          # Generated type from es.json keys (TranslationKeys)
│   └── messages/
│       ├── es.json       # Spanish translations (source of truth / default)
│       ├── en.json       # English translations
│       ├── es.ts         # Re-export: import json from "./es.json"; export default json;
│       └── en.ts         # Re-export: import json from "./en.json"; export default json;
```

**Export strategy**:

```json
// packages/i18n/package.json
{
  "name": "@ramcar/i18n",
  "exports": {
    ".": "./src/index.ts",
    "./messages/es": "./src/messages/es.ts",
    "./messages/en": "./src/messages/en.ts"
  }
}
```

## R4: Middleware Composition (Web App)

**Decision**: Chain next-intl middleware with existing Supabase auth middleware utility

**Rationale**:
- `apps/web` has an existing `src/shared/lib/supabase/middleware.ts` (`updateSession` function) that handles auth redirects
- next-intl provides a `createMiddleware` function that handles locale detection and URL rewriting
- Both must run in a single `middleware.ts` file (Next.js supports only one middleware)
- next-intl v4 supports custom middleware composition via wrapping

**Approach**:
1. The next-intl middleware runs first to resolve the locale
2. Inside the response handling, call `updateSession` for Supabase auth
3. Auth redirects (e.g., redirect to `/login`) must include the locale prefix

**Key consideration**: The existing `updateSession` function checks `request.nextUrl.pathname.startsWith("/login")`. With locale routing, the login path becomes `/[locale]/login` or just `/login` (for default locale with `as-needed` prefix). The auth middleware needs to be locale-aware or the check needs to strip the locale prefix before matching.

## R5: Desktop Language Persistence

**Decision**: Use Electron's main process with a simple JSON settings file, exposed via IPC through the preload Context Bridge

**Rationale**:
- The desktop app's preload.ts is the only bridge between renderer and main process (constitution principle IV)
- localStorage is available in the renderer but is not the constitutional pattern for persistence — the main process handles data storage
- A simple JSON file in `app.getPath('userData')` is sufficient for a single setting
- Electron-store or custom JSON file — both work; a lightweight custom approach avoids an additional dependency

**IPC contract**:
- `getLanguage(): Promise<string>` — returns stored language code or default "es"
- `setLanguage(lang: string): Promise<void>` — persists the language code

These are exposed via `contextBridge.exposeInMainWorld("api", { ... })` alongside existing IPC methods.

## R6: URL Routing Strategy (Web App)

**Decision**: Use `[locale]` dynamic segment wrapping all route groups

**Rationale**:
- Standard next-intl App Router pattern, proven in `apps/www`
- Routes restructured from `app/(auth)/login/page.tsx` to `app/[locale]/(auth)/login/page.tsx`
- The root `app/layout.tsx` becomes a minimal shell (fonts, globals.css only)
- `app/[locale]/layout.tsx` becomes the main layout with `NextIntlClientProvider` and `<html lang={locale}>`

**URL mapping**:

| Spanish (default) | English | Notes |
|---|---|---|
| `/` | `/en` | Home / Dashboard |
| `/login` | `/en/login` | Auth page |
| `/visits` | `/en/visits` | Future feature pages |

**Server Actions**: `login.ts` and `logout.ts` use `redirect("/login")` and `redirect("/")`. These will use the locale-aware `redirect` from `@/i18n/routing` instead of `next/navigation`.

## R7: Locale Code Convention

**Decision**: Use simplified codes `es` and `en`

**Rationale**:
- The spec explicitly requires `/en` URL prefix (not `/en-US`)
- Simpler, shorter URLs
- Both next-intl and i18next work with any string as locale identifier
- The `apps/www` landing page uses `es-MX`/`en-US` — this is fine for a marketing site where region-specific content matters. For the authenticated web portal and desktop app, simplified codes are sufficient.

**Note**: If regional variants are needed later (e.g., `es-MX` vs `es-ES`), the locale codes can be changed in the shared package without restructuring the routing.

## R8: Type Safety Across Consumers

**Decision**: Use TypeScript module augmentation in each consumer app, with types inferred from the shared package's `es.json` via `as const`.

**Rationale**:
- No codegen step needed — TypeScript `resolveJsonModule: true` (already enabled in strict mode) infers the full nested type from JSON
- Each consumer augments its respective library's types to get autocomplete and compile-time key validation

**Web app** (`apps/web`) — next-intl type augmentation:

```typescript
// apps/web/src/types/next-intl.d.ts
import type { Messages } from "@ramcar/i18n";

declare global {
  interface IntlMessages extends Messages {}
}
```

This makes `useTranslations("auth")` fully typed — autocomplete on `t("login.title")`.

**Desktop app** (`apps/desktop`) — i18next type augmentation:

```typescript
// apps/desktop/src/types/i18next.d.ts
import type { Messages } from "@ramcar/i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Messages };
  }
}
```

This makes `t("auth.login.title")` fully typed with dot-notation key paths.

**Shared package** type export:

```typescript
// packages/i18n/src/index.ts
import es from "./messages/es.json";
import en from "./messages/en.json";

export const messages = { es, en } as const;
export type Messages = typeof es; // canonical shape, inferred from default locale
export type Locale = keyof typeof messages; // "es" | "en"
```

## Summary of Technology Choices

| Concern | Decision | Package/Tool |
|---------|----------|-------------|
| Web i18n | next-intl v4 | `next-intl` (matches apps/www) |
| Desktop i18n | i18next + react-i18next | `i18next`, `react-i18next` |
| Shared translations | @ramcar/i18n package | New workspace package |
| Message format | Nested JSON per locale | `es.json`, `en.json` |
| Locale codes | Simplified: es, en | Defined in @ramcar/i18n |
| Web routing | [locale] dynamic segment | next-intl routing |
| Web middleware | Composed next-intl + Supabase | Single middleware.ts |
| Desktop persistence | JSON file via IPC | Custom (no extra deps) |
| Type safety | Types generated from es.json | TypeScript module augmentation |
