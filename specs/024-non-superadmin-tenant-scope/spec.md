# Feature Specification: Single-Tenant UI Scope for Admins and Guards (v1)

**Feature Branch**: `024-non-superadmin-tenant-scope`
**Created**: 2026-04-29
**Status**: Draft
**Input**: User description: "Admins and Guards roles should have access only to 1 tenant initially, a super admin will create an admin user and create the tenant or allow the admin to create its own tenant, but they cannot create more than 1, this is a frontend limitation only, no API, later in the road we'll change this using permissions or subscriptions tiers, tenant selector should be visible only for super admins, only super admins should be able to access to all tenants, meaning that when capturing an admin or a guard only one tenant should be selectable. When an admin creates a tenant and saves it, the create button for more tenants should not display the sidebar form, instead display a dialog saying that it needs to contact support. When creating users (guards or residents) in the frontend it should display the tenant selector but as read only and auto selected for the current tenant. From the frontend, admins and guards should see only information about the current tenant"

## Context and Background

This feature defines the v1 product policy for tenant-scope visibility. Earlier work (spec 020 "Tenants Catalog and Multi-Tenant Access for Admin/Guard" and spec 021 "Active Tenant Scoping from the Top-Bar Selector") introduced the structural ability for an Admin or Guard to be assigned to multiple tenants and to switch between them via a top-bar selector. Spec 024 walks back that surface for v1: at the UI layer, Admins and Guards behave as single-tenant users. SuperAdmins retain the full multi-tenant experience.

This is explicitly a **frontend limitation only**. The API, the database, the JWT `tenant_ids` claim, the `user_tenants` join table, and the RLS policies introduced in spec 020 are all preserved as-is. A future feature (subscription tiers or per-account permissions) is expected to lift the UI restriction; until that future feature ships, the rules below govern what Admins and Guards see and can do in the web portal and the desktop booth app.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admins and Guards see only their current tenant; the tenant selector is hidden (Priority: P1)

An Admin or a Guard signs in to the portal (web) or the booth app (desktop). The top-bar tenant selector is **not rendered** for them — regardless of how many tenants the backend has authorized them for via `tenant_ids`. Every list, table, catalog, dashboard count, and detail view is scoped to a single tenant — the user's "current tenant" — without any switching affordance. The current tenant is determined automatically from the user's authorized set on each sign-in and stays fixed for the duration of the session.

**Why this priority**: This is the most user-visible product decision in this spec. It establishes the v1 promise: an Admin or a Guard works for one community, sees one community's data, and cannot accidentally land in another. Without it, the product loses the simplicity that motivates the constraint in the first place.

**Independent Test**: Sign in as an Admin (or a Guard) with `tenant_ids = [A]`. Open every catalog the role has access to and confirm only Tenant A's data appears. Inspect the top bar and confirm no tenant selector is rendered. Sign in as a SuperAdmin in a different browser and confirm the selector is rendered for them — proving the rule is role-scoped and not blanket-disabled.

**Acceptance Scenarios**:

1. **Given** an Admin is signed in to the web portal with one authorized tenant, **When** they open any list/catalog view (users, residents, visitors, providers, access log, blacklist, dashboard), **Then** the tenant selector is not present in the top bar and the visible records are scoped to their one tenant.
2. **Given** a Guard is signed in to the booth desktop app with one authorized tenant, **When** they perform any capture (resident search, visitor search, access event create), **Then** the tenant selector is not present and all reads/writes target their one tenant.
3. **Given** an Admin's authorized set contains two or more tenants for legacy reasons (e.g., a prior assignment that predates this spec), **When** they sign in, **Then** the system selects exactly one tenant as their "current tenant" deterministically and surfaces only that tenant's data; the selector is still not rendered.
4. **Given** an Admin or Guard is signed in, **When** they navigate between modules (residents → access log → visitors), **Then** the same current tenant remains in effect across all modules without any selector to change it.
5. **Given** a SuperAdmin is signed in (control case), **When** the top bar renders, **Then** the tenant selector IS rendered and lists all tenants in the system — confirming the hidden-for-non-SuperAdmin behavior is role-specific.

---

### User Story 2 — Admins are limited to creating one tenant; further attempts show a contact-support dialog (Priority: P1)

An Admin who needs a community for their account opens the Tenants catalog (`/catalogs/tenants`) and clicks the create button. Their first creation works exactly as defined in spec 020 — the right-side Sheet form opens, they fill name and address, and on save the new tenant is created and they are auto-assigned to it. After that creation, when the Admin clicks the create button again (now or in any future session), the system does **not** open the Sheet. Instead, it opens a Dialog that explains they have reached the limit for their account and asks them to contact support to add another community.

**Why this priority**: This is the central business rule of the v1 multi-tenant policy. It pairs with Story 1 — together they make Admin a single-tenant role at the product level. Without this gating, an Admin could create N tenants and end up in a state Story 1 cannot represent in the UI (forced to pick a "current tenant" out of many they themselves created). Has to land alongside Story 1 to be coherent.

**Independent Test**: Sign in as a brand-new Admin with zero tenants assigned. Open `/catalogs/tenants`, click Create Tenant — confirm the right-side Sheet opens. Submit a valid form — confirm the tenant is created and the Admin is assigned to it. Click Create Tenant again — confirm the Sheet does **not** open and a Dialog appears with copy directing the user to contact support. Sign in as a SuperAdmin in a separate session and confirm the create button always opens the Sheet (no gating for SuperAdmin).

**Acceptance Scenarios**:

1. **Given** an Admin is signed in and has zero tenants assigned to them, **When** they click the Tenants-catalog create button, **Then** the right-side Sheet (the existing create form from spec 020) opens normally.
2. **Given** an Admin has just successfully created their first tenant via that Sheet, **When** they next click the create button (same session, after the form closes), **Then** the create button opens the contact-support Dialog instead of the Sheet.
3. **Given** an Admin already has at least one assigned tenant from a prior session (or from SuperAdmin assignment), **When** they sign in and click the Tenants-catalog create button, **Then** the contact-support Dialog opens; the Sheet does not open at any point during that session.
4. **Given** the contact-support Dialog is open, **When** the Admin reads the message, **Then** it is a translated, plain-language statement that tells them their account does not allow creating additional communities and instructs them how to reach support; it is not a form, it does not allow them to bypass to the Sheet.
5. **Given** the contact-support Dialog is open, **When** the Admin closes it (X, Escape, click outside, or an OK/close button), **Then** the dialog dismisses cleanly and no other action is taken.
6. **Given** a SuperAdmin is signed in, **When** they click the Tenants-catalog create button at any time, **Then** the right-side Sheet always opens — the contact-support gating does not apply to the SuperAdmin role.
7. **Given** the contact-support Dialog has appeared once for an Admin, **When** they navigate away and return, **Then** the gating is re-evaluated on next click — there is no cached state that lets them bypass the Dialog.

---

### User Story 3 — User-creation form uses a single-tenant field, with the field auto-filled and locked for non-SuperAdmin creators (Priority: P2)

When any role creates or edits a user account through the Users catalog form, the tenant assignment field shows **a single tenant** — never the multi-select-with-chips combobox introduced in spec 020 user story 6. The field's behavior depends on the role of the **creator**:

- A **SuperAdmin** sees a single-select dropdown (or combobox) populated with every tenant in the system. They pick one tenant for the new user, regardless of whether the new user's role is Admin, Guard, or Resident.
- An **Admin** sees a single tenant pre-selected to their own current tenant, rendered read-only — they cannot change it. The field is still visible (so the form remains explicit about what tenant the new user will be assigned to).
- A **Guard** does not have permission to create users; this story does not change that.

This rule applies to both the create form and the edit form. It walks back the multi-select introduced in spec 020 user story 6 for v1.

**Why this priority**: Story 3 is an internal-form refinement, not the primary policy statement. Stories 1 and 2 already prevent Admins and Guards from operating across tenants; Story 3 cleans up the user-creation flow so it reflects the same rule. Important for consistency, but the system is not visibly broken without it (the multi-select would still work; it would just contradict the v1 narrative).

**Independent Test**: As a SuperAdmin, open the Users catalog create form, pick role "guard", and confirm the tenant field is a **single-select** control (not a chip-based multi-select with a primary indicator). Save a guard user with one selected tenant; verify the user is created with `profiles.tenant_id` set to that tenant and a single corresponding `user_tenants` row. As an Admin, open the Users catalog create form, and confirm (a) the tenant field renders, (b) the field is pre-selected to the Admin's current tenant, (c) the field is read-only / disabled / not editable, (d) submitting the form persists a user assigned to that one tenant.

**Acceptance Scenarios**:

1. **Given** a SuperAdmin is creating or editing a user with role "admin" or "guard", **When** the tenant field renders, **Then** it is a single-select control bound to one tenant value at a time (no chips, no multi-value array, no primary-tenant indicator).
2. **Given** a SuperAdmin is creating or editing a user with role "resident", **When** the tenant field renders, **Then** it is the single-select control already used for residents pre-spec-020.
3. **Given** an Admin is creating or editing a user (any role), **When** the form renders, **Then** the tenant field is visible, pre-selected to the Admin's current tenant, and rendered read-only (cannot be changed by interaction).
4. **Given** an Admin submits a user-creation form with the read-only tenant field, **When** the request is sent to the API, **Then** the new user is persisted with that one tenant assigned (`profiles.tenant_id` set, one `user_tenants` row inserted for non-resident roles, no other tenants in scope).
5. **Given** a SuperAdmin opens the edit form for a user that historically has multiple `user_tenants` rows (legacy data from spec 020), **When** the tenant field renders, **Then** the system displays a single tenant selection (the user's `profiles.tenant_id` / primary tenant). Changing it through this single-select control updates the user's tenant assignment to that one tenant; the legacy extra `user_tenants` rows are reconciled to that single tenant on save.
6. **Given** any creator submits the form, **When** validation runs, **Then** exactly one tenant must be present on the payload — a missing tenant fails validation with a translated message; an array of more than one tenant is not possible to construct from the new UI.

---

### User Story 4 — SuperAdmin retains the unrestricted multi-tenant experience (Priority: P3)

A SuperAdmin signs in. Nothing visible changes from spec 020 + spec 021 for them: the top-bar tenant selector is rendered with every tenant in the system, the Tenants catalog shows all tenants (and the create button always opens the Sheet without limit), every catalog and list view is filtered by the active tenant from the top bar, switching tenants asks for confirmation, etc. Story 4 exists to make explicit that v1's restrictions apply only to Admin and Guard roles and do not regress any SuperAdmin flow.

**Why this priority**: This is a "preserve existing behavior" story. It is not a new capability; it is a guard against regressions while implementing Stories 1–3. P3 because it is mostly a verification target, not a development target.

**Independent Test**: Sign in as a SuperAdmin. Confirm the top-bar tenant selector is rendered, lists all tenants, and switching works (with confirmation, per spec 021). Confirm the Tenants catalog Create button always opens the Sheet, with no contact-support dialog. Confirm cross-tenant catalog views still filter by the active tenant (per spec 021).

**Acceptance Scenarios**:

1. **Given** a SuperAdmin is signed in, **When** the app renders, **Then** every behavior previously defined in spec 020 (catalog, multi-tenant assignment, create) and spec 021 (active tenant scoping, confirmation dialog, Bitacora seed) continues to work for them, unchanged.
2. **Given** a SuperAdmin opens the Users catalog form, **When** the tenant field renders, **Then** Story 3's single-select rule applies (no multi-select), but the SuperAdmin chooses freely among all tenants — there is no read-only / auto-fill restriction.
3. **Given** a SuperAdmin opens the Tenants catalog, **When** they click Create Tenant any number of times, **Then** the Sheet always opens; no contact-support Dialog ever appears for them.

---

### Edge Cases

- **Admin or Guard with `tenant_ids` of length > 1 (legacy data)**: The system selects exactly one "current tenant" deterministically (preference order: `profiles.tenant_id` if present and still in `tenant_ids`; otherwise the first element of `tenant_ids` ordered by tenant name to be stable across reloads). The selector remains hidden. The user has no in-app way to switch among the extra tenants — they will silently appear to operate on the chosen one only. (This case is rare and is expected to be cleaned up out-of-band by SuperAdmin reassignment when discovered.)
- **Admin or Guard with `tenant_ids` empty**: The user is treated as having no current tenant. Tenant-scoped catalog views render the same no-access state already shown by spec 021 for "user with no authorized tenants"; the Tenants catalog create button still works for an Admin in this state (per Story 2 — zero tenants is the precondition for the Sheet to open).
- **Admin's first-tenant creation flow during an active session**: After the create succeeds, the JWT is refreshed (per spec 020) and `tenant_ids` now contains one tenant. The next click on the Tenants-catalog create button in the same session must already evaluate the gating against the refreshed state — that is, the contact-support Dialog appears, not the Sheet.
- **Admin who somehow has 2+ tenants attempting to create another**: The contact-support Dialog appears (the gating is "1 or more existing tenants" → Dialog). They cannot use the Sheet.
- **Admin demoted from SuperAdmin mid-session**: On next sign-in (or token refresh that reflects the demotion) the rules of Stories 1–3 apply. There is no need to react to the role change live; on the next render after the new claims arrive, the selector disappears, scoping kicks in, and the Tenants catalog gates appropriately.
- **Guard role creating a tenant**: Not possible. Guards have no Tenants-catalog access regardless of this spec — Story 2 only governs Admin behavior. (If a Guard somehow reached the catalog endpoint by URL, the existing role guards from spec 020 would deny access; Story 2 does not introduce a new path here.)
- **Resident role**: Residents already do not have a tenant selector and already see only their own records; this spec does not change anything for them. The tenant field on a Resident user-creation form follows Story 3 (single-select for SuperAdmin creators; read-only auto-filled for Admin creators).
- **Desktop booth app**: All rules in this spec apply equally to the desktop booth app. Guards on the booth see no selector and operate against their one current tenant. (Admins typically use the web portal for catalog operations, but if an Admin signs in to the desktop, the same hide-selector rule applies.)
- **Active tenant persistence (spec 021 FR-002) for Admin/Guard**: The "active tenant per device" persistence from spec 021 still exists conceptually but has no user-visible effect for Admin/Guard — there is nothing for them to switch and nothing to persist between values. Any persisted active-tenant value from before this spec is harmless; the deterministic selection rule above takes precedence on each sign-in.
- **Multi-tenant payload sent from a tampered client**: The API and DB still enforce tenant scoping (spec 020 RLS, spec 021 FR-026). A client that bypasses the read-only Admin tenant field or constructs a multi-tenant array in the user-creation payload is rejected at the API by existing checks; this spec does not weaken those checks, it only restricts what the legitimate UI offers.

## Requirements *(mandatory)*

### Functional Requirements

#### Tenant selector visibility

- **FR-001**: The top-bar tenant selector MUST be rendered only for users whose role is SuperAdmin.
- **FR-002**: The top-bar tenant selector MUST NOT be rendered for users whose role is Admin, Guard, or Resident, regardless of the size of their `tenant_ids` claim.
- **FR-003**: For Admin and Guard users, the system MUST determine a single "current tenant" deterministically on each sign-in (preference: `profiles.tenant_id` if present in `tenant_ids`; otherwise the first element of `tenant_ids` sorted by tenant name) and use that value as the active tenant for all read/write scoping during the session.
- **FR-004**: The current tenant for an Admin or Guard MUST remain stable across navigation within a session and across page reloads of that session.

#### Read/write scoping for Admin and Guard

- **FR-005**: Every list, catalog, dashboard count, and detail view rendered for an Admin or Guard MUST be scoped to the user's current tenant — no records from any other tenant may appear, including during loading states, empty states, or error states.
- **FR-006**: Every write performed by an Admin or Guard (user create/edit, resident create/edit, visitor create/edit, access event create, blacklist add, etc.) MUST be attached to the user's current tenant.
- **FR-007**: The behavior in FR-005 and FR-006 MUST hold uniformly across the web portal (`apps/web`) and the desktop booth app (`apps/desktop`).

#### Tenant-creation gating for Admin

- **FR-008**: The Tenants catalog create button MUST open the existing right-side Sheet form (per spec 020) when clicked by an Admin who currently has zero assigned tenants.
- **FR-009**: The Tenants catalog create button MUST open a contact-support Dialog (not the Sheet) when clicked by an Admin who currently has one or more assigned tenants.
- **FR-010**: The contact-support Dialog MUST display translated, plain-language copy that (a) tells the user their account does not allow creating additional communities, (b) directs them to contact support, and (c) provides a clear way to dismiss the dialog (close button, Escape, click outside).
- **FR-011**: The contact-support Dialog MUST NOT contain any form fields, action buttons, or links that allow the user to bypass the gating to reach the Sheet.
- **FR-012**: Immediately after an Admin successfully creates their first tenant, the gating in FR-009 MUST apply on the next click of the create button in the same session — the system MUST re-evaluate against the refreshed `tenant_ids` and not rely on a cached "no tenants" state.
- **FR-013**: The gating in FR-008 / FR-009 MUST NOT apply to SuperAdmin users — for SuperAdmin, the create button always opens the Sheet.

#### User-creation form (tenant field)

- **FR-014**: The Users catalog create and edit form MUST render the tenant field as a single-select control for every role (admin, guard, resident). The multi-select-with-chips control introduced in spec 020 user story 6 MUST NOT be used in v1.
- **FR-015**: When the creator/editor of the user form is a SuperAdmin, the tenant single-select MUST be populated with every tenant in the system and freely changeable.
- **FR-016**: When the creator/editor of the user form is an Admin, the tenant field MUST be pre-selected to the Admin's current tenant and rendered read-only (the Admin cannot change it via UI interaction).
- **FR-017**: A user-creation or user-edit submission with no tenant value, or with more than one tenant value, MUST fail validation with a translated, in-form error message before any network request is sent.
- **FR-018**: When a user-creation submission succeeds with the single-select tenant value, the resulting persisted user MUST have `profiles.tenant_id` set to that tenant and exactly one `user_tenants` row referencing that tenant for non-resident roles (consistent with spec 020 backend behavior).
- **FR-019**: When a user-edit submission changes the tenant value, the system MUST reconcile any historic multi-tenant `user_tenants` rows for that user to the single chosen tenant on save (only one `user_tenants` row remains for non-resident roles).

#### SuperAdmin behavior preservation

- **FR-020**: Every SuperAdmin behavior previously defined in spec 020 (Tenants catalog access, multi-tenant Admin/Guard assignment via the form per FR-014/FR-015 above, JWT `tenant_ids = "*"`) MUST continue to work without regression introduced by this spec.
- **FR-021**: Every SuperAdmin behavior previously defined in spec 021 (top-bar selector visible, switching with confirmation, Bitacora dropdown seeding from active tenant, scoped catalogs/lists by active tenant) MUST continue to work without regression introduced by this spec.

#### Cross-cutting

- **FR-022**: The API surface MUST NOT change as a result of this spec. No new endpoints, no new DTOs, no removed endpoints, no removed DTOs, no schema migrations. Existing endpoints continue to accept and enforce the multi-tenant model from spec 020.
- **FR-023**: All UI copy added or changed by this spec (the contact-support Dialog title and body; any read-only-tenant hint copy on the user form) MUST be added to `@ramcar/i18n` and consumed by both `apps/web` and `apps/desktop` through the existing i18n adapters.
- **FR-024**: The tenant-selector hiding rule in FR-001 / FR-002 and the read-only auto-fill rule in FR-016 MUST be enforced through the existing role-gating mechanisms (Zustand auth slice + role adapter); they MUST NOT be implemented by removing the underlying components or by editing the API responses.
- **FR-025**: Subsequent product work (subscription tiers, per-account permissions) is expected to lift the Admin "1 tenant max" rule and the Admin/Guard selector-hidden rule. The implementation MUST be structured so that the rule lives in one place per concern (selector visibility, tenant-create gating, user-form tenant lock) and can be replaced with a tier/permission check without re-architecting.

### Key Entities *(include if feature involves data)*

- **Current Tenant (Admin/Guard)**: The single tenant governing read and write scope for an Admin or Guard in the UI, derived deterministically from the user's `tenant_ids` and `profiles.tenant_id`. Has no separate persistence — it is computed on each sign-in and stable for the session.
- **Active Tenant (SuperAdmin)**: Unchanged from spec 021. A per-device selection persisted across reloads.
- **Tenant Membership (`user_tenants`)**: Unchanged from spec 020. Continues to support 1..N tenants per Admin/Guard at the data layer; this spec restricts only what the v1 UI allows the user to *do* with that data.

### Data Access Architecture *(mandatory for features involving data)*

This feature does not introduce new database tables, new endpoints, or new DTOs. It restricts what the v1 frontend exposes for two roles (Admin, Guard) and gates one frontend action (Admin create-tenant). Every read and write continues to flow through the existing API path.

| Operation | API Endpoint (existing) | HTTP Method | How this spec affects the call |
|-----------|-------------------------|-------------|-------------------------------|
| List tenants for an Admin in `/catalogs/tenants` | `GET /api/tenants` | GET | Unchanged (already returns the Admin's assigned tenants). The v1 UI uses the response only to decide whether the Tenants-create button opens the Sheet (count = 0) or the contact-support Dialog (count ≥ 1). |
| Create a tenant from `/catalogs/tenants` | `POST /api/tenants` | POST | Unchanged. The v1 UI decides whether to expose the Sheet that calls this endpoint based on the Admin's existing tenant count. SuperAdmins are unrestricted. |
| List users / residents / visitors / providers / access events for an Admin or Guard | existing endpoints | GET | Unchanged; the v1 UI sends the user's current tenant (computed per FR-003) as the scope, and the server enforces tenant scope independently of the client claim (spec 021 FR-026). |
| Create / edit a user from the Users catalog | `POST /api/users`, `PATCH /api/users/:id` | POST/PATCH | Unchanged DTO shape. The v1 UI sends a single tenant in the payload (FR-014) and never an array of multiple tenants. |
| Create access events / capture flows from the booth app | existing endpoints | POST | Unchanged; the v1 booth UI omits the tenant selector and attaches the Guard's current tenant per FR-006. |

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres. Frontend Supabase usage remains restricted to Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) per CLAUDE.md and Constitution Principle VIII.

**Desktop outbox**: Unchanged. Outbox writes continue to carry the Guard's current tenant from spec 021. Because Guards now have only one current tenant, the outbox tenant value is always that tenant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Admin and Guard sessions render the top bar without a tenant selector across all routes of `apps/web` and `apps/desktop`, verified by automated UI tests for both roles.
- **SC-002**: 0 Admin sessions reach the Tenants-catalog Sheet form when the Admin already has at least one assigned tenant, verified by an end-to-end test that runs a brand-new Admin through the create flow twice and asserts the second attempt opens the contact-support Dialog.
- **SC-003**: 100% of user-creation form submissions in v1 carry exactly one tenant value in the payload — measured by a representative log sample over the first 30 days post-release showing zero submissions with a multi-tenant array.
- **SC-004**: 100% of Admin-driven user-creation form submissions carry the Admin's current tenant as the only tenant value — measured by a comparison of the `creator_tenant_id` from auth context to the `tenant_id` written to `profiles` for the new user, across the same 30-day window.
- **SC-005**: 0 SuperAdmin flows regress as a result of this spec — verified by re-running the spec 020 and spec 021 SuperAdmin acceptance tests unchanged and observing them pass.
- **SC-006**: An Admin who has just created their first tenant can confirm a) the top bar still has no selector, b) the next click on Create Tenant opens the contact-support Dialog, c) the new tenant appears in their Tenants catalog list — within 30 seconds of completing the create-tenant submission, end-to-end.
- **SC-007**: Support tickets in the first quarter post-release that contain the phrase "I'm seeing data from another community" or equivalent (a known precondition for the spec) drop by ≥ 90% — confirming the v1 single-tenant promise is reaching users at the UX layer.
- **SC-008**: Future replacement of the v1 rules with a tier/permission-based check requires editing no more than three files per concern (selector visibility, tenant-create gating, user-form tenant lock) — verified by a code review of the next iteration of this policy when subscription tiers are introduced.

## Assumptions

- Spec 020 (Tenants Catalog and Multi-Tenant Access) and spec 021 (Active Tenant Scoping) are merged and shipped before this spec is implemented; this spec assumes the user_tenants join, the JWT `tenant_ids` claim, the role-aware Zustand auth slice, the top-bar tenant selector component, the Tenants-catalog Sheet form, and the existing Users-catalog form (with its current tenant field) all exist.
- The Tenants-catalog Sheet form referenced by FR-008 is the same right-side Sheet defined in spec 020; this spec does not redesign the form. The contact-support Dialog of FR-009 is a new, simple, info-only Dialog built from existing `@ramcar/ui` primitives.
- The "current tenant" determination in FR-003 is a frontend computation off the JWT claims; no backend change is needed. The same computation runs on web and desktop.
- The deterministic tiebreak in FR-003 (sort `tenant_ids` by tenant name when `profiles.tenant_id` is missing or invalid) is acceptable in practice because the case it covers — an Admin/Guard with multiple legacy tenants and no valid `profiles.tenant_id` — is rare and out-of-band cleanup is expected.
- "Contact support" copy in the Dialog is plain-language guidance; the specific contact channel (email, in-app form, phone) is decided by the implementing team and stored in `@ramcar/i18n` so it can change without a code release.
- The Users-catalog form is the only place the multi-tenant assignment UI from spec 020 user story 6 was exposed; rolling it back to single-select in v1 does not affect any other surface.
- Guards do not have access to the Tenants catalog regardless of this spec; Story 2 explicitly governs Admin behavior only.
- Residents see no change from this spec (they already have no tenant selector and are governed by their own ownership rules).
- The future feature that lifts these v1 restrictions is expected to introduce per-account tier/permission flags; the implementation of FR-001, FR-009, FR-014/016 should be a single-source-of-truth check (not scattered conditionals) so that the future feature can swap "role === SuperAdmin" or "tenants.length === 0" for "tier.allowsMultiTenantUI" or "permissions.canCreateAdditionalTenants" with minimal churn.
- No data migration is required. The constraint is purely UI-level. Any pre-existing `user_tenants` rows for an Admin/Guard with multiple assignments stay in place; the v1 UI just doesn't expose them as switchable.
