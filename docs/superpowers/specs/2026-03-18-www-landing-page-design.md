# RamcarSoft Landing Page — Design Spec

**Date:** 2026-03-18
**Target:** `apps/www/`
**Framework:** Next.js 16 (App Router)
**i18n:** next-intl v4 — `es-MX` (default), `en-US`

---

## 1. Overview

Single-page marketing landing page for RamcarSoft, a multi-tenant residential security platform targeting Mexican *fraccionamientos*. Primary audience: property managers and HOA administrators.

The landing page is fully self-contained — it does not use `@ramcar/ui` components or the shared Tailwind preset. All components, styles, and primitives live within `apps/www/`.

**Deviation from CLAUDE.md conventions:** CLAUDE.md prescribes a feature-based `src/features/[domain]/` layout for `apps/www`. Since this is a single-page marketing site with no domain logic, no auth, and no data fetching, the feature-based pattern adds unnecessary nesting. Instead, components live flat under `src/components/`. This is an intentional simplification for a static marketing page.

---

## 2. Tech Stack & Dependencies

- **Next.js 16** (App Router, already installed)
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (already installed)
- **next-intl v4** (to be added to `apps/www/package.json`)
- **Framer Motion** (to be added — ~30KB gzipped, tree-shakeable)
- **Lucide React** (to be added directly to `apps/www/package.json`)
- **Inter font** (via `next/font/google` — replaces current Geist Sans)
- **Geist Mono** (kept from current setup — for stats/numbers)

### Dependencies to Add
- `next-intl` — i18n framework
- `framer-motion` — animations
- `lucide-react` — icons

### Dependencies to Remove
- `@ramcar/ui` (workspace:\*) — not used, landing page has its own components
- `@ramcar/shared` (workspace:\*) — not used

### Config Changes Required
- **`tailwind.config.ts`** — Remove `@ramcar/config/tailwind` shared preset import and `packages/ui` content path. Define landing-page-only theme.
- **`next.config.ts`** — Remove `transpilePackages` for `@ramcar/ui` and `@ramcar/shared`. Add `next-intl` plugin via `createNextIntlPlugin`.
- **`package.json`** — Update dependencies as listed above.

---

## 3. Color Palette — "Warm Corporate Security"

### Primary — Deep Teal
| Token | Hex | Usage |
|-------|-----|-------|
| `teal-700` | `#0F766E` | Primary brand, text accents |
| `teal-500` | `#14B8A6` | Hover states, icons, light accents |
| `teal-800` | `#0D5D56` | Dark emphasis, headings on light bg |
| `teal-50` | `#F0FDFA` | Icon containers, subtle backgrounds |

### Secondary — Warm Amber
| Token | Hex | Usage |
|-------|-----|-------|
| `amber-500` | `#F59E0B` | CTA buttons, highlights |
| `amber-300` | `#FCD34D` | Badges, soft highlights |
| `amber-600` | `#D97706` | Button hover states |

### Neutrals — Warm Stone
| Token | Hex | Usage |
|-------|-----|-------|
| `stone-50` | `#FAFAF9` | Page background (warm white) |
| `white` | `#FFFFFF` | Cards, elevated surfaces |
| `stone-950` | `#0C0A09` | Dark sections (Social Proof, CTA) |
| `stone-900` | `#1C1917` | Footer |
| `stone-600` | `#57534E` | Secondary text |
| `stone-400` | `#A8A29E` | Muted text |
| `stone-200` | `#E7E5E4` | Borders |

### Gradients
- **Hero mesh:** `from-teal-600 via-teal-500 to-emerald-400` (radial)
- **CTA buttons:** `from-amber-400 to-amber-500`
- **Dark sections:** `from-stone-950 to-stone-900`
- **Dark section accent:** Faint radial teal glow at 5% opacity

---

## 4. Typography

| Element | Font | Weight | Size (mobile → desktop) |
|---------|------|--------|------------------------|
| Hero headline | Inter | 700 | `text-3xl → text-6xl` |
| Section headline | Inter | 700 | `text-2xl → text-4xl` |
| Subheadline | Inter | 500 | `text-lg → text-xl` |
| Body | Inter | 400 | `text-base` (16px) |
| Small/labels | Inter | 500 | `text-sm` (14px) |
| Stats/numbers | Geist Mono | 700 | `text-4xl → text-5xl` |

---

## 5. File Structure

```
apps/www/src/
├── app/
│   ├── layout.tsx            # Root layout (minimal: html + body tags, globals.css import)
│   ├── globals.css           # Tailwind + custom landing page theme
│   └── [locale]/
│       ├── layout.tsx        # Locale layout: IntlProvider, fonts, metadata
│       └── page.tsx          # Assembles all sections
├── components/
│   ├── Navbar.tsx            # Sticky nav, scroll-aware, language switcher
│   ├── Hero.tsx              # Full-vh, gradient mesh, animated headline
│   ├── TheProblem.tsx        # Pain point cards with icons
│   ├── HowItWorks.tsx        # Step timeline with connector line
│   ├── Features.tsx          # 3-tab component (Admin/Guard/Resident)
│   ├── WhyUs.tsx             # 2x3 icon grid
│   ├── SocialProof.tsx       # Dark section, stats counter, brand story
│   ├── Pricing.tsx           # 3 tier cards
│   ├── FAQ.tsx               # Custom accordion
│   ├── FinalCTA.tsx          # Dark section, form + direct contact
│   ├── Footer.tsx            # Minimal footer
│   └── ui/                   # Landing-page-specific primitives
│       ├── Accordion.tsx     # Custom expand/collapse
│       ├── Tabs.tsx          # Custom tab switcher
│       ├── Button.tsx        # Custom CTA button
│       ├── AnimatedSection.tsx  # Reusable scroll-reveal wrapper
│       └── CountUp.tsx       # Animated number counter
├── lib/
│   └── animations.ts         # Shared Framer Motion variants
├── i18n/
│   ├── request.ts            # next-intl server config
│   └── routing.ts            # Locale routing config
├── messages/
│   ├── es-MX.json
│   └── en-US.json
└── middleware.ts              # next-intl locale detection + routing
```

---

## 6. i18n Architecture

### Routing
- `es-MX` at root `/` (default, no prefix)
- `en-US` at `/en/...`
- Middleware detects locale from URL path, falls back to `es-MX`

### Configuration
- `i18n/routing.ts` — defines `locales`, `defaultLocale`, `pathnames`
- `i18n/request.ts` — loads correct `messages/{locale}.json` per request
- `middleware.ts` — uses `createMiddleware` from `next-intl/middleware`

### Translation Keys
Fully nested by section:
```
nav.*, hero.*, problem.*, howItWorks.*, features.*, whyUs.*,
socialProof.*, pricing.*, faq.*, cta.*, footer.*
```

All user-facing strings come from translation files. Zero hardcoded strings.

---

## 7. Animation Strategy (Framer Motion)

### Principles
- Only animate `transform` and `opacity` (GPU-composited)
- Respect `prefers-reduced-motion` — disable all animations when set
- `once: true` for scroll reveals — don't re-trigger

### Shared Variants (`lib/animations.ts`)

**fadeUp:** `opacity: 0, y: 20` → `opacity: 1, y: 0` (0.6s ease-out)
**fadeIn:** `opacity: 0` → `opacity: 1` (0.5s)
**staggerContainer:** `staggerChildren: 0.1`
**scaleOnHover:** `whileHover: { scale: 1.02 }` with spring

### Per-Section Animations

| Section | Animation |
|---------|-----------|
| Navbar | Transparent → solid white on scroll (50px threshold), backdrop-blur |
| Hero | Headline words stagger in (0.08s), CTAs spring up after |
| The Problem | Cards stagger fade-up on scroll |
| How It Works | Steps stagger left-to-right, connector line draws in |
| Features | Tab content cross-fades, underline indicator slides |
| Why Us | Grid items stagger fade-up |
| Social Proof | Stats count up from 0 on viewport entry |
| Pricing | Cards stagger fade-up, hover lift |
| FAQ | Accordion smooth height transition via AnimatePresence |
| Final CTA | Form fades up from left, contact fades up from right |

---

## 8. Component Specifications

### Navbar
- Sticky top, `z-50`
- Transparent + white text over hero → solid white + dark text after 50px scroll
- Transition: 300ms background-color + shadow
- **Left:** "RamcarSoft" text logo
- **Center (desktop):** Anchor links — Features `#features`, Pricing `#pricing`, FAQ `#faq`
- **Right:** Language toggle (`ES | EN`), "Sign in" link → `app.ramcarsoft.com/login`, "Request demo" amber button → scrolls to `#cta`
- **Mobile (below `lg`):** Hamburger icon → drawer slides in from right with backdrop overlay (stone-950/50 opacity). Close via X button, click outside, or Escape key. Drawer animates with Framer Motion (slide + fade).

### Hero
- `min-h-screen` with flex center
- Background: teal gradient mesh + faint geometric grid overlay (CSS `background-image` repeating pattern, ~5% opacity)
- Floating blurred circles (CSS `absolute` positioned divs with `blur-3xl`, slow drift animation via CSS keyframes)
- White text on gradient background
- Max-width container for text content (centered)
- **Headline:** "Access control and security for residential communities, from any device."
- **Subheadline:** "Manage visitor entry, guard shifts, and amenity bookings — all in one platform built for Mexican fraccionamientos."
- **Primary CTA:** Amber gradient button → scrolls to `#cta`
- **Secondary CTA:** White outline link → scrolls to `#how-it-works`

### The Problem
- Background: `stone-50`
- Headline: "Sound familiar?" with teal accent underline (decorative `after` pseudo-element)
- 5 cards in responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (last row centers 2 cards)
- Card: white bg, rounded-xl, subtle border, padding. Icon (Lucide, teal-500) top-left, bold title, body text in stone-600
- Stagger fade-up on scroll

### How It Works
- Background: white
- Headline: "How RamcarSoft works"
- 4 steps in horizontal layout on desktop (`flex`), vertical on mobile
- Step: numbered circle (48px, teal-700 bg, white bold number) → title (font-semibold) → description (stone-600)
- Horizontal connector: 2px line between circles, animates width on scroll (CSS or Framer)
- On mobile: vertical line connecting steps

### Features (by Role)
- Background: `stone-50`
- Section id: `features`
- Custom Tabs component with 3 tabs: Admin, Guard, Resident
- Tab bar: horizontal, teal underline slides to active tab (Framer `layoutId`)
- Tab content: list of features with teal checkmark icon + text
- Content area has a subtle card-like container (white bg, rounded, shadow-sm)
- Cross-fade animation between tab content

**Admin features (6 items):**
- Manage all residents and their access permissions
- View full access history with filters and exports
- Configure guard shifts and patrol routes
- Manage amenity bookings and availability
- Receive alerts for blacklisted visitors or vehicles
- Invite and suspend users

**Guard features (5 items):**
- Register and verify visitors on-site (with or without internet)
- Check visitor pre-registrations in real time
- Log incidents with photos and notes
- Run patrol check-ins per checkpoint
- View the community blacklist before granting access

**Resident features (5 items):**
- Pre-register guests and send them a QR entry pass
- Authorize recurring visitors (housekeeper, dog walker, delivery)
- Book amenities: pool, gym, event hall
- Receive real-time push notifications on every access event
- Report incidents or maintenance issues

### Why Choose Us
- Background: white
- 2x3 grid on desktop (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), 1 col mobile
- Each item: rounded icon container (64px, teal-50 bg, teal-600 Lucide icon) + bold title + description
- Hover: subtle lift + shadow-md transition
- 6 items as specified in the original prompt

### Social Proof
- Background: `stone-950` with faint radial teal gradient (5% opacity center)
- White text
- Headline: "Built for Mexican residential communities"
- Body paragraph about RamcarSoft's Mexican-first design
- 3 stat cards in a row: number (Geist Mono, large, teal-400 color) + label (stone-400)
- Numbers count up on viewport entry using CountUp component
- Placeholder stats: "X+ communities", "X,XXX+ residents", "X00,000+ access events"

### Pricing
- Background: `stone-50`
- Section id: `pricing`
- 3 cards in a row (stack on mobile)
- Card: white bg, rounded-2xl, shadow-lg, padding
- **Estándar card (center):** scale(1.05), teal top border (4px), amber "Most popular" badge
- Each card: tier name (bold), price placeholder ("$X USD/mo"), feature checklist (check icon for included, dash for excluded), CTA button
- Básico + Premium: teal outline button. Estándar: amber gradient button
- Below cards: "14-day free trial" note + "Custom plan? Contact us →" link
- Hover: cards lift with shadow

### FAQ
- Background: white
- Section id: `faq`
- Custom Accordion: single-open mode (opening one closes others)
- Item: question text (font-semibold) + chevron icon (rotates 180deg on expand)
- Answer: Framer Motion AnimatePresence for smooth height transition
- 7 questions as specified
- Keyboard accessible: Enter/Space to toggle, arrow keys to navigate between items

### Final CTA
- Background: `stone-950`
- Section id: `cta`
- Split layout: `grid-cols-1 lg:grid-cols-2`
- **Left — Demo form:**
  - Headline: "Request your free demo"
  - Fields: Name (text), Email (email), Community name (text), Number of residents (select: <50, 50-150, 150-500, 500+)
  - Custom styled inputs matching landing page theme (stone border, teal focus ring)
  - Submit: amber gradient button, full width
  - Below: "We'll reach out within 24 hours. No commitment required."
  - Form submission: `console.log` stub (to be wired later)
  - **Validation:** All fields required. Email validated with basic regex. On invalid submit, fields show red border + inline error message (translated). No submission until all fields valid.
- **Right — Direct contact:**
  - "Prefer to talk?"
  - Email link: info@ramcarsoft.com
  - Subtle decorative teal gradient blur element

### Footer
- Background: `stone-900`
- Layout: `flex justify-between` on desktop, stacked on mobile
- **Left:** "RamcarSoft" + tagline
- **Center:** Links — Privacy Policy, Terms of Service, Contact
- **Right:** Language switcher (ES | EN)
- Bottom: Copyright `© 2026 RamcarSoft. All rights reserved.`

---

## 9. Responsive Breakpoints

Follow Tailwind defaults:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

Mobile-first design. All sections stack vertically on mobile. Navbar collapses to hamburger below `lg`.

---

## 10. Accessibility

- All interactive elements have keyboard support (Tab, Enter, Space, Arrow keys)
- Accordion and Tabs follow WAI-ARIA patterns (`role`, `aria-expanded`, `aria-controls`, `aria-selected`)
- Color contrast meets WCAG AA (4.5:1 for body text, 3:1 for large text)
- Focus rings visible on all interactive elements (teal ring)
- `prefers-reduced-motion`: all Framer Motion animations disabled
- All anchor links have descriptive text
- Form inputs have associated labels
- Language switcher announces locale change to screen readers

---

## 11. Performance Considerations

- Server Components by default for layout and page assembly
- Client Components only where needed (interactivity, Framer Motion)
- Framer Motion is tree-shakeable — only import used functions
- No images in v1 (all visual interest via CSS gradients, patterns, icons)
- Lucide icons are individually importable (no full bundle)
- next-intl messages loaded per-locale (no loading both locales)
- Animations use only `transform` and `opacity` — no layout triggers

---

## 12. Navigation Behavior

| Element | Action |
|---------|--------|
| Nav "Features" | Smooth scroll to `#features` |
| Nav "Pricing" | Smooth scroll to `#pricing` |
| Nav "FAQ" | Smooth scroll to `#faq` |
| Nav "Request demo" | Smooth scroll to `#cta` |
| Nav "Sign in" | Navigate to URL from env var `NEXT_PUBLIC_APP_URL` (defaults to `https://app.ramcarsoft.com`). Login path: `${NEXT_PUBLIC_APP_URL}/login` |
| Hero primary CTA | Smooth scroll to `#cta` |
| Hero secondary CTA | Smooth scroll to `#how-it-works` |
| Pricing "Custom plan" | Smooth scroll to `#cta` |
| Language switcher | Switches locale (page reload to new locale path) |

---

## 13. SEO & Metadata

Per-locale metadata defined in `[locale]/layout.tsx`:

| Field | es-MX | en-US |
|-------|-------|-------|
| `title` | "RamcarSoft — Control de acceso y seguridad residencial" | "RamcarSoft — Residential Access Control & Security" |
| `description` | "Plataforma de seguridad para fraccionamientos. Control de acceso, turnos de guardia y reservas de amenidades." | "Security platform for gated communities. Access control, guard shifts, and amenity bookings." |
| `og:title` | Same as title | Same as title |
| `og:description` | Same as description | Same as description |
| `og:type` | `website` | `website` |
| `og:locale` | `es_MX` | `en_US` |

---

## 14. Out of Scope

- No `/api/` routes — form submission is a `console.log` stub
- No authentication
- No CMS integration
- No analytics (can be added later)
- No real images or illustrations (CSS-only visuals)
- No real testimonials (placeholder state)
- No real pricing numbers (placeholder `$X`)
