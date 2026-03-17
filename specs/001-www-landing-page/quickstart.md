# Quickstart: WWW Landing Page

**Feature**: 001-www-landing-page
**Date**: 2026-03-16

## Prerequisites

- Node.js 22 LTS (check with `node -v`)
- pnpm installed (`corepack enable`)
- Repository cloned and on branch `001-www-landing-page`

## Setup

```bash
# Install dependencies (from repo root)
pnpm install

# Start the www app in dev mode
pnpm dev --filter @ramcar/www
```

The landing page will be available at `http://localhost:3001` (or the port configured for www).

## Key Files

| File | Purpose |
|------|---------|
| `apps/www/src/app/[locale]/page.tsx` | Main page assembling all sections |
| `apps/www/src/app/[locale]/layout.tsx` | Root layout with NextIntlClientProvider |
| `apps/www/src/features/landing/components/` | All 9 section components + Navbar + Footer |
| `apps/www/src/i18n/routing.ts` | Locale configuration |
| `apps/www/src/i18n/request.ts` | Server-side message loading |
| `apps/www/src/middleware.ts` | Locale detection and URL rewriting |
| `apps/www/messages/es-MX.json` | Spanish translations |
| `apps/www/messages/en-US.json` | English translations |
| `packages/shared/src/validators/demo-request.ts` | Zod schema for demo form |

## Adding a New Section

1. Create component in `apps/www/src/features/landing/components/NewSection.tsx`
2. Add translation keys to both `messages/es-MX.json` and `messages/en-US.json`
3. Add the section with an `id` attribute in the page assembly (`page.tsx`)
4. Add navbar anchor link if needed

## Adding New UI Components

```bash
cd packages/ui
pnpx shadcn@latest add [component-name]
```

Then re-export from `packages/ui/src/index.ts`.

## Testing Locales

- Spanish (default): `http://localhost:3001/`
- English: `http://localhost:3001/en-US/`
- Language switcher in footer toggles between locales

## Parallax

- Parallax effects are CSS-based (perspective + translateZ)
- Disabled automatically on mobile (<768px) and when `prefers-reduced-motion` is enabled
- Applied to: Hero, Problem, How It Works, Why Choose Us, Social Proof
- Not applied to: Features, Pricing, FAQ, Final CTA
