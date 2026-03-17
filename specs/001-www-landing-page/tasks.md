# Tasks: WWW Landing Page

**Input**: Design documents from `/specs/001-www-landing-page/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Not requested in feature specification. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, add missing shared UI components, create shared validation schema

- [x] T001 Install `next-intl` dependency in `apps/www/package.json` and run `pnpm install`
- [x] T002 Add shadcn/ui Accordion component to `packages/ui/` via `pnpx shadcn@latest add accordion` and re-export from `packages/ui/src/index.ts`
- [x] T003 [P] Add shadcn/ui Tabs component to `packages/ui/` via `pnpx shadcn@latest add tabs` and re-export from `packages/ui/src/index.ts`
- [x] T004 [P] Add shadcn/ui Select component to `packages/ui/` via `pnpx shadcn@latest add select` and re-export from `packages/ui/src/index.ts`
- [x] T005 [P] Add shadcn/ui Label component to `packages/ui/` via `pnpx shadcn@latest add label` and re-export from `packages/ui/src/index.ts`
- [x] T006 [P] Create DemoRequestLead Zod validation schema in `packages/shared/src/validators/demo-request.ts` with fields: name (string, min 2, max 100), email (string, email format), communityName (string, min 2, max 200), residentCount (enum: `<50`, `50-150`, `150-500`, `500+`). Export from `packages/shared/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: i18n infrastructure, translation files, color palette, parallax CSS utilities, and app layout. MUST be complete before any section component can be built.

- [x] T007 Create i18n routing config at `apps/www/src/i18n/routing.ts` — define locales (`es-MX`, `en-US`), defaultLocale (`es-MX`), localePrefix strategy (prefix non-default only)
- [x] T008 Create i18n request config at `apps/www/src/i18n/request.ts` — implement `getRequestConfig` that loads messages JSON for the current locale from `apps/www/messages/`
- [x] T009 Create next-intl middleware at `apps/www/src/middleware.ts` — locale detection, URL rewriting, redirect unsupported locales to `es-MX`
- [x] T010 [P] Create English translation file at `apps/www/messages/en-US.json` with fully nested key structure covering all 9 sections: nav, hero, problem, howItWorks, features, whyUs, socialProof, pricing, faq, cta, footer (~300 keys). All copy from spec.md English text
- [x] T011 [P] Create Spanish translation file at `apps/www/messages/es-MX.json` with identical key structure to `en-US.json`, faithfully translating all English copy to Mexican Spanish
- [x] T012 Update `apps/www/src/app/globals.css` — add RamcarSoftlanding page color palette via Tailwind v4 `@theme` directive: ash-grey (#bac7be), tea-green (#c2e1c2), emerald (#7dcd85), muted-teal (#80ab82), dusty-olive (#778472). Add CSS parallax utility classes: perspective container, parallax background layer transforms (`translateZ` + `scale`), foreground layer, `@media (prefers-reduced-motion: reduce)` and `@media (max-width: 767px)` overrides to disable parallax
- [x] T013 Create locale-aware root layout at `apps/www/src/app/[locale]/layout.tsx` — wrap children with `NextIntlClientProvider`, load messages via `getRequestConfig`, set `<html lang>` attribute, include fonts (Geist), import globals.css, set page metadata (title, description from translations)
- [x] T014 Create feature barrel export at `apps/www/src/features/landing/index.ts` — re-export all section components (initially empty, updated as sections are added)
- [x] T015 Update `apps/www/next.config.ts` to integrate `next-intl` plugin via `createNextIntlPlugin`

**Checkpoint**: i18n routing works — visiting `/` loads es-MX, visiting `/en-US/` loads en-US. Color palette and parallax CSS are available. Layout renders with correct locale.

---

## Phase 3: User Story 1 + User Story 2 — Core Page Content (Priority: P1) MVP

**Goal**: Render all 9 sections with complete bilingual content, parallax effects on narrative sections, and a functional demo request form. Visitor can discover Ramcar, understand the product, evaluate pricing, and request a demo.

**Independent Test**: Load the page, scroll through all 9 sections. All content visible in both locales. Pricing tiers display correctly with "Most popular" badge on Estandar. Form captures data via console.log.

### Implementation for User Stories 1+2

- [x] T016 [P] [US1] Create Hero section component at `apps/www/src/features/landing/components/Hero.tsx` — server component with parallax background layers, headline, subheadline, primary CTA button ("Request a Free Demo" linking to #contact), secondary anchor link ("See how it works" linking to #how-it-works). Full-width section with gradient background using color palette. `id="hero"`
- [x] T017 [P] [US1] Create TheProblem section component at `apps/www/src/features/landing/components/TheProblem.tsx` — server component with parallax, "Sound familiar?" headline, 5 pain points each with Lucide icon and descriptive text from translations. `id="problem"`
- [x] T018 [P] [US1] Create HowItWorks section component at `apps/www/src/features/landing/components/HowItWorks.tsx` — server component with parallax, "How RamcarSoftworks" headline, 4 numbered steps in horizontal layout on desktop (grid/flex) and vertical stack on mobile. Step content from translations. `id="how-it-works"`
- [x] T019 [P] [US1] Create Features section component at `apps/www/src/features/landing/components/Features.tsx` — client component (`"use client"`), 3-tab layout using `Tabs` from `@ramcar/ui` (Admin / Guard / Resident), each tab displays role-specific feature list from translations. `id="features"`. Static background (no parallax)
- [x] T020 [P] [US1] Create WhyUs section component at `apps/www/src/features/landing/components/WhyUs.tsx` — server component with parallax, 6 differentiators in 2x3 grid on desktop / single column on mobile, each with Lucide icon, title, and description from translations. `id="why-us"`
- [x] T021 [P] [US1] Create SocialProof section component at `apps/www/src/features/landing/components/SocialProof.tsx` — server component with parallax, placeholder state: "Built for Mexican residential communities" headline, brand story paragraph, 3 stat placeholders from translations. `id="social-proof"`
- [x] T022 [P] [US2] Create Pricing section component at `apps/www/src/features/landing/components/Pricing.tsx` — server component using `Card` from `@ramcar/ui`, 3 tier cards (Basico, Estandar, Premium) with feature comparison rows (communities, residents, guard accounts, amenity booking, history export, priority support, price). Mark Estandar as "Most popular" with visual badge. Include 14-day free trial note and "Contact us" custom plan link. Static background (no parallax). `id="pricing"`
- [x] T023 [P] [US1] Create FAQ section component at `apps/www/src/features/landing/components/FAQ.tsx` — client component (`"use client"`), 7-item accordion using `Accordion` from `@ramcar/ui`, questions and answers from translations. Keyboard accessible. Static background (no parallax). `id="faq"`
- [x] T024 [P] [US1] Create FinalCTA section component at `apps/www/src/features/landing/components/FinalCTA.tsx` — client component (`"use client"`), two-column layout (stacked on mobile): demo request form (Name via `Input`, Email via `Input`, Community name via `Input`, Number of residents via `Select` from `@ramcar/ui`, all with `Label`). Validate with Zod schema from `@ramcar/shared`. Submit handler is `console.log` stub with success confirmation message. Direct contact section with `mailto:info@ramcarsoft.com` link. Dark/contrasting background. Static background (no parallax). `id="contact"`
- [x] T025 [P] [US1] Create Footer component at `apps/www/src/features/landing/components/Footer.tsx` — client component (`"use client"`), logo placeholder + tagline, links (Privacy Policy `#`, Terms of Service `#`, Contact `#contact`), language switcher button toggling between es-MX and en-US via `useRouter` from `next-intl/navigation`, copyright "2026 Ramcar. All rights reserved." from translations
- [x] T026 [P] [US1] Create Navbar component at `apps/www/src/features/landing/components/Navbar.tsx` — client component (`"use client"`), sticky top navbar (`position: sticky; top: 0; z-index: 50`), logo placeholder, anchor links (Features `#features`, Pricing `#pricing`, FAQ `#faq`), CTA button ("Request a Demo" linking to `#contact`). Mobile hamburger menu (collapsible nav under 768px). Smooth scroll behavior on anchor click. All labels from translations
- [x] T027 Update barrel export at `apps/www/src/features/landing/index.ts` — re-export all 11 components: Navbar, Hero, TheProblem, HowItWorks, Features, WhyUs, SocialProof, Pricing, FAQ, FinalCTA, Footer
- [x] T028 Create page assembly at `apps/www/src/app/[locale]/page.tsx` — import all sections from `@/features/landing`, render in order: Navbar, Hero, TheProblem, HowItWorks, Features, WhyUs, SocialProof, Pricing, FAQ, FinalCTA, Footer. Wrap parallax sections in perspective container div. Server component
- [x] T029 Remove old placeholder content from `apps/www/src/app/layout.tsx` and `apps/www/src/app/page.tsx` — redirect root layout/page to `[locale]/` route structure or remove if next-intl middleware handles it

**Checkpoint**: Full page renders with all 9 sections + navbar + footer. Both locales work. Parallax active on Hero, Problem, HowItWorks, WhyUs, SocialProof. Form validates and logs to console. Pricing tiers display with "Most popular" badge.

---

## Phase 4: User Story 3 — FAQ Interactive Behavior (Priority: P2)

**Goal**: FAQ accordion expands/collapses correctly with keyboard support.

**Independent Test**: Navigate to FAQ section, click each of the 7 questions, verify answers expand/collapse. Test keyboard navigation (Tab + Enter/Space).

> Note: FAQ component is built in T023. This phase ensures interactive behavior and accessibility are verified and polished.

- [x] T030 [US3] Verify and refine FAQ accordion behavior in `apps/www/src/features/landing/components/FAQ.tsx` — ensure `type="single"` or `type="multiple"` collapsible mode works correctly, all 7 items expand/collapse, ARIA roles are correct (`role="region"`, `aria-labelledby`), keyboard navigation works (Tab to focus, Enter/Space to toggle)

**Checkpoint**: All 7 FAQ items expand/collapse with correct keyboard and screen reader support.

---

## Phase 5: User Story 4 — Language Switching (Priority: P2)

**Goal**: Visitor can switch between es-MX and en-US with all content updating and URL reflecting the locale.

**Independent Test**: Load page in es-MX, click language switcher in footer, verify all content updates to English and URL changes to `/en-US/`. Switch back, verify Spanish and URL returns to `/`.

> Note: i18n infrastructure is built in Phase 2, language switcher in T025. This phase verifies end-to-end locale switching works correctly.

- [x] T031 [US4] Verify and refine language switching in `apps/www/src/features/landing/components/Footer.tsx` — ensure `useRouter` and `usePathname` from `next-intl/navigation` correctly switch locale, URL updates (es-MX at `/`, en-US at `/en-US/`), all section content updates without page errors, no missing translation keys in either locale

**Checkpoint**: Language switching works end-to-end. No missing keys. URL reflects correct locale.

---

## Phase 6: User Story 5 — Sticky Navbar Navigation (Priority: P2)

**Goal**: Navbar remains sticky when scrolling, anchor links scroll to correct sections, CTA button scrolls to contact form.

**Independent Test**: Scroll past Hero, verify navbar stays fixed. Click each anchor link, verify smooth scroll to correct section.

> Note: Navbar is built in T026. This phase verifies sticky behavior and smooth scrolling.

- [x] T032 [US5] Verify and refine Navbar behavior in `apps/www/src/features/landing/components/Navbar.tsx` — ensure sticky positioning works across viewports, smooth scroll to anchored sections using `scroll-behavior: smooth` or `scrollIntoView({ behavior: 'smooth' })`, active section highlighting (optional), mobile hamburger menu opens/closes correctly with animation

**Checkpoint**: Navbar sticks on scroll. All anchor links navigate to correct sections. Mobile menu functional.

---

## Phase 7: User Story 6 — Mobile Responsiveness (Priority: P2)

**Goal**: All sections render correctly on mobile viewports (375px-767px) without horizontal overflow or layout breakage.

**Independent Test**: Resize browser to 375px width. Verify: hamburger menu visible, steps stack vertically, pricing cards stack, form is full-width, no horizontal scroll.

> Note: Mobile-first CSS is applied during section implementation. This phase is a verification and fix pass.

- [x] T033 [US6] Responsive verification pass across all section components in `apps/www/src/features/landing/components/` — verify at 375px, 414px, 768px, 1024px, 1440px, 1920px. Fix any horizontal overflow, ensure HowItWorks steps stack vertically on mobile, pricing cards stack, FinalCTA form and contact stack, WhyUs grid becomes single column, Features tabs remain usable on small screens. Ensure parallax is disabled below 768px

**Checkpoint**: All sections render correctly from 375px to 1920px. No horizontal overflow. Parallax disabled on mobile.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility audit, final content verification, cleanup

- [x] T034 [P] Accessibility audit across all components in `apps/www/src/features/landing/components/` — verify all images have `alt` text from translations, all form fields have associated `Label` components, all buttons have accessible names, all interactive elements reachable via keyboard, correct heading hierarchy (h1 in Hero, h2 per section)
- [x] T035 [P] Translation completeness check — verify `apps/www/messages/es-MX.json` and `apps/www/messages/en-US.json` have identical key structures, no hardcoded strings in any component file, all `useTranslations()` / `getTranslations()` calls reference valid keys
- [x] T036 [P] Verify `prefers-reduced-motion` support — with OS reduced motion enabled, confirm all parallax transforms are disabled, no motion-related animations play, page remains fully functional
- [x] T037 Run `pnpm lint` and `pnpm typecheck` from repo root and fix any errors in `apps/www/` and modified `packages/` files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (next-intl installed). T002-T006 can run in parallel with Phase 2 tasks
- **US1+US2 (Phase 3)**: Depends on Phase 2 completion (i18n, translations, layout, CSS all ready). Also depends on T002-T006 (shadcn components + Zod schema)
- **US3-US6 (Phases 4-7)**: Depend on Phase 3 (sections must be built before verifying interactive behavior)
- **Polish (Phase 8)**: Depends on all user story phases complete

### User Story Dependencies

- **US1+US2 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US3 (P2)**: Depends on T023 (FAQ section built in US1)
- **US4 (P2)**: Depends on T025 (Footer with language switcher built in US1) + Phase 2 (i18n infrastructure)
- **US5 (P2)**: Depends on T026 (Navbar built in US1)
- **US6 (P2)**: Depends on all sections being built (Phase 3)

### Within Phase 3 (US1+US2)

- T016-T026 are ALL parallelizable (different files, no dependencies between sections)
- T027 depends on T016-T026 (barrel export needs all components)
- T028 depends on T027 (page assembly needs barrel export)
- T029 depends on T028 (cleanup after new route structure is in place)

### Parallel Opportunities

- T002-T006: All setup tasks can run in parallel
- T010-T011: Translation files can run in parallel
- T016-T026: ALL 11 section/component tasks can run in parallel
- T030-T033: US3-US6 verification tasks can run in parallel (different components)
- T034-T036: Polish tasks can run in parallel

---

## Parallel Example: Phase 3 (US1+US2)

```bash
# Launch ALL section components in parallel (different files, no dependencies):
Task: "T016 [P] [US1] Create Hero.tsx"
Task: "T017 [P] [US1] Create TheProblem.tsx"
Task: "T018 [P] [US1] Create HowItWorks.tsx"
Task: "T019 [P] [US1] Create Features.tsx"
Task: "T020 [P] [US1] Create WhyUs.tsx"
Task: "T021 [P] [US1] Create SocialProof.tsx"
Task: "T022 [P] [US2] Create Pricing.tsx"
Task: "T023 [P] [US1] Create FAQ.tsx"
Task: "T024 [P] [US1] Create FinalCTA.tsx"
Task: "T025 [P] [US1] Create Footer.tsx"
Task: "T026 [P] [US1] Create Navbar.tsx"

# Then sequentially:
Task: "T027 Update barrel export"
Task: "T028 Create page assembly"
Task: "T029 Remove old placeholder content"
```

---

## Implementation Strategy

### MVP First (User Stories 1+2 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T015)
3. Complete Phase 3: US1+US2 — all 9 sections + navbar + footer + page assembly (T016-T029)
4. **STOP and VALIDATE**: Full page renders in both locales, pricing section correct, form works
5. Deploy/demo if ready — this is a fully functional landing page

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1+US2 (Phase 3) → Full page with all sections → **MVP!**
3. US3 (Phase 4) → FAQ accordion polished
4. US4 (Phase 5) → Language switching verified
5. US5 (Phase 6) → Navbar behavior verified
6. US6 (Phase 7) → Mobile responsiveness verified
7. Polish (Phase 8) → Accessibility, translations, reduced motion, lint/typecheck

### Parallel Team Strategy

With multiple developers after Phase 2 completes:

- Developer A: T016-T018, T020-T021 (server components with parallax: Hero, Problem, HowItWorks, WhyUs, SocialProof)
- Developer B: T019, T023-T025 (client components: Features, FAQ, FinalCTA, Footer)
- Developer C: T022, T026, T028-T029 (Pricing, Navbar, page assembly, cleanup)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US3-US6 (Phases 4-7) are verification/refinement phases — the core implementation happens in Phase 3
- All 11 section components (T016-T026) can be built in parallel by subagents
- Translation files (T010-T011) should be written carefully — they contain ~300 keys each and must have identical structure
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
