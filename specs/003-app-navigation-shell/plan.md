# Implementation Plan: App Navigation Shell

**Branch**: `003-app-navigation-shell` | **Date**: 2026-04-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-app-navigation-shell/spec.md`

## Summary

Build the application navigation shell (sidebar + top bar) for both `apps/web` (Next.js) and `apps/desktop` (Electron + Vite + React). The sidebar uses the official shadcn/ui sidebar component installed in `packages/ui`, driven by a centralized navigation config in `packages/shared`. Each app wraps the shared UI with app-specific routing and i18n. A top bar provides theme toggle and language switcher. All module routes get placeholder pages.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across all workspaces)  
**Primary Dependencies**: Next.js 16 + next-intl v4 (web), Electron 30 + Vite + React 18 + react-i18next (desktop), shadcn/ui (Radix + Tailwind), Zustand, lucide-react, next-themes (web, new)  
**Storage**: localStorage (sidebar collapse preference — web & desktop), localStorage (theme preference — desktop)  
**Testing**: Jest 30 (api only); no frontend test framework configured yet — manual testing via placeholder pages  
**Target Platform**: Web browser (Next.js SSR) + Desktop Electron (Windows/macOS)  
**Project Type**: Multi-app Turborepo monorepo  
**Performance Goals**: Sidebar toggle animation < 300ms, no layout shift on page navigation  
**Constraints**: Desktop must work offline (sidebar is fully client-side — no network needed). Bilingual i18n (es-MX default, en-US)  
**Scale/Scope**: 13 sidebar items (web/admin), 3 sidebar items (desktop/guard), ~20 placeholder pages total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | N/A | No database queries in navigation; purely client-side UI |
| II. Feature-Based Architecture | PASS | Navigation feature in `src/features/navigation/` per app; routing in `src/app/`; shared config in `packages/shared/src/navigation/` |
| III. Strict Import Boundaries | PASS | `packages/ui` has no app dependencies (presentational only). Apps import from `packages/shared` and `packages/ui`. No cross-feature imports. Desktop renderer communicates via preload only for IPC-backed persistence |
| IV. Offline-First Desktop | PASS | Sidebar and top bar are fully client-side. No network calls. Navigation state in Zustand. Sidebar config is bundled at build time |
| V. Shared Validation via Zod | N/A | No user input validation in navigation — sidebar config is static TypeScript data |
| VI. Role-Based Access Control | PASS (deferred) | Sidebar config includes `roles` field per item. Currently hardcoded to show Admin (web) / Guard (desktop). Future task will wire role-based filtering. Frontend hides items but won't be sole auth mechanism |
| VII. TypeScript Strict Mode | PASS | All new code under strict mode. Shared navigation types exported from `@ramcar/shared` |

**Post-Phase 1 Re-check**: All gates remain PASS. No violations introduced during design.

## Project Structure

### Documentation (this feature)

```text
specs/003-app-navigation-shell/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Phase 1 entity definitions
├── quickstart.md        # Phase 1 developer quickstart
├── contracts/           # Phase 1 interface contracts
│   ├── sidebar-config.md
│   └── component-api.md
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
packages/shared/src/
├── navigation/
│   ├── sidebar-config.ts        # Centralized module registry (single source of truth)
│   └── index.ts                 # Re-exports
├── types/
│   └── auth.ts                  # Existing Role type (reused)
└── index.ts                     # Updated exports

packages/i18n/src/messages/
├── en.json                      # + sidebar.* keys
└── es.json                      # + sidebar.* keys

packages/ui/src/
├── components/ui/
│   ├── sidebar.tsx              # shadcn sidebar (new — installed via CLI)
│   ├── separator.tsx            # shadcn separator (new — sidebar dependency)
│   ├── sheet.tsx                # shadcn sheet (new — sidebar dependency)
│   ├── tooltip.tsx              # shadcn tooltip (new — sidebar dependency)
│   ├── skeleton.tsx             # shadcn skeleton (new — sidebar dependency)
│   ├── dropdown-menu.tsx        # shadcn dropdown-menu (new)
│   ├── collapsible.tsx          # shadcn collapsible (new)
│   ├── avatar.tsx               # shadcn avatar (new)
│   ├── button.tsx               # Existing (may be overwritten by sidebar install)
│   ├── card.tsx                 # Existing
│   └── input.tsx                # Existing (may be overwritten by sidebar install)
├── hooks/
│   └── use-mobile.ts            # shadcn hook (new — sidebar dependency)
├── globals.css                  # + sidebar CSS variables
└── index.ts                     # Updated exports

packages/store/src/
├── slices/
│   ├── auth-slice.ts            # Existing
│   ├── sidebar-slice.ts         # New — collapsed state, current path (desktop)
│   └── theme-slice.ts           # New — dark/light mode (desktop only)
└── index.tsx                    # Updated to compose new slices

apps/web/
├── src/app/[locale]/(dashboard)/
│   ├── layout.tsx               # Navigation shell layout (sidebar + top bar + content)
│   ├── dashboard/page.tsx
│   ├── catalogs/page.tsx
│   ├── logbook/
│   │   ├── page.tsx             # Redirects to /logbook/visitors
│   │   ├── visitors/page.tsx
│   │   ├── providers/page.tsx
│   │   └── residents/page.tsx
│   ├── visits-and-residents/page.tsx
│   ├── projects/page.tsx
│   ├── wifi/page.tsx
│   ├── complaints/page.tsx
│   ├── patrols/page.tsx
│   ├── amenities/page.tsx
│   ├── announcements/page.tsx
│   ├── lost-and-found/page.tsx
│   ├── history/page.tsx
│   ├── blacklist/page.tsx
│   └── account/page.tsx
├── src/features/navigation/
│   ├── components/
│   │   ├── app-sidebar.tsx      # Wraps @ramcar/ui sidebar with Next.js routing + next-intl
│   │   ├── top-bar.tsx          # Top bar with theme toggle + language switcher
│   │   └── theme-toggle.tsx     # next-themes toggle button
│   └── index.ts
└── src/shared/components/
    └── language-switcher.tsx     # Existing (no changes, referenced from top bar)

apps/desktop/
├── src/
│   ├── App.tsx                  # Updated — renders navigation shell when authenticated
│   ├── features/navigation/
│   │   ├── components/
│   │   │   ├── app-sidebar.tsx  # Wraps @ramcar/ui sidebar with Zustand navigation
│   │   │   ├── top-bar.tsx      # Top bar with theme toggle + language switcher
│   │   │   └── theme-toggle.tsx # Zustand-based theme toggle
│   │   └── index.ts
│   ├── features/dashboard/
│   │   └── pages/dashboard-page.tsx
│   ├── features/access-log/
│   │   └── pages/
│   │       ├── access-log-visitors-page.tsx
│   │       ├── access-log-providers-page.tsx
│   │       └── access-log-residents-page.tsx
│   ├── features/patrols/
│   │   └── pages/patrols-page.tsx
│   └── features/account/
│       └── pages/account-page.tsx
└── src/shared/components/
    └── language-switcher.tsx     # Existing (no changes, referenced from top bar)
```

**Structure Decision**: Follows the existing monorepo architecture exactly. Shared navigation config in `packages/shared`, presentational sidebar in `packages/ui`, app-specific wrappers in `src/features/navigation/` per app. All new pages follow the feature-based directory pattern established by the project.

## Complexity Tracking

No constitution violations to justify. All design decisions align with existing patterns.
