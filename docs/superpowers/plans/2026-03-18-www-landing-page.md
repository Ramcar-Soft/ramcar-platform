# RamcarSoft Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **IMPORTANT:** Use the `frontend-design` skill when implementing UI components (Tasks 5–15).

**Goal:** Build a fully internationalized, animated marketing landing page at `apps/www` with 9 sections, custom UI primitives, and Framer Motion animations.

**Architecture:** Single-page Next.js 16 App Router site with `[locale]` dynamic segment for i18n via next-intl v4. All components are self-contained within `apps/www/` — no shared UI packages. Framer Motion handles scroll reveals and micro-interactions. Tailwind CSS v4 provides styling with a custom landing-page-only theme.

**Tech Stack:** Next.js 16, TypeScript (strict), Tailwind CSS v4, next-intl v4, Framer Motion, Lucide React, Inter + Geist Mono fonts

**Spec:** `docs/superpowers/specs/2026-03-18-www-landing-page-design.md`

---

## File Map

| File | Responsibility | Task |
|------|---------------|------|
| `apps/www/package.json` | Add next-intl, framer-motion, lucide-react; remove @ramcar/ui, @ramcar/shared | 1 |
| `apps/www/tailwind.config.ts` | Remove shared preset (Tailwind v4 uses CSS-based config via `@theme` in globals.css; JS config kept minimal for content path only) | 1 |
| `apps/www/next.config.ts` | Remove transpilePackages, add next-intl plugin | 1 |
| `apps/www/src/app/globals.css` | Tailwind import + custom CSS vars for landing page theme | 1 |
| `apps/www/src/i18n/routing.ts` | Locale definitions, default locale, routing config | 2 |
| `apps/www/src/i18n/request.ts` | Server-side message loading per locale | 2 |
| `apps/www/src/middleware.ts` | next-intl locale detection + routing middleware | 2 |
| `apps/www/src/messages/en-US.json` | English translation file (all sections) | 3 |
| `apps/www/src/messages/es-MX.json` | Spanish translation file (all sections) | 3 |
| `apps/www/src/app/layout.tsx` | Root layout: html + body, globals.css import | 2 |
| `apps/www/src/app/[locale]/layout.tsx` | Locale layout: IntlProvider, fonts, metadata | 2 |
| `apps/www/src/app/[locale]/page.tsx` | Page: assembles all sections | 4 |
| `apps/www/src/lib/animations.ts` | Shared Framer Motion variants | 4 |
| `apps/www/src/components/ui/Button.tsx` | Custom CTA button (primary/secondary variants) | 5 |
| `apps/www/src/components/ui/AnimatedSection.tsx` | Scroll-reveal wrapper using whileInView | 5 |
| `apps/www/src/components/ui/CountUp.tsx` | Animated number counter | 5 |
| `apps/www/src/components/ui/Accordion.tsx` | Custom expand/collapse with AnimatePresence | 5 |
| `apps/www/src/components/ui/Tabs.tsx` | Custom tab switcher with animated underline | 5 |
| `apps/www/src/components/Navbar.tsx` | Sticky nav, scroll-aware, mobile drawer, lang switcher | 6 |
| `apps/www/src/components/Hero.tsx` | Full-vh hero with gradient mesh, animated headline | 7 |
| `apps/www/src/components/TheProblem.tsx` | Pain point cards with Lucide icons | 8 |
| `apps/www/src/components/HowItWorks.tsx` | 4-step timeline with animated connector | 9 |
| `apps/www/src/components/Features.tsx` | 3-tab role-based feature showcase | 10 |
| `apps/www/src/components/WhyUs.tsx` | 2x3 icon grid with hover effects | 11 |
| `apps/www/src/components/SocialProof.tsx` | Dark section, brand story, stat counters | 12 |
| `apps/www/src/components/Pricing.tsx` | 3-tier pricing cards | 13 |
| `apps/www/src/components/FAQ.tsx` | 7-question accordion | 14 |
| `apps/www/src/components/FinalCTA.tsx` | Demo form + direct contact, validation | 15 |
| `apps/www/src/components/Footer.tsx` | Minimal footer with lang switcher | 16 |

---

## Task 1: Project Setup — Dependencies, Config, Styles

**Files:**
- Modify: `apps/www/package.json`
- Modify: `apps/www/tailwind.config.ts`
- Modify: `apps/www/next.config.ts`
- Modify: `apps/www/src/app/globals.css`

- [ ] **Step 1: Update package.json dependencies**

Remove `@ramcar/shared` and `@ramcar/ui` from dependencies. Add `next-intl`, `framer-motion`, and `lucide-react`:

```json
{
  "dependencies": {
    "framer-motion": "^11",
    "lucide-react": "^0.460",
    "next": "16.1.6",
    "next-intl": "^4",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd apps/www && pnpm install`
Expected: Clean install with no peer dep errors.

- [ ] **Step 3: Update tailwind.config.ts**

Remove shared preset and packages/ui content path. Keep it minimal for Tailwind v4 (theme is defined in globals.css via `@theme`):

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Update next.config.ts**

Remove `transpilePackages`, add next-intl plugin:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 5: Rewrite globals.css**

Replace current content with landing-page theme. No dark mode (marketing page is light-only). Define CSS custom properties for the color palette:

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);

  --color-background: #FAFAF9;
  --color-foreground: #1C1917;

  --color-teal-50: #F0FDFA;
  --color-teal-500: #14B8A6;
  --color-teal-600: #0D9488;
  --color-teal-700: #0F766E;
  --color-teal-800: #0D5D56;

  --color-emerald-400: #34D399;

  --color-amber-300: #FCD34D;
  --color-amber-400: #FBBF24;
  --color-amber-500: #F59E0B;
  --color-amber-600: #D97706;

  --color-stone-50: #FAFAF9;
  --color-stone-200: #E7E5E4;
  --color-stone-400: #A8A29E;
  --color-stone-600: #57534E;
  --color-stone-900: #1C1917;
  --color-stone-950: #0C0A09;
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}

html {
  scroll-behavior: smooth;
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/www/package.json pnpm-lock.yaml apps/www/tailwind.config.ts apps/www/next.config.ts apps/www/src/app/globals.css
git commit -m "chore(www): update deps and config for landing page

Remove @ramcar/ui and @ramcar/shared dependencies.
Add next-intl, framer-motion, lucide-react.
Configure next-intl plugin and self-contained Tailwind theme."
```

---

## Task 2: i18n Setup — Routing, Middleware, Layouts

**Files:**
- Create: `apps/www/src/i18n/routing.ts`
- Create: `apps/www/src/i18n/request.ts`
- Create: `apps/www/src/middleware.ts`
- Modify: `apps/www/src/app/layout.tsx`
- Create: `apps/www/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Create i18n/routing.ts**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es-MX", "en-US"],
  defaultLocale: "es-MX",
});
```

- [ ] **Step 2: Create i18n/request.ts**

```ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "es-MX" | "en-US")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create middleware.ts**

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 4: Rewrite root layout.tsx**

Strip to minimal shell — no fonts, no metadata (those go in locale layout). Just html + body + globals.css:

```tsx
import React from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return children;
}
```

Note: With next-intl + App Router, the root layout should NOT render `<html>` or `<body>` — those go in the `[locale]/layout.tsx` so the `lang` attribute can be set per locale.

- [ ] **Step 5: Create [locale]/layout.tsx**

```tsx
import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, useMessages } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      locale: locale.replace("-", "_"),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "es-MX" | "en-US")) {
    notFound();
  }

  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <html lang={locale} className="scroll-smooth">
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/www/src/i18n/ apps/www/src/middleware.ts apps/www/src/app/layout.tsx apps/www/src/app/\\[locale\\]/layout.tsx
git commit -m "feat(www): add next-intl i18n setup with locale routing

Add routing config (es-MX default, en-US), request config,
middleware, root layout, and locale layout with IntlProvider."
```

---

## Task 3: Translation Files

**Files:**
- Create: `apps/www/src/messages/en-US.json`
- Create: `apps/www/src/messages/es-MX.json`

- [ ] **Step 1: Create en-US.json**

Write complete English translation file with all sections. Structure keys by section namespace. Include every user-facing string for: metadata, nav, hero, problem (5 items), howItWorks (4 steps), features (3 tabs with all items), whyUs (6 items), socialProof (headline, body, 3 stats), pricing (3 tiers with all features), faq (7 Q&As), cta (form labels, placeholders, validation errors, contact), footer.

Key structure:
```json
{
  "metadata": { "title": "...", "description": "..." },
  "nav": { "features": "...", "pricing": "...", "faq": "...", "signIn": "...", "requestDemo": "..." },
  "hero": { "headline": "...", "subheadline": "...", "primaryCta": "...", "secondaryCta": "..." },
  "problem": { "headline": "...", "items": { "1": { "title": "...", "body": "..." }, ... } },
  "howItWorks": { "headline": "...", "steps": { "1": { "title": "...", "body": "..." }, ... } },
  "features": { "headline": "...", "tabs": { "admin": { "label": "...", "items": { "1": "...", ... } }, ... } },
  "whyUs": { "headline": "...", "items": { "1": { "title": "...", "body": "..." }, ... } },
  "socialProof": { "headline": "...", "body": "...", "stats": { "1": { "value": "...", "label": "..." }, ... } },
  "pricing": { "headline": "...", "note": "...", "customPlan": "...", "tiers": { ... } },
  "faq": { "headline": "...", "items": { "1": { "question": "...", "answer": "..." }, ... } },
  "cta": { "headline": "...", "form": { ... }, "contact": { ... } },
  "footer": { "tagline": "...", "links": { ... }, "copyright": "...", "langSwitch": { ... } }
}
```

Use the exact copy from the design spec for English. All content from spec sections 1-9, plus SEO metadata from section 13.

- [ ] **Step 2: Create es-MX.json**

Faithful Spanish translation of all keys. Use Mexican Spanish conventions. Key structure identical to en-US.json.

- [ ] **Step 3: Verify JSON is valid**

Run: `cd apps/www && node -e "require('./src/messages/en-US.json'); require('./src/messages/es-MX.json'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/messages/
git commit -m "feat(www): add translation files for es-MX and en-US

Complete translation files for all 9 landing page sections
plus metadata, nav, and footer."
```

---

## Task 4: Animation Library, Page Shell, and Scaffold

**Files:**
- Create: `apps/www/src/lib/animations.ts`
- Create: `apps/www/src/app/[locale]/page.tsx`
- Delete: `apps/www/src/app/page.tsx` (old root page)

- [ ] **Step 1: Create lib/animations.ts**

Shared Framer Motion variants. Include reduced-motion check:

```ts
import type { Variants } from "framer-motion";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5 },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

export const scaleOnHover = {
  whileHover: { scale: 1.02 },
  transition: { type: "spring", stiffness: 300, damping: 20 },
};

export const heroWordStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

export const heroWord: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};
```

- [ ] **Step 2: Delete old root page.tsx**

Run: `rm apps/www/src/app/page.tsx`

- [ ] **Step 3: Create [locale]/page.tsx scaffold**

Placeholder page that imports all section components (stubs for now). This file will be updated as each section is built:

```tsx
import React from "react";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("hero");

  return (
    <main>
      {/* Sections will be added as they are built — each is a "use client" component with its own useTranslations */}
      <section id="hero" className="min-h-screen flex items-center justify-center bg-teal-700">
        <h1 className="text-4xl font-bold text-white">{t("headline")}</h1>
      </section>
    </main>
  );
}
```

Note: `page.tsx` is a Server Component. Each section component handles its own translations via `useTranslations` as a client component. Once section components are built, the page will simply render them without needing translations itself.

- [ ] **Step 4: Verify the app builds and runs**

Run: `cd apps/www && pnpm build`
Expected: Build succeeds. If there are type errors, fix them before proceeding.

- [ ] **Step 5: Commit**

```bash
git add apps/www/src/lib/animations.ts apps/www/src/app/\\[locale\\]/page.tsx
git rm apps/www/src/app/page.tsx
git commit -m "feat(www): add animation variants and page scaffold

Add shared Framer Motion variants (fadeUp, fadeIn, stagger, heroWord).
Create locale-aware page scaffold. Remove old root page."
```

---

## Task 5: UI Primitives — Button, AnimatedSection, CountUp, Accordion, Tabs

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/ui/Button.tsx`
- Create: `apps/www/src/components/ui/AnimatedSection.tsx`
- Create: `apps/www/src/components/ui/CountUp.tsx`
- Create: `apps/www/src/components/ui/Accordion.tsx`
- Create: `apps/www/src/components/ui/Tabs.tsx`

- [ ] **Step 1: Create Button.tsx**

Two variants: `primary` (amber gradient CTA) and `secondary` (teal outline). Uses Framer Motion for hover spring animation. Props: `variant`, `children`, `className`, `href` (optional — renders `<a>` if provided), standard button HTML props.

Primary: `bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-semibold` with hover darkening to amber-600.
Secondary: `border-2 border-teal-700 text-teal-700` with hover bg teal-50.

Both: `rounded-lg px-6 py-3` base, spring scale on hover.

- [ ] **Step 2: Create AnimatedSection.tsx**

Wraps children with `motion.div` using `whileInView` fade-up reveal. Props: `children`, `className`, `delay` (optional, default 0), `direction` (optional: "up" | "left" | "right", default "up"). Uses `once: true`, viewport threshold `0.2`. Respects `prefers-reduced-motion` via Framer Motion's built-in support.

- [ ] **Step 3: Create CountUp.tsx**

Animates a number from 0 to `target` value using Framer Motion's `useMotionValue`, `useTransform`, and `useInView`. Props: `target: number`, `suffix?: string`, `duration?: number` (default 2). Displays formatted number using `Intl.NumberFormat`. Uses Geist Mono font class.

- [ ] **Step 4: Create Accordion.tsx**

Single-open accordion. Uses `AnimatePresence` for smooth height transitions. Props: `items: Array<{ id: string; trigger: string; content: string }>`. Renders `button` triggers with chevron icon (rotates on expand). WAI-ARIA: `role="region"`, `aria-expanded`, `aria-controls`, `aria-labelledby`. Keyboard: Enter/Space toggle, Up/Down arrow keys to move focus between accordion triggers.

- [ ] **Step 5: Create Tabs.tsx**

Controlled tab component. Props: `tabs: Array<{ id: string; label: string; content: React.ReactNode }>`. Uses Framer Motion `layoutId` for sliding underline indicator. Content cross-fades via `AnimatePresence`. WAI-ARIA: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`.

- [ ] **Step 6: Verify all primitives render**

Create a temporary test page or verify via `pnpm build` that all components compile without errors.

Run: `cd apps/www && pnpm build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/www/src/components/ui/
git commit -m "feat(www): add custom UI primitives

Button (primary/secondary), AnimatedSection (scroll reveal),
CountUp (animated numbers), Accordion (single-open), Tabs (animated underline)."
```

---

## Task 6: Navbar

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/Navbar.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx` (add Navbar import)

- [ ] **Step 1: Build Navbar component**

`"use client"` component. Specs:
- Sticky top, `z-50`, `fixed w-full`
- Uses `useEffect` + scroll listener: transparent + white text when `scrollY < 50`, solid white bg + dark text + `shadow-sm` + `backdrop-blur-lg` after
- **Left:** "RamcarSoft" text logo (bold, text-xl)
- **Center (desktop, `hidden lg:flex`):** Anchor links — Features `#features`, Pricing `#pricing`, FAQ `#faq` — use `useTranslations("nav")` for labels. Hover: teal underline slides in from left (CSS transition)
- **Right (desktop):** Language toggle (`ES | EN` — use `usePathname` + `useRouter` from next-intl, wrap in `aria-live="polite"` region for screen reader announcement), "Sign in" link → `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ramcarsoft.com"}/login`, amber Button → scrolls to `#cta`
- **Mobile (`lg:hidden`):** Hamburger icon (Menu from lucide-react). Opens drawer from right with Framer Motion (`motion.div` slide + fade). Backdrop overlay (`stone-950/50`). Close via X icon, click outside (backdrop click), Escape key. Same links as desktop, stacked vertically.

- [ ] **Step 2: Add Navbar to page.tsx**

Update `apps/www/src/app/[locale]/page.tsx` to import and render `<Navbar />` above `<main>`.

- [ ] **Step 3: Verify**

Run: `cd apps/www && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/Navbar.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add sticky Navbar with mobile drawer and lang switcher"
```

---

## Task 7: Hero Section

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/Hero.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx` (add Hero import)

- [ ] **Step 1: Build Hero component**

`"use client"` component. Specs:
- `min-h-screen` with flex center, `relative overflow-hidden`
- **Background:** Gradient `from-teal-600 via-teal-500 to-emerald-400` (per spec). Faint geometric grid overlay via CSS `background-image` with repeating linear gradient at ~5% opacity. 2-3 floating blurred circles (absolute positioned divs, `w-72 h-72 rounded-full bg-teal-400/20 blur-3xl`) with slow CSS `@keyframes` drift animation (translate X/Y over 20s, infinite, alternate)
- **Content (centered, max-w-4xl, text-white):**
  - Headline: `text-3xl md:text-5xl lg:text-6xl font-bold leading-tight`. Animated word-by-word using `heroWordStagger` + `heroWord` variants from `lib/animations.ts`. Split headline by spaces, wrap each word in `motion.span`.
  - Subheadline: `text-lg md:text-xl text-white/80 mt-6`. Fades in after headline (delay 0.5s).
  - CTA row: `flex gap-4 mt-8 justify-center`. Primary Button → `#cta`, Secondary Button (white outline variant) → `#how-it-works`.
- All text from `useTranslations("hero")`

- [ ] **Step 2: Add Hero to page.tsx**

Replace the placeholder hero section with `<Hero />` component.

- [ ] **Step 3: Verify**

Run: `cd apps/www && pnpm build`

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/Hero.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add Hero section with animated headline and gradient mesh"
```

---

## Task 8: The Problem Section

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/TheProblem.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build TheProblem component**

`"use client"` component. Specs:
- `id="problem"`, `bg-stone-50`, `py-20 md:py-28`
- Headline: "Sound familiar?" with decorative teal `after` pseudo-element underline (CSS `after:content-[''] after:block after:w-16 after:h-1 after:bg-teal-500 after:mt-3 after:mx-auto`)
- 5 pain point cards in `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. Last row (2 items) centered via `justify-items-center` on the grid or wrapper flex.
- Each card: `bg-white rounded-xl border border-stone-200 p-6`. Lucide icon (teal-500, 24px) at top. Bold title (`font-semibold text-stone-900`). Body (`text-stone-600 text-sm mt-2`).
- Icons (one per card): `UserX`, `MessageSquare`, `FileX`, `NotebookPen`, `EyeOff` from lucide-react
- Wrapped in `AnimatedSection`. Cards use `staggerContainer` + `fadeUp` for stagger reveal.
- All text from `useTranslations("problem")`

- [ ] **Step 2: Add to page.tsx**

- [ ] **Step 3: Verify build**

Run: `cd apps/www && pnpm build`

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/TheProblem.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add The Problem section with pain point cards"
```

---

## Task 9: How It Works Section

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/HowItWorks.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build HowItWorks component**

`"use client"` component. Specs:
- `id="how-it-works"`, `bg-white`, `py-20 md:py-28`
- Headline: "How RamcarSoft works" centered
- 4 steps: horizontal on desktop (`flex items-start justify-between`), vertical on mobile (`flex flex-col`)
- Each step: numbered circle (`w-12 h-12 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center`) → title (font-semibold, mt-3) → description (text-stone-600, text-sm, mt-1)
- Connector: Between circles, a horizontal line (`h-0.5 bg-stone-200 flex-1`) on desktop. On mobile: vertical line (`w-0.5 bg-stone-200 h-8`) between steps.
- Animation: steps stagger in left-to-right using `staggerContainer` + `fadeUp`
- Icons per step: `ClipboardList`, `ShieldCheck`, `Database`, `Bell` from lucide-react (placed inside the numbered circle or beside it)
- All text from `useTranslations("howItWorks")`

- [ ] **Step 2: Add to page.tsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/HowItWorks.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add How It Works section with step timeline"
```

---

## Task 10: Features Section (Tabbed)

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/Features.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build Features component**

`"use client"` component. Specs:
- `id="features"`, `bg-stone-50`, `py-20 md:py-28`
- Uses custom `Tabs` component from `ui/Tabs.tsx`
- 3 tabs: Admin (6 items), Guard (5 items), Resident (5 items)
- Tab content: each item is a row with teal `Check` icon (lucide) + text
- Content area: `bg-white rounded-xl shadow-sm p-6 md:p-8`
- Build tab data array from translations: `useTranslations("features")`, iterate over `tabs.admin.items`, `tabs.guard.items`, `tabs.resident.items`
- Wrapped in `AnimatedSection`
- All text from `useTranslations("features")`

- [ ] **Step 2: Add to page.tsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/Features.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add Features section with role-based tabs"
```

---

## Task 11: Why Choose Us Section

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/WhyUs.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build WhyUs component**

`"use client"` component. Specs:
- `id="why-us"`, `bg-white`, `py-20 md:py-28`
- 2x3 grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`
- Each item: icon container (`w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center`, Lucide icon in teal-600), title (font-semibold, mt-4), description (text-stone-600, text-sm, mt-2)
- Icons: `WifiOff`, `Smartphone`, `FileSearch`, `Ban`, `CalendarDays`, `MapPin` from lucide-react
- Hover: card has `transition-all duration-300 hover:-translate-y-1 hover:shadow-md`
- Stagger reveal via `staggerContainer` + `fadeUp`
- All text from `useTranslations("whyUs")`

- [ ] **Step 2: Add to page.tsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/WhyUs.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add Why Choose Us section with icon grid"
```

---

## Task 12: Social Proof Section

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/SocialProof.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build SocialProof component**

`"use client"` component. Specs:
- `id="social-proof"`, dark section: `bg-stone-950 relative overflow-hidden`, `py-20 md:py-28`
- Faint radial teal gradient: absolute `div` with `bg-radial-gradient from-teal-500/5 to-transparent` centered
- Headline: white, `text-2xl md:text-4xl font-bold`
- Body paragraph: `text-stone-400 max-w-2xl mx-auto mt-4`
- 3 stat cards: `flex gap-8 md:gap-16 justify-center mt-12`
- Each stat: `CountUp` component (teal-400, font-mono, `text-4xl md:text-5xl font-bold`) + label (`text-stone-400 text-sm mt-2`)
- Placeholder values: 50 (communities), 5000 (residents), 500000 (access events)
- All text from `useTranslations("socialProof")`

- [ ] **Step 2: Add to page.tsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/SocialProof.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add Social Proof section with stat counters"
```

---

## Task 13: Pricing Section

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/Pricing.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build Pricing component**

`"use client"` component. Specs:
- `id="pricing"`, `bg-stone-50`, `py-20 md:py-28`
- 3 cards: `grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start`
- Each card: `bg-white rounded-2xl shadow-lg p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`
- **Estándar (center card):** `scale-[1.02] md:scale-105 border-t-4 border-teal-500 relative`. Amber badge: `absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-stone-950 text-xs font-semibold px-3 py-1 rounded-full`
- Tier name: `text-xl font-bold`
- Price: `text-3xl font-bold mt-2` + `text-stone-400 text-sm` for "/mo"
- Feature list: items with `Check` (teal-500) or `Minus` (stone-300) icons
- CTA: Básico + Premium use secondary Button; Estándar uses primary Button
- Below grid: note text (14-day trial) + "Custom plan" link → `#cta`
- Stagger reveal
- All text from `useTranslations("pricing")`

- [ ] **Step 2: Add to page.tsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/Pricing.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add Pricing section with 3 tier cards"
```

---

## Task 14: FAQ Section

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/FAQ.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build FAQ component**

`"use client"` component. Specs:
- `id="faq"`, `bg-white`, `py-20 md:py-28`
- Uses custom `Accordion` component from `ui/Accordion.tsx`
- 7 questions from translations: `useTranslations("faq")`
- Build items array by mapping over faq.items.1 through faq.items.7
- Max width container: `max-w-3xl mx-auto`
- Wrapped in `AnimatedSection`

- [ ] **Step 2: Add to page.tsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/FAQ.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add FAQ section with accordion"
```

---

## Task 15: Final CTA Section

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/FinalCTA.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build FinalCTA component**

`"use client"` component. Specs:
- `id="cta"`, dark section: `bg-stone-950`, `py-20 md:py-28`
- Split layout: `grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16`
- **Left — form:** Headline (white, bold). 4 fields: Name, Email, Community name (text inputs), Number of residents (select dropdown: <50, 50-150, 150-500, 500+). Custom styled: `bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-teal-500`. Labels above each field (text-stone-300, text-sm, mb-1). Amber gradient submit button (full width). Note below: `text-stone-400 text-sm mt-3`.
- **Validation:** Use React state. On submit, check all fields non-empty and email matches basic pattern. Show `border-red-500` + translated error message below invalid fields. No submission until valid. On valid submit: `console.log({ name, email, community, residents })`.
- **Right — contact:** "Prefer to talk?" in white + email link (teal-400, underline hover). Decorative blurred teal circle (absolute, `w-48 h-48 bg-teal-500/10 blur-3xl rounded-full`).
- Animated: form fades up from left (`x: -20`), contact fades up from right (`x: 20`)
- All text from `useTranslations("cta")`

- [ ] **Step 2: Add to page.tsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/FinalCTA.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add Final CTA section with demo form and validation"
```

---

## Task 16: Footer

> **Use `frontend-design` skill for implementation.**

**Files:**
- Create: `apps/www/src/components/Footer.tsx`
- Modify: `apps/www/src/app/[locale]/page.tsx`

- [ ] **Step 1: Build Footer component**

`"use client"` component (needs language switcher). Specs:
- `bg-stone-900`, `py-12`
- Layout: `flex flex-col md:flex-row justify-between items-center gap-6`
- **Left:** "RamcarSoft" (font-bold, text-white) + tagline (text-stone-400, text-sm)
- **Center:** Links row — Privacy Policy, Terms of Service, Contact (text-stone-400, hover:text-white, text-sm)
- **Right:** Language switcher — `ES | EN` compact toggle using `usePathname` and `Link` from next-intl, wrapped in `aria-live="polite"` for screen reader announcement
- **Bottom:** Copyright line centered, `text-stone-500 text-xs mt-8 pt-8 border-t border-stone-800`
- All text from `useTranslations("footer")`

- [ ] **Step 2: Add Footer to page.tsx (after all sections, outside main)**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/components/Footer.tsx apps/www/src/app/\\[locale\\]/page.tsx
git commit -m "feat(www): add Footer with language switcher"
```

---

## Task 17: Final Integration, Cleanup & Verification

**Files:**
- Modify: `apps/www/src/app/[locale]/page.tsx` (final assembly)
- Delete: `apps/www/src/features/` (empty scaffold dir, no longer needed)
- Delete: `apps/www/src/shared/` (empty scaffold dir, no longer needed)

- [ ] **Step 1: Verify page.tsx has all sections in correct order**

Final page.tsx should import and render in order:
1. `<Navbar />`
2. `<Hero />`
3. `<TheProblem />`
4. `<HowItWorks />`
5. `<Features />`
6. `<WhyUs />`
7. `<SocialProof />`
8. `<Pricing />`
9. `<FAQ />`
10. `<FinalCTA />`
11. `<Footer />`

- [ ] **Step 2: Remove empty scaffold directories**

Run: `rm -rf apps/www/src/features apps/www/src/shared`

- [ ] **Step 3: Run full build**

Run: `cd apps/www && pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Run typecheck**

Run: `cd apps/www && pnpm typecheck`
Expected: No type errors.

- [ ] **Step 5: Run lint**

Run: `cd apps/www && pnpm lint`
Expected: No lint errors (or only warnings).

- [ ] **Step 6: Manual smoke test**

Run: `cd apps/www && pnpm dev`
Verify:
- Page loads at `http://localhost:3000` (es-MX)
- Page loads at `http://localhost:3000/en` (en-US)
- All 9 sections render
- Navbar scroll effect works
- Language switcher toggles between ES/EN
- Smooth scroll anchors work
- Mobile hamburger menu works (resize browser)
- FAQ accordion opens/closes
- Features tabs switch
- Social proof numbers count up on scroll
- CTA form validates
- No console errors

- [ ] **Step 7: Final commit**

```bash
git add -A apps/www/
git commit -m "feat(www): complete landing page integration and cleanup

All 9 sections assembled, empty scaffold dirs removed,
build/typecheck/lint passing."
```
