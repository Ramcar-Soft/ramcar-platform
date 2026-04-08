# Implementation Plan: App Translations (i18n)

**Branch**: `002-app-translations` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-app-translations/spec.md`

## Summary

Add bilingual (Spanish default / English) support to the web portal (`apps/web`) and desktop guard booth app (`apps/desktop`). The web app uses URL-based language routing (`/` for Spanish, `/en/*` for English) with a language switcher. The desktop app uses an in-app language setting persisted locally. A new shared translations package (`@ramcar/i18n`) provides a single source of truth for all translation strings, consumed by both apps.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS  
**Primary Dependencies**: next-intl v4 (web — aligns with existing apps/www), react-i18next + i18next (desktop — lightweight, works with Vite/React without Next.js), shared JSON message files  
**Storage**: localStorage (desktop language preference), URL path segment (web language context)  
**Testing**: Vitest (unit — translation key completeness), Playwright or manual (e2e — language routing)  
**Target Platform**: Web (Next.js 16 App Router), Desktop (Electron 30 + Vite + React 18)  
**Project Type**: Monorepo cross-cutting feature (new shared package + changes to two existing apps)  
**Performance Goals**: Language switch under 2 seconds, no additional network requests for translations (bundled)  
**Constraints**: Offline-capable (desktop), translations bundled at build time, no runtime translation fetching  
**Scale/Scope**: 2 supported locales (es, en), ~50-100 translation keys initially (auth screens + shared UI), growing as features are added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | **PASS** | Translations are UI-only, not tenant-scoped. No database queries involved. |
| II. Feature-Based Architecture | **PASS** | Translations are a cross-cutting concern. Placed in `packages/i18n` (shared package), not inside a feature directory. Each app's integration code lives in `src/shared/` or `src/i18n/` (not in `src/features/`). |
| III. Strict Import Boundaries | **PASS** | `@ramcar/i18n` is a workspace package — importable by any app/feature without violating import rules. No cross-feature imports needed. |
| IV. Offline-First Desktop | **PASS** | All translations are bundled locally at build time. Language switching works entirely offline. No network dependency. |
| V. Shared Validation via Zod | **PASS** | Not directly applicable. Translation keys are static strings, not user input requiring validation. |
| VI. Role-Based Access Control | **PASS** | Language preference is not role-restricted. All users can switch languages. |
| VII. TypeScript Strict Mode | **PASS** | Translation keys will be typed. The i18n package exports type-safe key references. |

**Gate result**: PASS — No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-app-translations/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/i18n/                    # NEW — @ramcar/i18n shared translations package
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # Public API: locale config, types, utilities
│   ├── locales.ts                # Supported locales, default locale constants
│   └── messages/
│       ├── es.json               # Spanish translations (default language)
│       └── en.json               # English translations
└── README.md

apps/web/                         # MODIFIED — add next-intl i18n routing
├── next.config.ts                # Add next-intl plugin
├── src/
│   ├── i18n/
│   │   ├── routing.ts            # NEW — defineRouting config (locales, prefix)
│   │   └── request.ts            # NEW — getRequestConfig (loads messages from @ramcar/i18n)
│   ├── middleware.ts              # NEW — next-intl middleware for locale routing
│   ├── app/
│   │   ├── [locale]/             # NEW — dynamic locale segment wrapping all routes
│   │   │   ├── layout.tsx        # Root layout with NextIntlClientProvider, lang attr
│   │   │   ├── (auth)/           # MOVED from app/(auth)/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── login/page.tsx
│   │   │   └── (protected)/      # MOVED from app/(protected)/
│   │   │       ├── layout.tsx
│   │   │       └── page.tsx
│   │   └── layout.tsx            # Simplified root layout (fonts, globals only)
│   ├── features/auth/
│   │   └── components/
│   │       └── login-form.tsx    # MODIFIED — replace hardcoded strings with useTranslations()
│   └── shared/
│       └── components/
│           └── language-switcher.tsx  # NEW — language toggle component

apps/desktop/                     # MODIFIED — add i18next for renderer
├── src/
│   ├── i18n/
│   │   └── index.ts              # NEW — i18next initialization, loads messages from @ramcar/i18n
│   ├── shared/
│   │   └── components/
│   │       └── language-switcher.tsx  # NEW — language toggle for desktop
│   └── features/auth/
│       ├── pages/
│       │   └── login-page.tsx    # MODIFIED — replace hardcoded strings with useTranslation()
│       └── components/
│           └── login-form.tsx    # MODIFIED — replace hardcoded strings with useTranslation()
├── electron/
│   ├── repositories/
│   │   └── settings-repository.ts  # MODIFIED — add language preference persistence
│   └── preload.ts                # MODIFIED — expose getLanguage/setLanguage via Context Bridge
```

**Structure Decision**: The shared translations live in a new `packages/i18n` package following the existing `@ramcar/` workspace convention. Each app integrates with its own i18n adapter (next-intl for web, i18next for desktop) but all translations come from the shared JSON files in `@ramcar/i18n`. The web app restructures routes under `[locale]/` dynamic segment for URL-based language routing.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.

## Existing Patterns

### Reference: `apps/www` i18n (already implemented)

The landing page already uses `next-intl` v4 with this configuration:
- **Locales**: `es-MX`, `en-US` (full locale codes)
- **Default locale**: `es-MX`
- **Locale prefix**: `as-needed` (no prefix for default, `/en-US` for English)
- **Routing**: `[locale]` dynamic segment in app directory
- **Messages**: JSON files in `src/messages/` per locale

**Design decision for `apps/web`**: Use simplified locale codes (`es`, `en`) per the spec requirement for `/en` URL prefix (not `/en-US`). The shared `@ramcar/i18n` package uses `es`/`en` codes. The `apps/www` landing page can optionally migrate to use the shared package later but is out of scope.
