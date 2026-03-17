# Feature Specification: WWW Landing Page

**Feature Branch**: `001-www-landing-page`
**Created**: 2026-03-16
**Status**: Draft
**Input**: Build the public marketing landing page (`apps/www`) for RamcarSoft— a multi-tenant residential security platform for Mexican fraccionamientos. Single-page layout with 9 sections, i18n (es-MX + en-US), and lead capture form.

## Clarifications

### Session 2026-03-16

- Q: What type of parallax navigation should the landing page use? → A: Parallax layered scroll — continuous scrolling with multi-layer parallax effects (foreground content moves at different speed than background elements) creating depth as user scrolls
- Q: Should parallax effects apply on mobile viewports? → A: Disable on mobile (<768px) with standard scrolling fallback; respect `prefers-reduced-motion` OS setting on all devices
- Q: Which sections should have parallax effects? → A: Narrative sections only — Hero, Problem, How It Works, Why Choose Us, Social Proof. Interactive/data-heavy sections (Features, Pricing, FAQ, Final CTA) use static backgrounds

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Property Manager Discovers RamcarSoft(Priority: P1)

A property manager or HOA administrator lands on the RamcarSoftmarketing page (via search, referral, or ad). They scroll through the page to understand what RamcarSoftdoes, who it's for, and whether it solves their community's security problems. Within 60 seconds, they should understand the value proposition and find a clear path to request a demo.

**Why this priority**: This is the primary conversion funnel. If visitors can't understand the product and take action, no other feature matters.

**Independent Test**: Can be fully tested by loading the page, scrolling through all 9 sections, and verifying each section renders correctly with all copy visible. Delivers the core marketing message and lead capture capability.

**Acceptance Scenarios**:

1. **Given** a visitor loads the landing page, **When** the page renders, **Then** the Hero section displays the headline, subheadline, and primary CTA button above the fold
2. **Given** a visitor scrolls down, **When** they reach the Problem section, **Then** all 5 pain points are displayed with icons and descriptions
3. **Given** a visitor clicks "See how it works", **When** the page scrolls, **Then** it navigates to the How It Works section via anchor link
4. **Given** a visitor views the Features section, **When** they interact with role tabs (Admin/Guard/Resident), **Then** the corresponding feature list is displayed
5. **Given** a visitor reaches the Final CTA section, **When** they fill in the demo request form and submit, **Then** the form data is captured (console.log stub) and a confirmation message appears

---

### User Story 2 - Visitor Evaluates Pricing (Priority: P1)

A property manager evaluating RamcarSoftwants to understand pricing tiers, what's included, and whether there's a free trial. They scroll to the Pricing section to self-qualify before requesting a demo.

**Why this priority**: Pricing transparency is critical for B2B conversion. Without it, qualified leads bounce.

**Independent Test**: Can be tested by scrolling to the Pricing section and verifying all 3 tiers display correctly with features, prices (placeholder), and the "Most popular" badge on Estandar.

**Acceptance Scenarios**:

1. **Given** a visitor views the Pricing section, **When** the section renders, **Then** 3 pricing tiers (Basico, Estandar, Premium) are displayed as cards
2. **Given** the Estandar tier, **When** the visitor views it, **Then** it is visually highlighted with a "Most popular" badge
3. **Given** a visitor reads the pricing note, **When** they look below the tiers, **Then** they see the 14-day free trial message and the "Contact us" link for custom plans

---

### User Story 3 - Visitor Gets Answers via FAQ (Priority: P2)

A property manager has specific objections or questions (hardware requirements, offline capability, data security, contracts). They use the FAQ section to find answers without needing to contact sales.

**Why this priority**: FAQ reduces friction in the decision-making process and lowers support burden, but is secondary to the core value proposition and pricing.

**Independent Test**: Can be tested by navigating to the FAQ section, clicking each accordion item, and verifying all 7 questions expand with their full answers.

**Acceptance Scenarios**:

1. **Given** a visitor views the FAQ section, **When** the section renders, **Then** 7 FAQ items are displayed in collapsed/accordion format
2. **Given** a visitor clicks on a FAQ question, **When** the accordion expands, **Then** the full answer is displayed
3. **Given** a visitor has multiple questions open, **When** they click a new question, **Then** the accordion behavior works correctly (expand/collapse)

---

### User Story 4 - Visitor Switches Language (Priority: P2)

An English-speaking visitor (expat community manager, international property management company) lands on the Spanish page and needs to switch to English, or vice versa. They use the language switcher to view all content in their preferred language.

**Why this priority**: i18n is important for accessibility but secondary to core content delivery. Most visitors will be Spanish-speaking.

**Independent Test**: Can be tested by loading the page in es-MX, switching to en-US via the language switcher, and verifying all content updates to English. Reverse test from en-US to es-MX.

**Acceptance Scenarios**:

1. **Given** a visitor is viewing the page in es-MX (default), **When** they click the language switcher and select en-US, **Then** all page content updates to English and the URL reflects `/en-US/`
2. **Given** a visitor navigates directly to `/en-US/`, **When** the page loads, **Then** all content renders in English
3. **Given** a visitor is on the en-US version, **When** they switch back to es-MX, **Then** the content reverts to Spanish and the URL returns to `/`

---

### User Story 5 - Visitor Navigates via Sticky Navbar (Priority: P2)

A visitor uses the sticky navbar to jump between sections without scrolling manually. The navbar stays visible as they scroll and provides quick access to key sections and the CTA.

**Why this priority**: Navigation enhances usability but the page works without it (scrolling is the primary interaction).

**Independent Test**: Can be tested by scrolling past the hero, verifying the navbar remains sticky, and clicking each nav link to confirm smooth scrolling to the correct section.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls past the Hero, **When** they look at the top of the viewport, **Then** the navbar remains fixed/sticky
2. **Given** a visitor clicks "Pricing" in the navbar, **When** the page scrolls, **Then** the Pricing section scrolls into view
3. **Given** the navbar is visible, **When** the visitor clicks the CTA button, **Then** they are scrolled to the Final CTA / Contact section

---

### User Story 6 - Mobile Visitor Browses the Page (Priority: P2)

A property manager opens the RamcarSoftpage on their phone. All sections adapt to mobile viewport: the navbar collapses to a hamburger menu, step-by-step sections stack vertically, pricing cards stack, and the form is full-width.

**Why this priority**: Mobile traffic is significant, but the primary audience (property managers evaluating B2B software) will often use desktop.

**Independent Test**: Can be tested by resizing the browser to mobile viewport widths (375px, 414px) and verifying all sections render correctly without horizontal overflow.

**Acceptance Scenarios**:

1. **Given** a mobile visitor loads the page, **When** the viewport is under 768px, **Then** the navbar shows a hamburger/mobile menu
2. **Given** the How It Works section on mobile, **When** it renders, **Then** steps display vertically instead of horizontally
3. **Given** the Pricing section on mobile, **When** it renders, **Then** pricing cards stack vertically
4. **Given** the Final CTA section on mobile, **When** it renders, **Then** the form and contact info stack vertically

---

### Edge Cases

- What happens when the demo request form is submitted with empty required fields? Validation errors should appear inline.
- What happens when a visitor navigates to an unsupported locale (e.g., `/fr/`)? They should be redirected to the default locale (es-MX).
- What happens when JavaScript is disabled? The page should still render all static content (SSR).
- What happens when the page is accessed by a screen reader? All interactive elements must have proper ARIA roles and keyboard navigation.
- What happens when the visitor clicks the email link in the contact section? It should open their default email client with a pre-filled "to" address.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Page MUST render all 9 sections in order: Hero, Problem, How It Works, Features, Why Choose Us, Social Proof, Pricing, FAQ, Final CTA
- **FR-002**: Page MUST include a sticky navbar with logo placeholder, section anchor links (Features, Pricing, FAQ), and a CTA button
- **FR-003**: All user-facing text MUST be sourced from translation files (`messages/es-MX.json` and `messages/en-US.json`) — no hardcoded strings
- **FR-004**: Page MUST support two locales: `es-MX` (default, served at `/`) and `en-US` (served at `/en-US/`)
- **FR-005**: Page MUST include a language switcher in the footer that toggles between es-MX and en-US
- **FR-006**: The Hero section MUST display headline, subheadline, primary CTA button ("Request a Free Demo"), and secondary anchor link ("See how it works")
- **FR-007**: The Problem section MUST display 5 pain points, each with an icon and descriptive text
- **FR-008**: The How It Works section MUST display 4 steps in a horizontal layout on desktop and vertical on mobile
- **FR-009**: The Features section MUST use a 3-tab component (Admin / Guard / Resident) displaying role-specific feature lists
- **FR-010**: The Why Choose Us section MUST display 6 differentiators in a 2x3 grid on desktop, single column on mobile
- **FR-011**: The Social Proof section MUST display the placeholder state: headline, brand story paragraph, and 3 stat placeholders
- **FR-012**: The Pricing section MUST display 3 tier cards (Basico, Estandar, Premium) with feature comparison, the Estandar tier marked as "Most popular"
- **FR-013**: The Pricing section MUST include a 14-day free trial note and a "Contact us" link for custom plans
- **FR-014**: The FAQ section MUST display 7 questions in an accordion (expand/collapse) component
- **FR-015**: The Final CTA section MUST include a demo request form with fields: Name, Email, Community name, Number of residents (dropdown)
- **FR-016**: The demo request form submission MUST be a stub (console.log) — no backend integration in this task
- **FR-017**: The Final CTA section MUST include a direct contact option with email link (info@ramcarsoft.com)
- **FR-018**: The Footer MUST include logo, tagline, links (Privacy Policy, Terms of Service, Contact), language switcher, and copyright
- **FR-019**: Each section MUST have an `id` attribute for anchor navigation from the navbar
- **FR-020**: All interactive components (tabs, accordion, form) MUST use client components (`"use client"`)
- **FR-021**: Static sections MUST be Server Components by default
- **FR-022**: The page MUST be mobile-first and fully responsive
- **FR-027**: The page MUST use parallax layered scrolling — continuous vertical scroll where each section has multi-layer parallax effects (foreground content and background elements move at different speeds) to create visual depth as the user scrolls
- **FR-028**: Parallax effects MUST be disabled on mobile viewports (below 768px), falling back to standard scrolling. On all devices, parallax MUST be disabled when the user's OS has `prefers-reduced-motion` enabled
- **FR-029**: Parallax effects MUST apply only to narrative sections: Hero, Problem, How It Works, Why Choose Us, and Social Proof. Interactive/data-heavy sections (Features, Pricing, FAQ, Final CTA) MUST use static backgrounds to avoid distracting users during decision-making
- **FR-023**: All interactive elements MUST have keyboard support and proper ARIA roles
- **FR-024**: The page MUST use the specified color palette: ash-grey (#bac7be), tea-green (#c2e1c2), emerald (#7dcd85), muted-teal (#80ab82), dusty-olive (#778472)
- **FR-025**: The page MUST import shared components from `packages/ui` where applicable — no duplication
- **FR-026**: Form fields MUST validate required inputs and display inline error messages for empty submissions

### Key Entities

- **Locale**: Represents a supported language/region (es-MX or en-US), determines which translation file is used and URL prefix
- **Section**: A named, identifiable block of the single-page layout (Hero, Problem, HowItWorks, Features, WhyUs, SocialProof, Pricing, FAQ, FinalCTA)
- **Pricing Tier**: A plan level (Basico, Estandar, Premium) with associated limits, features, and price placeholder
- **FAQ Item**: A question-answer pair displayed in an accordion component
- **Demo Request Lead**: A form submission containing name, email, community name, and resident count range

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Page loads and displays all 9 sections with complete content in under 3 seconds on a standard broadband connection
- **SC-002**: A first-time visitor can understand what RamcarSoftdoes and find the demo request form within 60 seconds of landing
- **SC-003**: 100% of user-facing text is sourced from translation files — zero hardcoded strings in components
- **SC-004**: Language switching between es-MX and en-US updates all visible content without page errors or missing translations
- **SC-005**: All 9 sections render correctly at viewport widths from 375px (mobile) to 1920px (desktop) without horizontal overflow or layout breakage
- **SC-006**: All interactive elements (tabs, accordion, form, navbar links, language switcher) are fully operable via keyboard alone
- **SC-007**: Demo request form prevents submission of empty required fields and shows inline validation messages
- **SC-008**: Navbar anchor links scroll the page to the correct section with the target section visible in the viewport
- **SC-009**: The page passes basic accessibility checks: all images have alt text, all form fields have labels, all buttons have accessible names

## Assumptions

- Pricing amounts are placeholders (`$X USD/mo`) — actual prices will be filled in later
- Social proof stats are placeholders — real numbers will be added when available
- The demo request form is a UI-only stub (console.log) — backend integration is out of scope
- No stock photos or real images are required — placeholder/illustration approach is acceptable
- The `next-intl` package will be added to the project if not already installed
- No `/api/` routes are created in this task
- The color palette applies globally to the landing page via Tailwind configuration or CSS custom properties
- The Privacy Policy and Terms of Service links point to `#` placeholders
