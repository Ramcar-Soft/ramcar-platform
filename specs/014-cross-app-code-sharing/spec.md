# Feature Specification: Cross-App Shared Feature Modules

**Feature Branch**: `014-cross-app-code-sharing`
**Created**: 2026-04-16
**Status**: Draft
**Input**: User description: "Every time a feature is created for both web and desktop, or if a change needs to be done in the 2 apps, there is duplicated code that needs to be done in both apps, in terms of UI and some interaction logic like the right sidebar used for the forms in the visitors and residents modules, this could end up with some gaps in the development of both apps, create a design or proposal to reduce this type of friction and reduce the duplicated code or components created for both web and desktop apps"

## Context & Problem

The Ramcar monorepo hosts two end-user-facing applications that share most of the same business surface: `apps/web` (Next.js admin/resident portal) and `apps/desktop` (Electron + Vite guard booth). Today, every feature that exists in both apps is written, styled, and wired twice — even though what the user sees and does is meant to be the same.

Concrete evidence of duplication at the time this spec was written:

| Feature | `apps/web` files | `apps/desktop` files | Status |
|---------|------------------|----------------------|--------|
| `visitors` | 10 components + 10 hooks | 10 components + 10 hooks | Identical file names, drifting content |
| `residents` | 6 components + 7 hooks | 6 components + 7 hooks | Identical file names, drifting content |
| `providers` | 6 components + 10 hooks | 6 components + 10 hooks | Identical file names, drifting content |
| `src/shared/components/*` (vehicle-form, image-capture, visit-person-status-select, resident-select) | Present | Present, re-duplicated per app | Meant to be shared, isn't |

Drift mixes with deliberate platform differences and makes them hard to tell apart. Two concrete examples:

- **Deliberate (web-only)**: The web version of the visit-person create form uses `useFormPersistence` to recover an in-progress draft if the user reloads the browser mid-capture. This protection is a browser concern (a page reload can blow away form state); the desktop renderer does not reload in the same way and does not need it. The divergence is intentional and must remain expressible.
- **Accidental (drift)**: Smaller details — `ResidentSelect` present on web but not on desktop's version of the same form, slightly different sidebar paddings, the `"Replace"` button label wired under different translation keys — are leaks caused by the duplicated authoring path, not product decisions.

Shared building blocks such as `image-capture` and `vehicle-form` have been copied into each app's `src/shared/` instead of a single workspace package, so each copy can (and does) drift independently.

The sources of friction are:

1. **Every UI or interaction change must be authored twice.** Writing the visitor form, the right-hand sidebar layout, the image grid, the table columns, or the upload flow in `apps/web` is effectively followed by a near-identical second edit in `apps/desktop`. This doubles the authoring cost for a feature that is conceptually one feature.
2. **Silent drift between the apps.** Because the second edit is manual, it is sometimes missed, partially applied, or stylistically diverged. End-users then see inconsistent behavior between portal and booth for what is supposed to be the same workflow.
3. **Review and test cost multiplied.** Every change has to be read, reviewed, and tested in both places.
4. **Platform tooling differences amplify the cost.** The two apps use different i18n libraries (`next-intl` in web, `react-i18next` in desktop), different path aliases (`@/shared/*` in web, relative `../../../shared/*` in desktop), and different client-directive conventions (`"use client";` on web, nothing on desktop), which forces near-identical files to be written differently and blocks straightforward copy-paste sharing.

## Clarifications

### Session 2026-04-16

- Q: Which workspace package hosts the shared feature modules — reuse `@ramcar/ui`, or create a new dedicated package? → A: A new dedicated sibling workspace package (working name `@ramcar/features`). `@ramcar/ui` stays primitives-only; the new package depends on `@ramcar/ui`, `@ramcar/shared`, and `@ramcar/i18n` unidirectionally. Rationale: `@ramcar/ui` is a domain-agnostic primitives library; feature modules are vertical domain slices that require Zod schemas, TanStack Query, and host-supplied transport adapters — folding them into `@ramcar/ui` would violate FR-011 / Principle II and prevent `@ramcar/ui` from being reused as a lightweight primitives library elsewhere (e.g., mobile, internal tools).
- Q: By what concrete mechanism does the system surface duplication before merge (FR-012)? → A: A **CI check driven by a shared-features manifest** (e.g., `shared-features.json` at the workspace root). The check fails when `apps/web/src/features/<X>/` or `apps/desktop/src/features/<X>/` introduces components/hooks for any feature X listed in the manifest. The manifest is updated as each feature migrates. Not an ESLint rule (too costly to author/maintain) and not a PR checklist alone (decays).
- Q: What extension-point pattern should shared feature modules use for platform-specific UI (FR-007)? → A: **Typed slot props with a documented naming convention** (e.g., `topRightSlot?: ReactNode`, `trailingAction?: ReactNode`, `afterFields?: ReactNode`, `emptyState?: ReactNode`). Each shared component documents its allowed slot names in TSDoc. Rationale: explicit, discoverable in TypeScript autocomplete, greppable, composes naturally in JSX, and matches the shape of portal/booth divergences (small, localized UI additions). Slot props are reserved for UI injection only; i18n, data transport, and role/tenant context continue to flow through React context / adapter hooks per FR-004 / FR-006.
- Q: Where does feature-scoped client state for a migrated feature live (e.g., sidebar open/close, selected row, active tab)? → A: **Extend `@ramcar/store` with feature-scoped slices** (e.g., `visitorsSlice`, `residentsSlice`). Shared components in `@ramcar/features` consume them via the canonical `useStore(selectSlice)` hook pattern. `@ramcar/features` MUST NOT create its own Zustand store — it depends on `@ramcar/store` for slice definitions. Each host app continues to render exactly one `<StoreProvider>` at its root (FR-008 unchanged on provider wiring).

## User Scenarios & Testing *(mandatory)*

The primary user of this feature is the **platform engineer** authoring or changing features that exist in both applications. The secondary beneficiary is the **end-user** (admin, resident, guard) who sees consistent behavior across the portal and the booth. Stories below are written from the platform engineer's point of view.

### User Story 1 - Author a bi-app feature once (Priority: P1)

A platform engineer is adding a new capability to the visitors module (for example, a new field on the "Register visitor" sidebar form, or a new column in the visitors table). Today this means editing the same shape of code twice — once in `apps/web/src/features/visitors/...` and again in `apps/desktop/src/features/visitors/...`. The engineer should be able to author the UI + interaction logic once, in a shared location, and have both apps pick it up automatically.

**Why this priority**: This is the core cost the user is asking to eliminate. It is the single biggest source of repeated work and the root cause of drift between the two apps. Without this, every item below fails to deliver its value.

**Independent Test**: Add one new field to the visitor-create sidebar form. The new field, its label, its validation, its save behavior, and its translations appear in both the web portal and the desktop booth after a single code change and without any second edit in the other app's `features/` folder.

**Acceptance Scenarios**:

1. **Given** a feature that exists in both apps today (visitors, residents, or providers), **When** a platform engineer adds a new field, button, or section to that feature, **Then** the change is authored in one shared location and both apps render the change without further per-app edits.
2. **Given** a shared feature module is imported by both apps, **When** an app's build runs, **Then** no app-local copy of the same component is required for that feature to work.
3. **Given** a feature behaves identically in both apps (same fields, same buttons, same flow), **When** the feature is reviewed, **Then** its primary implementation lives in exactly one file set, not two parallel ones.

---

### User Story 2 - Change a shared behavior in one place (Priority: P1)

A platform engineer is changing the behavior of an already-shipped bi-app feature — for example, making the image grid tiles square, tightening a validation rule, or renaming a label. Today they must remember to repeat the change in the other app; if they forget, end-users experience inconsistent behavior. The engineer should be able to change the behavior once and be confident both apps have been updated.

**Why this priority**: Even once authoring is shared (Story 1), the ongoing maintenance path is where drift most frequently creeps in. Story 2 is what makes shared features stay shared after the initial migration.

**Independent Test**: Take an existing shared behavior (for example, the validation rule for visitor full-name). Change it in the shared location. Run both apps. Both apps reflect the new rule with no additional commit.

**Acceptance Scenarios**:

1. **Given** a shared feature module is used by both apps, **When** a behavior change is landed in the shared module, **Then** both apps receive the change on their next build with no further edits.
2. **Given** a user-facing string is shared, **When** the string is updated (or translated), **Then** both apps show the updated string without per-app duplication of the message catalog.
3. **Given** a visual change is made (spacing, emphasis, color), **When** the change is landed in the shared module, **Then** both apps render the same visual result.

---
### User Story 3 - Allow deliberate platform divergence without forking (Priority: P1)

Some differences between the two apps are not accidental drift — they are intentional. The desktop booth is offline-first and must show a sync/offline indicator; the web portal is online-only. The web portal must recover in-progress form drafts after a browser reload (via `useFormPersistence`); the desktop renderer does not reload in the same way and does not need that behavior. The web portal has admin-only actions (e.g., re-assign to another resident); the desktop booth does not. A platform engineer must be able to share the common body of a feature while still expressing these platform-specific differences cleanly — without duplicating the entire feature to accommodate each divergence.

**Why this priority**: Without explicit injection points for platform-specific concerns, shared code either (a) leaks platform assumptions (breaking offline-first, or forcing reload recovery where it's unneeded) or (b) is forced back into duplication at the first divergence. Either outcome destroys the value of Story 1. This story is also the explicit resolution of the divergence-tolerance question — the project follows a **shared-core-with-platform-extensions** policy, not strict parity.

**Independent Test**: Take a shared feature and add a desktop-only element (e.g., an "offline pending" badge on a row) through a documented extension point. The shared module accepts the extension without being modified. The web app, which does not supply the extension, renders the feature normally.

**Acceptance Scenarios**:

1. **Given** a shared feature supports a platform-specific extension point, **When** one app supplies extension content and the other does not, **Then** each app renders correctly for its own context without the shared module being forked.
2. **Given** the desktop app must work offline, **When** a shared mutation triggers a write, **Then** the shared module defers the actual transport (online HTTP vs. offline outbox) to the host app rather than assuming network availability.
3. **Given** a feature genuinely has no counterpart in the other app, **When** the engineer evaluates the feature for sharing, **Then** it is explicitly kept app-local and this decision is deliberate, not accidental.

---

### User Story 4 - Detect and prevent re-duplication (Priority: P2)

Once the first features are migrated to the shared approach, there must be a cheap way to stop the duplication pattern from reappearing. A platform engineer (or reviewer) should notice when a new component is being written in `apps/web/src/features/X/` while a near-identical one is written in `apps/desktop/src/features/X/`, before the change merges.

**Why this priority**: The work in Stories 1-3 is undone if the organization resumes duplicating components by default. Drift detection makes the new pattern self-reinforcing.

**Independent Test**: Create a component in `apps/web/src/features/visitors/components/` and a near-identical component in `apps/desktop/src/features/visitors/components/`. Attempt to merge. The review process (tooling, CI, or checklist) surfaces the duplication before the change is approved.

**Acceptance Scenarios**:

1. **Given** a change adds similarly-named components under both apps' `features/` directories, **When** the change is proposed, **Then** the review surface (CI output, linter warning, PR checklist, or equivalent mechanism) calls attention to the potential duplication.
2. **Given** a file in a shared module has an app-local copy with the same name, **When** the project is built or checked, **Then** the overlap is visible to the author before merge.

---

### User Story 5 - Migrate existing duplicated features incrementally (Priority: P2)

Today there are three fully-duplicated features (visitors, residents, providers) plus a duplicated `src/shared/` set. A platform engineer must be able to migrate these to the shared approach one at a time, without requiring a big-bang rewrite and without breaking either app during the migration.

**Why this priority**: Big-bang migrations carry risk and block other work. An incremental path — pilot one feature, validate, then proceed — is the practical way to cash in on the new structure without stopping feature delivery.

**Independent Test**: Migrate a single feature (pilot candidate: visitors, since the user explicitly called it out) to the shared module approach. Both apps continue to function; no regression is observable. The other two features remain unmigrated in parallel.

**Acceptance Scenarios**:

1. **Given** a feature is selected as the pilot, **When** it is migrated to the shared approach, **Then** both apps continue to render and operate that feature with no user-observable regression.
2. **Given** one feature has been migrated and the others have not, **When** the apps are built, **Then** both apps work, with migrated features sourced from the shared module and non-migrated features still sourced from each app's local `features/` directory.
3. **Given** the pilot migration has shipped successfully, **When** the team decides to migrate the next feature, **Then** the work follows the same pattern established by the pilot without redesigning the approach.

---

### User Story 6 - Keep the end-user experience consistent (Priority: P3)

A secondary beneficiary of this work is the end-user — the admin on the portal and the guard on the booth. Where the same workflow exists in both apps (register a visitor, update a resident, log a provider entry), the end-user should see consistent labels, consistent field order, consistent validation, and consistent visual language — because there is no code path by which the two apps can silently diverge on these details.

**Why this priority**: This is an outcome, not an authoring task; it is delivered automatically if Stories 1-3 are delivered well. It is listed explicitly so that success is measured in terms of end-user consistency, not only engineer convenience.

**Independent Test**: Walk a test script (for example, registering the same visitor) on both the web portal and the desktop booth side by side. Labels, required fields, error messages, and flow order match on both sides.

**Acceptance Scenarios**:

1. **Given** the same workflow exists in both apps, **When** a user performs the workflow in each app, **Then** they encounter the same labels, the same required fields, and the same validation messages.
2. **Given** a translation is added or changed, **When** the apps are released, **Then** the change is visible in both apps without a per-app release step.

---

### Edge Cases

- **Next.js-only APIs**: Shared code cannot depend on Next.js-specific features (`"use client"` directive behavior, `next/navigation`, `next/link`, RSC server components). The host app is responsible for any routing or server-rendered wrapping; the shared module must be renderable in both a Next.js client component and a Vite-rendered React tree.
- **Vite / Electron-only APIs**: Shared code cannot depend on Electron IPC, `window.electron`, or any Node.js-in-renderer primitives. Offline writes, local SQLite, and outbox behavior must be supplied to the shared module through an abstraction owned by the host app, honoring Constitution Principle IV.
- **i18n library difference**: Web uses `next-intl` (`useTranslations`) and desktop uses `react-i18next` (`useTranslation`). Shared code cannot call either directly, or else one app will not build. Translations must be sourced through an abstraction that each app wires up at its own root. The shared `@ramcar/i18n` message catalog already exists and should be the single source of truth for strings.
- **Routing**: The app shell (layout, navigation, route mapping) is fundamentally different between Next.js App Router and the Electron renderer's `page-router.tsx`. Shared modules must not own routing — they own feature bodies, and each app continues to own route wiring.
- **SSR vs. client-only**: Web can render on the server; desktop renders only on the client. Shared feature bodies must be safe to render on the client; they are not expected to be server components.
- **Role-based visibility**: Constitution Principle VI (RBAC) requires that role-based UI hiding decisions remain the host app's responsibility where roles differ (e.g., admin-only actions in the web portal that do not apply to the booth). Shared modules must support hiding or injecting role-gated UI.
- **Feature exists in only one app**: The desktop app has `dashboard`, `account`, `patrols`, `access-log`, `auth` features that have no counterpart in `apps/web` (or vice versa — `users` is web-only). These must explicitly remain app-local; the feature is not trying to force unification where none exists.
- **Divergence in form persistence / offline behavior**: Web uses `useFormPersistence` to recover in-progress drafts after a browser reload — a browser-specific concern that does not apply to the desktop renderer. Desktop uses the outbox/SyncEngine for offline writes — a booth-specific concern that does not apply to the web portal. Both are legitimate platform-specific extensions, not drift, and the shared form must expose lifecycle hooks / injectable state so each host app supplies the right behavior without the shared module owning either.
- **Testing**: A shared feature should be testable against both a web-style harness and a desktop-style harness, so a passing test is evidence that both apps are protected, not only one.
- **Package boundaries (Constitution Principle III)**: The approach must not let `features/A` import from `features/B` indirectly through shared code. Shared feature modules live in a **new dedicated workspace package** (working name `@ramcar/features`), sibling to `@ramcar/ui`, `@ramcar/shared`, `@ramcar/store`, and `@ramcar/i18n` — not inside either app, and NOT folded into `@ramcar/ui` (which stays domain-agnostic primitives).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a location (a workspace package or packages) where feature-level UI, interaction logic, and data-fetching logic shared between the web portal and the desktop booth can live in exactly one copy.
- **FR-002**: Platform engineers MUST be able to import a shared feature module from both `apps/web` and `apps/desktop` and have it render and behave identically in both apps for the flows that are meant to be identical.
- **FR-003**: A shared feature module MUST NOT depend directly on Next.js-specific APIs, Electron-specific APIs, or Node.js-in-renderer APIs.
- **FR-004**: A shared feature module MUST obtain user-facing strings through an abstraction that does not commit it to either `next-intl` or `react-i18next`; each host app supplies the concrete implementation at its own root.
- **FR-005**: User-facing strings used by a shared feature module MUST be defined in exactly one message catalog (reusing or extending `@ramcar/i18n`) and MUST NOT be duplicated in each app's locale files.
- **FR-006**: A shared feature module MUST obtain its data-fetching and mutation transport from an abstraction supplied by the host app, so that the web app can use online HTTP calls and the desktop app can use its offline-aware outbox/sync mechanism without the shared module hardcoding either.
- **FR-007**: A shared feature module MUST expose documented extension points for platform-specific UI (e.g., offline/sync badges on desktop, admin-only actions on web) so that genuine divergence can be expressed without duplicating the entire feature. The concrete mechanism is **typed slot props** — optional `ReactNode` props at well-known positions (e.g., `topRightSlot`, `trailingAction`, `afterFields`, `emptyState`). Each shared component MUST document its allowed slot names in TSDoc. Slot props are reserved for UI injection only; cross-cutting concerns (i18n, data transport, role/tenant context) MUST continue to flow through React context / adapter hooks per FR-004 / FR-006.
- **FR-008**: A shared feature module MUST NOT own app-level concerns: routing, layout/shell, authentication bootstrap, and Zustand store provider wiring remain each app's responsibility. Feature-scoped client state for a migrated feature (e.g., sidebar open/close, selected row, active tab) MUST be defined as a slice in `@ramcar/store` (e.g., `visitorsSlice`) and consumed by the shared feature module via the canonical `useStore(selectSlice)` hook pattern. `@ramcar/features` MUST NOT create its own Zustand store — it depends on `@ramcar/store` for slice definitions.
- **FR-009**: Existing duplicated features (visitors, residents, providers, and the duplicated items under each app's `src/shared/` — `vehicle-form`, `image-capture`, `visit-person-status-select`, `resident-select`, `language-switcher`) MUST be migratable to the shared approach incrementally, one feature at a time, without breaking either app.
- **FR-010**: A pilot migration MUST be performed on a single feature (recommended: `visitors`, because the user explicitly named it) and validated in both apps before the remaining features are migrated.
- **FR-011**: The shared approach MUST honor the existing Constitution:
  - Principle II (Feature-Based Architecture) — shared modules are vertical slices, not generic UI primitives
  - Principle III (Strict Import Boundaries) — no feature-to-feature imports leak through the shared layer
  - Principle IV (Offline-First Desktop) — shared mutations are transport-agnostic
  - Principle V (Shared Validation via Zod) — validation continues to live in `@ramcar/shared`; shared feature forms reuse those schemas
  - Principle VI (Role-Based Access Control) — role-gated UI is injectable by the host app
  - Principle VIII (API-First Data Access) — shared hooks call the NestJS API; no shared code queries Supabase tables directly
- **FR-012**: When a feature or component is being duplicated across the two apps for a feature that has already been migrated to the shared package, the system MUST surface this to the author or reviewer before the duplication is merged, so the team does not unintentionally rebuild the pre-migration problem. The concrete mechanism is a **CI check driven by a shared-features manifest** (e.g., `shared-features.json` at the workspace root) that fails the pull-request build when `apps/web/src/features/<X>/` or `apps/desktop/src/features/<X>/` introduces components or hooks for any feature `X` listed in the manifest. The manifest is updated as each feature migrates (see FR-009 / FR-010).
- **FR-013**: Features that exist in only one of the two apps today (e.g., `dashboard`, `account`, `patrols`, `access-log` on desktop; `users` on web) MUST remain explicitly app-local; the feature does not attempt to force unification where none is intended.
- **FR-014**: The solution MUST NOT introduce a new i18n library. It MUST work with the two already in use (`next-intl` in web, `react-i18next` in desktop) through an abstraction.
- **FR-015**: The solution MUST NOT require either app to switch bundler, framework, or runtime (Next.js stays in web, Vite/Electron stays in desktop).

### Key Entities

This feature does not introduce new data entities. It affects how existing entities (visitors, residents, providers, visit-person images, vehicles, access events) are presented and manipulated, not what they are.

### Data Access Architecture

This feature does not introduce new API endpoints or change the data flow. It preserves the existing architecture: `TanStack Query → NestJS API → Repository → Supabase/Postgres`. The shared hooks this spec calls for are a relocation of existing TanStack Query hooks from each app's `features/` to a shared workspace package — not new data paths.

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|--------------|-------------|-------------|--------------|
| List visit-persons (pilot) | `GET /api/visit-persons` (existing) | GET | — | `VisitPerson[]` (existing) |
| Create visit-person (pilot) | `POST /api/visit-persons` (existing) | POST | `CreateVisitPersonSchema` (existing, in `@ramcar/shared`) | `VisitPerson` (existing) |
| Update visit-person (pilot) | `PATCH /api/visit-persons/:id` (existing) | PATCH | `UpdateVisitPersonSchema` (existing) | `VisitPerson` (existing) |
| Upload visit-person image (pilot) | `POST /api/visit-persons/:id/images` (existing) | POST | multipart (existing) | `VisitPersonImage` (existing) |
| List access events for a visit-person (pilot) | `GET /api/visit-persons/:id/access-events` (existing) | GET | — | `AccessEvent[]` (existing) |
| Create access event (pilot) | `POST /api/access-events` (existing) | POST | `CreateAccessEventSchema` (existing) | `AccessEvent` (existing) |

**Frontend data flow (unchanged)**: TanStack Query → NestJS API → Repository → Supabase/Postgres
**Allowed frontend Supabase usage (unchanged)**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only.
**Desktop offline path (unchanged at the contract level)**: Writes continue to route through the Outbox / SyncEngine; the shared hook exposes the write operation, the desktop host wires it to the outbox, the web host wires it to direct HTTP.

## Resolved Clarifications

The following choices were confirmed with the user before planning and are now baked into the spec.

- **Divergence tolerance (Q1 → B, "shared core with explicit platform extensions")**: The two apps share the core of any bi-app feature. Genuine platform differences — offline-sync indicator and outbox-backed writes on desktop, `useFormPersistence` browser-reload recovery on web, admin-only actions on web, etc. — are expressed through documented extension points (props, slots, adapter hooks), not by forking the feature. The user explicitly noted that `useFormPersistence` is web-only on purpose: it guards against data loss when the browser reloads mid-capture, which is not a risk for the desktop renderer.
- **Scope of first delivery (Q2 → A, "all three layers together in the pilot")**: The pilot feature (`visitors`) moves all three layers to the shared workspace package in one pass: (1) primitives currently in each app's `src/shared/components/` (`vehicle-form`, `image-capture`, `visit-person-status-select`, `resident-select`), (2) feature-level UI components (visit-person form, sidebar, table, edit form, image section, status badge, recent-events list, etc.), and (3) TanStack Query hooks for the NestJS API (`use-visit-persons`, `use-create-visit-person`, `use-upload-visit-person-image`, `use-update-visit-person`, `use-visit-person-images`, `use-visit-person-vehicles`, `use-recent-visit-person-events`, `use-create-access-event`, `use-update-access-event`, `use-keyboard-navigation` where common). Incremental migration still applies across features (residents and providers follow after visitors has landed), but within a single feature's migration, all three layers move together.

## Assumptions

Where the user's prompt did not specify, the spec assumes the following. These are explicit so the reader can challenge them before planning.

- **Scope is limited to `apps/web` and `apps/desktop`.** `apps/www` (marketing landing) is not part of this initiative; the mobile app lives in a separate repository and is not affected.
- **The NestJS API is unchanged by this feature.** Shared hooks call the existing endpoints. No new endpoints, no DTO changes, no migrations.
- **`@ramcar/shared` (Zod validators), `@ramcar/ui` (shadcn primitives), `@ramcar/store` (Zustand), and `@ramcar/i18n` (messages) already exist and are the natural homes for, respectively: validation schemas, primitive UI, client state, and message catalogs.** This initiative does not replace any of them; it adds a **new dedicated sibling workspace package** (working name `@ramcar/features` — final name is a `/speckit.plan` detail) that hosts shared feature-level modules (vertical slices). The new package depends unidirectionally on `@ramcar/ui` (primitives), `@ramcar/shared` (Zod schemas + types), `@ramcar/i18n` (message catalogs), and `@ramcar/store` (Zustand slice definitions for feature-scoped client state). `@ramcar/ui` is explicitly NOT extended to host feature slices, so it remains a domain-agnostic primitives library that can be reused outside these two apps in the future (e.g., mobile, internal tools). `@ramcar/store` MAY be extended with feature-scoped slices (e.g., `visitorsSlice`) as each feature migrates.
- **Desktop-specific constraints (offline-first, outbox/SyncEngine) remain in the desktop app.** Shared mutation hooks accept a transport; the desktop app supplies an outbox-aware transport, the web app supplies a direct HTTP transport.
- **Routing remains each app's responsibility.** Next.js App Router continues to own `apps/web` pages; `page-router.tsx` continues to own `apps/desktop` pages. Shared modules are imported into each app's pages, not the other way around.
- **No feature will be unified against the user's product intent.** If a feature is deliberately different between admin portal and guard booth (different fields visible, different actions allowed), that difference is preserved through the extension points, not erased.
- **Migration is incremental.** The remaining duplicated features (residents, providers) do not need to be migrated in the same PR as the pilot. The pilot exists to prove the pattern; the rest can follow at the team's pace.
- **Framework migrations are out of scope.** The solution does not propose moving desktop off Vite, switching either app's i18n library, or consolidating path-alias conventions through a framework change. Any convergence on aliases/conventions is a byproduct, not the goal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Adding a new field to a shared feature (for example, a new field to the visitor-create form) requires exactly one code change, in one workspace package, and results in the field appearing in both apps on the next build — measured by the size of the diff required to ship such a change (one file set, not two).
- **SC-002**: At least one existing duplicated feature (pilot candidate: `visitors`) has its components, hooks, and user-facing strings migrated out of both `apps/web/src/features/visitors/` and `apps/desktop/src/features/visitors/` and into a shared workspace package, with both apps continuing to function.
- **SC-003**: After the pilot migration, the net lines of code in the pilot feature (summed across `apps/web` and `apps/desktop`) are reduced by at least 40% compared to the pre-migration baseline — measured by line count of the feature directories plus the shared package's corresponding slice.
- **SC-004**: Strings that appear in both apps' pilot flows are defined in exactly one place. Verified by auditing the locale files and confirming no duplicated translation keys across web and desktop for the pilot feature.
- **SC-005**: A behavior change in the pilot feature (for example, changing a validation rule or a label) is shipped to both apps by changing exactly one file. Verified by making such a change and confirming both apps reflect it without any per-app edit.
- **SC-006**: Platform-specific requirements continue to hold after the migration: the desktop app still performs offline writes via the outbox; the web app still performs form-persistence-backed draft recovery (or both apps adopt the same persistence policy, per Q1). Verified by running the offline-create and draft-recovery acceptance tests for the pilot feature in each app.
- **SC-007**: A duplicated component introduced into either `apps/web/src/features/<X>/` or `apps/desktop/src/features/<X>/` for a feature `X` listed in the shared-features manifest is flagged before merge — verified by deliberately opening such a PR and confirming the CI check fails loudly with an actionable error message pointing at the offending path.
- **SC-008**: The pilot migration ships without a user-visible regression in either app, verified against the existing acceptance scenarios for the pilot feature (create, edit, upload image, log access event, and — on desktop — offline create).
