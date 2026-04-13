# Data Model: Edit Visitor/Service Provider Records & Read-Only Access Events

**Feature**: `012-visit-person-edit`
**Date**: 2026-04-13

This feature introduces **no new entities and no schema migrations**. It modifies the behavioral contract of three existing entities carried over from spec 011.

---

## Touched Entities

### 1. `visit_persons`

The existing table introduced in spec 011. No column changes.

| Column              | Type                                   | Editable via new flow? | Notes |
|---------------------|----------------------------------------|------------------------|-------|
| `id`                | `uuid` (PK)                            | ❌ — immutable         | Identifier |
| `tenant_id`         | `uuid`                                 | ❌ — immutable         | Tenant isolation anchor |
| `code`              | `text` (trigger-generated, e.g., `VIS-00001`) | ❌ — immutable | Auto-generated on insert |
| `type`              | `visit_person_type` enum               | ❌ — immutable         | `visitor` \| `service_provider`; changing type would invalidate the code prefix |
| `full_name`         | `text` (1..255)                        | ✅                     | Required, non-empty |
| `status`            | `visit_person_status` enum             | ✅                     | `allowed` \| `flagged` \| `denied` |
| `phone`             | `text` (0..30)                         | ✅ (providers only UI) | Optional |
| `company`           | `text` (0..255)                        | ✅ (providers only UI) | Optional |
| `resident_id`       | `uuid` FK → `profiles(id)` nullable    | ✅                     | Visitors: usually set; providers: optional |
| `notes`             | `text`                                 | ✅                     | Optional |
| `created_at`        | `timestamptz`                          | ❌ — immutable         | System-managed |
| `updated_at`        | `timestamptz`                          | ❌ — system-managed    | Bumped on every update |
| `created_by`        | `uuid`                                 | ❌ — immutable         | Historical audit |

**Editable field set for this feature**: `full_name`, `status`, `resident_id`, `notes`, `phone`, `company`. Visitors never surface `phone`/`company` in the edit form; providers surface all six.

**Validation rules** (reuse `updateVisitPersonSchema` from `@ramcar/shared`):

- `fullName`: `string.min(1).max(255)`, optional in PATCH but required if present (the frontend always sends it).
- `status`: one of `allowed` \| `flagged` \| `denied`.
- `phone`: `string.max(30)` or empty.
- `company`: `string.max(255)` or empty.
- `residentId`: `uuid` or `null` (null clears the relationship; currently the UI does not expose clearing — always requires a selection for visitors).
- `notes`: `string` or empty.

**State transitions** (status):

```text
allowed ⇄ flagged ⇄ denied
```

All transitions allowed for any `guard`, `admin`, or `super_admin` (matches spec 011 FR-017). No additional gates introduced by this feature.

**Relationships** (unchanged):

- Many `visit_person_images` per visit person.
- Many `vehicles` per visit person (via `vehicles.visit_person_id`).
- Many `access_events` per visit person (via `access_events.visit_person_id`).

---

### 2. `visit_person_images`

No column changes. The existing CRUD surface is unchanged — this feature adds the edit sidebar as an additional **entry point** to the existing image-management operations.

| Operation | Allowed from edit sidebar? | Notes |
|-----------|----------------------------|-------|
| List images for a person | ✅ | Reuses existing `useVisitPersonImages` query |
| Upload new image (type not yet present) | ✅ | Reuses existing `useUploadVisitPersonImage` mutation |
| Replace image (upload with type already present) | ✅ | Server-side overwrite (spec 011 FR-025) |
| Standalone delete | ❌ | Not exposed in UI, consistent with spec 011 FR-025 |

---

### 3. `access_events`

No column changes. The behavioral change is that this entity becomes **immutable from any client** as of this feature.

| Operation               | Before this feature       | After this feature |
|-------------------------|---------------------------|--------------------|
| Create                  | Allowed (web, desktop)    | Unchanged — allowed |
| Read / list / recent    | Allowed                   | Unchanged — allowed |
| **Update**              | Allowed via PATCH :id     | **Removed from the API, hooks, UI, and shared schemas** |
| Delete                  | Not exposed               | Unchanged — not exposed |

No DB-level immutability trigger is introduced. Immutability is enforced by removing all client paths. A future `access_events` audit trigger for defense-in-depth is out of scope.

---

## Derived client types

No new TypeScript types. Existing:

- `VisitPerson` (from `packages/shared/src/types/visit-person.ts`) — untouched.
- `UpdateVisitPersonInput` (inferred from `updateVisitPersonSchema`) — untouched.
- `UpdateAccessEventInput` — **removed** as part of this feature.
