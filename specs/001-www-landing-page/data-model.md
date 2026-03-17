# Data Model: WWW Landing Page

**Feature**: 001-www-landing-page
**Date**: 2026-03-16

## Overview

This is a static marketing page — no persistent database entities. The data model covers runtime data structures used by components and the form submission schema.

## Entities

### DemoRequestLead

Form submission captured at the Final CTA section. Currently a stub (console.log), schema defined for future backend integration.

| Field          | Type   | Constraints                                              |
|----------------|--------|----------------------------------------------------------|
| name           | string | Required, min 2 chars, max 100 chars                     |
| email          | string | Required, valid email format                             |
| communityName  | string | Required, min 2 chars, max 200 chars                     |
| residentCount  | enum   | Required, one of: `<50`, `50-150`, `150-500`, `500+`    |

**Validation**: Zod schema in `@ramcar/shared` at `src/validators/demo-request.ts`.

**State transitions**: None (fire-and-forget stub). Future: `submitted → pending → confirmed | failed`.

### PricingTier (static data)

Rendered from translation files, not a runtime entity. Defined here for structural reference.

| Field           | Type     | Notes                                    |
|-----------------|----------|------------------------------------------|
| name            | string   | Básico, Estándar, Premium                |
| communities     | string   | "1", "1", "Up to 3"                     |
| residents       | string   | "Up to 100", "Up to 300", "Unlimited"   |
| guardAccounts   | string   | "2", "5", "Unlimited"                   |
| amenityBooking  | boolean  | false, true, true                        |
| historyExport   | boolean  | false, true, true                        |
| prioritySupport | boolean  | false, false, true                       |
| price           | string   | Placeholder "$X USD/mo"                  |
| isPopular       | boolean  | false, true, false                       |

### FAQItem (static data)

| Field    | Type   | Notes                        |
|----------|--------|------------------------------|
| question | string | From translation keys         |
| answer   | string | From translation keys         |

### NavItem (static data)

| Field  | Type   | Notes                             |
|--------|--------|-----------------------------------|
| label  | string | From translation key              |
| href   | string | Anchor link (`#section-id`)       |

### Locale

| Value   | Description          | URL Prefix |
|---------|----------------------|------------|
| `es-MX` | Spanish (Mexico)     | `/` (default, no prefix) |
| `en-US` | English (US)         | `/en-US/`  |

## Relationships

```
Page
 ├── Navbar (NavItem[])
 ├── Hero
 ├── TheProblem (PainPoint[] — 5 items from translations)
 ├── HowItWorks (Step[] — 4 items from translations)
 ├── Features (Tab[] — 3 tabs, each with FeatureItem[])
 ├── WhyUs (Differentiator[] — 6 items from translations)
 ├── SocialProof (Stat[] — 3 placeholder items)
 ├── Pricing (PricingTier[] — 3 tiers from translations)
 ├── FAQ (FAQItem[] — 7 items from translations)
 ├── FinalCTA (DemoRequestLead form + contact info)
 └── Footer (NavItem[] + Locale switcher)
```

## Notes

- All text content lives in translation JSON files, not in component code
- No database tables are created for this feature
- The DemoRequestLead Zod schema is the only runtime data structure that will persist beyond this feature (for future backend integration)
