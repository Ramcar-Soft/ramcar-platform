# Research: WWW Landing Page

**Feature**: 001-www-landing-page
**Date**: 2026-03-16

## R-001: next-intl Setup with Next.js 16 + App Router

**Decision**: Use `next-intl` v4+ with the App Router integration pattern (middleware-based routing).

**Rationale**: next-intl is the most mature i18n library for Next.js App Router. It provides:
- Middleware-based locale detection and routing
- Server Component support (messages loaded server-side, no client bundle bloat)
- `useTranslations()` hook for client components
- Built-in locale prefix strategy (prefix non-default locales only)

**Configuration approach**:
- `i18n/routing.ts` — defines locales and default locale
- `i18n/request.ts` — server-side message loading
- `middleware.ts` — locale detection and URL rewriting
- `app/[locale]/layout.tsx` — NextIntlClientProvider wrapping
- `app/[locale]/page.tsx` — locale-aware page

**Alternatives considered**:
- `next-i18next`: Only supports Pages Router, not compatible
- Manual implementation: Too much boilerplate for locale routing, message loading, and SSR
- `react-intl`: No built-in Next.js App Router integration

## R-002: Parallax Scrolling Implementation

**Decision**: Use CSS-only parallax with `transform: translateZ()` and `perspective` for narrative sections, with a lightweight JS intersection observer fallback for browsers without 3D transform support.

**Rationale**: CSS-based parallax is the most performant approach — composited by the GPU with no JavaScript execution on scroll. This avoids jank and scroll-hijacking issues common with JS-based parallax libraries.

**Implementation pattern**:
- Parent container: `perspective: 1px; overflow-y: auto; height: 100vh`
- Parallax layers: `transform: translateZ(-Npx) scale(N+1)` for background elements
- Foreground content: `transform: translateZ(0)` (normal speed)
- Media query `@media (prefers-reduced-motion: reduce)`: disable all transforms
- Media query `@media (max-width: 767px)`: disable parallax, standard scroll

**Alternatives considered**:
- `framer-motion` scroll animations: Heavier bundle, JS-driven, risks jank on lower-end devices
- `react-scroll-parallax`: Additional dependency, JS-based scroll listeners
- GSAP ScrollTrigger: Overkill for layered parallax, large bundle size
- Pure `background-attachment: fixed`: Limited, not supported on mobile Safari, can't do multi-layer

## R-003: Missing shadcn/ui Components

**Decision**: Add Accordion, Tabs, Select, and Label components to `packages/ui` via `pnpx shadcn@latest add`.

**Rationale**: The spec requires accordion (FAQ), tabs (Features by Role), select (form dropdown), and label (form fields). These must live in `packages/ui` per constitution principle III (no duplication).

**Components to add**:
- `accordion` — Radix Accordion primitive for FAQ section
- `tabs` — Radix Tabs primitive for Features by Role section
- `select` — Radix Select primitive for resident count dropdown
- `label` — Form label component for accessibility

**Alternatives considered**:
- Build custom components: Would duplicate Radix primitives already used by shadcn/ui
- Install Radix directly in apps/www: Violates import boundary rules

## R-004: Color Palette Integration with Tailwind v4

**Decision**: Define the RamcarSoftlanding page color palette as CSS custom properties in `apps/www/src/app/globals.css` and reference them in Tailwind classes using `var()`.

**Rationale**: Tailwind v4 uses CSS-first configuration. The color palette (ash-grey, tea-green, emerald, muted-teal, dusty-olive) is specific to the landing page, not the shared design system. Defining as CSS variables in the app's globals.css keeps it scoped while being usable via Tailwind's arbitrary value syntax or `@theme` directive.

**Implementation**:
```css
@theme {
  --color-ash-grey: #bac7be;
  --color-tea-green: #c2e1c2;
  --color-emerald: #7dcd85;
  --color-muted-teal: #80ab82;
  --color-dusty-olive: #778472;
}
```

**Alternatives considered**:
- Add to shared tailwind preset: These colors are www-specific, not shared across apps
- Inline hex values: Not maintainable, violates DRY

## R-005: Form Validation Approach

**Decision**: Use Zod schema from `@ramcar/shared` for demo request form validation, with client-side validation via native HTML5 + Zod `safeParse`.

**Rationale**: Constitution principle V mandates Zod for all external input validation. The demo request form schema should be defined in `@ramcar/shared` so it can be reused when the backend integration is added later.

**Schema location**: `packages/shared/src/validators/demo-request.ts`

**Alternatives considered**:
- HTML5 only validation: Insufficient for future backend reuse
- React Hook Form + Zod: Over-engineering for a 4-field form with no backend

## R-006: File Structure for i18n + Sections

**Decision**: Use `app/[locale]/` dynamic route with section components under `src/features/landing/` following the feature-based architecture.

**Rationale**: Constitution principle II requires domain logic in `src/features/[domain]/`. The landing page is a single feature domain. Section components live as sub-components of the landing feature.

**Structure**:
```
apps/www/src/
├── app/
│   └── [locale]/
│       ├── layout.tsx      # NextIntlClientProvider + fonts
│       └── page.tsx         # Assembles all sections
├── features/
│   └── landing/
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── Hero.tsx
│       │   ├── TheProblem.tsx
│       │   ├── HowItWorks.tsx
│       │   ├── Features.tsx
│       │   ├── WhyUs.tsx
│       │   ├── SocialProof.tsx
│       │   ├── Pricing.tsx
│       │   ├── FAQ.tsx
│       │   ├── FinalCTA.tsx
│       │   └── Footer.tsx
│       └── index.ts         # Re-exports
├── i18n/
│   ├── routing.ts
│   └── request.ts
├── messages/
│   ├── es-MX.json
│   └── en-US.json
└── middleware.ts
```

**Alternatives considered**:
- `components/sections/` flat structure (from original prompt): Violates feature-based architecture principle
- Each section as its own feature: Over-segmentation for a single-page layout
