# Implementation Plan: WWW Landing Page

**Branch**: `001-www-landing-page` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-www-landing-page/spec.md`

## Summary

Build the public marketing landing page for RamcarSoftat `apps/www` — a single-page layout with 9 sections, bilingual i18n (es-MX default + en-US), parallax layered scrolling on narrative sections, and a lead capture form. Uses next-intl for internationalization, CSS-based parallax for performance, and existing shadcn/ui components from `packages/ui` (with 4 new components added).

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 22 LTS
**Primary Dependencies**: Next.js 16 (App Router), React 19, next-intl v4+, Tailwind CSS v4, shadcn/ui (Radix + CVA)
**Storage**: N/A (static page, form submission is a console.log stub)
**Testing**: Visual verification, manual locale switching, responsive viewport testing
**Target Platform**: Web browsers (desktop + mobile), SSR via Next.js
**Project Type**: Marketing landing page (static site within monorepo)
**Performance Goals**: Page load < 3 seconds, smooth 60fps parallax scrolling on desktop
**Constraints**: No JS-based scroll libraries (CSS-only parallax), no hardcoded strings, mobile-first responsive
**Scale/Scope**: 9 sections, 2 locales, ~11 components, ~2 translation files (~300 keys each)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | N/A | Public landing page, no auth or tenant context |
| II. Feature-Based Architecture | PASS | Sections live in `src/features/landing/components/`, routing in `src/app/` |
| III. Strict Import Boundaries | PASS | www imports from `@ramcar/ui` and `@ramcar/shared` only. No cross-feature imports |
| IV. Offline-First Desktop | N/A | Not a desktop app feature |
| V. Shared Validation via Zod | PASS | DemoRequestLead schema in `@ramcar/shared/src/validators/demo-request.ts` |
| VI. Role-Based Access Control | N/A | No auth on landing page |
| VII. TypeScript Strict Mode | PASS | Extends `@ramcar/config/tsconfig.react.json` with strict: true |

**Post-Phase 1 re-check**: All applicable gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-www-landing-page/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
apps/www/
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       ├── layout.tsx          # Root layout: NextIntlClientProvider, fonts, metadata
│   │       └── page.tsx            # Page assembly: imports and renders all sections
│   ├── features/
│   │   └── landing/
│   │       ├── components/
│   │       │   ├── Navbar.tsx      # Sticky navbar with anchors + mobile hamburger (client)
│   │       │   ├── Hero.tsx        # Hero with parallax background layers (server)
│   │       │   ├── TheProblem.tsx  # 5 pain points with icons, parallax (server)
│   │       │   ├── HowItWorks.tsx  # 4 steps horizontal/vertical, parallax (server)
│   │       │   ├── Features.tsx    # 3-tab role features (client — tabs interaction)
│   │       │   ├── WhyUs.tsx       # 6 differentiators grid, parallax (server)
│   │       │   ├── SocialProof.tsx # Brand story + stat placeholders, parallax (server)
│   │       │   ├── Pricing.tsx     # 3 tier cards (server)
│   │       │   ├── FAQ.tsx         # 7-item accordion (client — accordion interaction)
│   │       │   ├── FinalCTA.tsx    # Demo form + contact (client — form interaction)
│   │       │   └── Footer.tsx      # Footer with language switcher (client — locale switch)
│   │       └── index.ts            # Re-exports all section components
│   ├── i18n/
│   │   ├── routing.ts              # Locale config: locales, defaultLocale, localePrefix
│   │   └── request.ts              # getRequestConfig — loads messages for current locale
│   └── middleware.ts               # next-intl middleware for locale routing
├── messages/
│   ├── es-MX.json                  # Spanish translations (~300 keys)
│   └── en-US.json                  # English translations (~300 keys)
└── globals.css                     # Landing page color palette via @theme

packages/ui/src/
├── components/ui/
│   ├── accordion.tsx               # NEW — Radix Accordion for FAQ
│   ├── tabs.tsx                    # NEW — Radix Tabs for Features
│   ├── select.tsx                  # NEW — Radix Select for form dropdown
│   └── label.tsx                   # NEW — Form label component
└── index.ts                        # Updated — re-export new components

packages/shared/src/
└── validators/
    └── demo-request.ts             # NEW — Zod schema for demo request form
```

**Structure Decision**: Feature-based architecture per constitution principle II. All landing page components live under `src/features/landing/`. The `app/[locale]/` route handles locale-based routing via next-intl. New shared UI components are added to `packages/ui` and the form validation schema to `packages/shared`.

## Complexity Tracking

No constitution violations — no entries needed.
