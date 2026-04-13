# Data Model: Visitor & Service Provider Access Logging

**Feature**: 011-visitor-provider-access  
**Date**: 2026-04-10

## Entities

### 1. VisitPerson (NEW)

Master registry of non-resident persons who enter the community.

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | UUID | yes | auto-generated | PK |
| tenant_id | UUID | yes | - | FK → tenants(id), tenant isolation |
| code | VARCHAR(20) | yes | auto-generated trigger | Unique per (tenant_id, code). Prefix: VIS-XXXXX (visitor), PRV-XXXXX (service_provider) |
| type | VARCHAR(20) | yes | - | `visitor` or `service_provider` |
| status | VARCHAR(20) | yes | `allowed` | `allowed`, `flagged`, `denied` |
| full_name | VARCHAR(255) | yes | - | - |
| phone | VARCHAR(30) | no | null | Common for providers, optional for visitors |
| company | VARCHAR(255) | no | null | Only meaningful for service_provider type |
| resident_id | UUID | no | null | FK → profiles(id). Required for visitors, optional for providers |
| notes | TEXT | no | null | Free text |
| registered_by | UUID | yes | - | FK → profiles(id). Guard who created record |
| created_at | TIMESTAMPTZ | yes | now() | - |
| updated_at | TIMESTAMPTZ | yes | now() | Auto-updated via trigger |

**Indexes**:
- `(tenant_id, type)` — filter by person type
- `(tenant_id, full_name)` — name search
- `(resident_id)` WHERE resident_id IS NOT NULL — lookup by visited resident

**RLS policies**: Tenant-scoped read/write for super_admin, admin, guard roles.

**Code auto-generation trigger**: `generate_visit_person_code()` — sequences per (tenant_id, type).

---

### 2. VisitPersonImage (NEW)

Photo references captured during person registration. Actual files in Supabase Storage (private bucket).

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | UUID | yes | auto-generated | PK |
| tenant_id | UUID | yes | - | FK → tenants(id) |
| visit_person_id | UUID | yes | - | FK → visit_persons(id) ON DELETE CASCADE |
| image_type | VARCHAR(20) | yes | - | `face`, `id_card`, `vehicle_plate`, `other` |
| storage_path | VARCHAR(500) | yes | - | Supabase Storage path |
| created_at | TIMESTAMPTZ | yes | now() | - |

**Indexes**:
- `(visit_person_id)` — list images for a person

**Storage path convention**: `{tenant_id}/visit-persons/{visit_person_id}/{image_type}_{timestamp}.jpg`

**Replacement logic**: To replace an image of the same type, delete the existing record + storage file, then insert new one. This is a single API operation (replace), not two separate calls from the frontend.

---

### 3. Vehicle (EXTENDED)

Existing table. Changes: `visit_person_id` column gets a proper FK now that `visit_persons` exists.

| Field (new/changed) | Type | Notes |
|---------------------|------|-------|
| visit_person_id | UUID | FK → visit_persons(id). Already exists as a bare column (no FK). Migration adds the FK constraint. |

**Owner constraint update**: Replace the relaxed `chk_vehicle_owner` constraint with the strict dual-ownership check:
```
(user_id IS NOT NULL AND visit_person_id IS NULL) OR
(user_id IS NULL AND visit_person_id IS NOT NULL)
```

---

### 4. AccessEvent (EXTENDED)

Existing table. Changes: `visit_person_id` column gets a proper FK now that `visit_persons` exists.

| Field (new/changed) | Type | Notes |
|---------------------|------|-------|
| visit_person_id | UUID | FK → visit_persons(id). Already exists as bare column. Migration adds FK. |

**Person constraint**: Already has `chk_access_person` enforcing mutual exclusion based on `person_type`. No change needed — the constraint already references `visit_person_id`.

**New capability**: `PATCH` support for updating existing access events (direction, access_mode, vehicle_id, notes). Requires new UPDATE RLS policy.

---

## Relationships

```
tenants
  │
  ├── visit_persons (1:N via tenant_id)
  │     ├── vehicles (1:N via visit_person_id)
  │     ├── visit_person_images (1:N via visit_person_id, CASCADE delete)
  │     └── access_events (1:N via visit_person_id)
  │
  ├── profiles (users)
  │     ├── vehicles (1:N via user_id)  [existing]
  │     ├── access_events (1:N via user_id)  [existing]
  │     └── visit_persons.resident_id (N:1)  [visitor visits resident]
  │     └── visit_persons.registered_by (N:1)  [guard who registered]
  │
  └── access_events
        └── vehicles (N:1 via vehicle_id)
```

## State Transitions

### VisitPerson.status

```
  ┌──────���──┐     ┌─────────┐     ┌────────┐
  │ allowed │ ←──→ │ flagged │ ←──→ │ denied │
  └─────────┘     └─────────┘     └────────┘
       ↑                                ↑
       └────────────────────────────────┘

Any role (guard/admin/super_admin) can transition between any states.
No approval workflow — immediate effect.
```

### AccessEvent lifecycle

Access events are primarily append-only. The new PATCH support allows updating `direction`, `access_mode`, `vehicle_id`, and `notes` only. The `person_type`, `visit_person_id`/`user_id`, `registered_by`, and `created_at` fields are immutable after creation.

## Shared TypeScript Types (new in @ramcar/shared)

### VisitPerson

```typescript
interface VisitPerson {
  id: string;
  tenantId: string;
  code: string;
  type: 'visitor' | 'service_provider';
  status: 'allowed' | 'flagged' | 'denied';
  fullName: string;
  phone: string | null;
  company: string | null;
  residentId: string | null;
  notes: string | null;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### VisitPersonImage

```typescript
interface VisitPersonImage {
  id: string;
  tenantId: string;
  visitPersonId: string;
  imageType: 'face' | 'id_card' | 'vehicle_plate' | 'other';
  storagePath: string;
  signedUrl?: string;  // Generated by API, not stored in DB
  createdAt: string;
}
```

### Vehicle (extended)

```typescript
interface Vehicle {
  id: string;
  tenantId: string;
  userId: string | null;       // was: string (now nullable)
  visitPersonId: string | null; // new field
  vehicleType: VehicleType;
  brand: string | null;
  model: string | null;
  plate: string | null;
  color: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### AccessEvent (extended — visitPersonId already exists in type, ensure consistency)

No changes to the existing type — it already has `visitPersonId: string | null`.

## Zod Validators (new/modified in @ramcar/shared)

### createVisitPersonSchema (NEW)

```
{
  type: enum('visitor', 'service_provider'),
  fullName: string, max(255), required,
  status: enum('allowed', 'flagged', 'denied'), default 'allowed',
  phone: string, max(30), optional,
  company: string, max(255), optional,
  residentId: uuid, optional,
  notes: string, optional,
}
```

Refinement: If `type === 'visitor'`, `residentId` should be encouraged but not strictly required (guard may not know which resident yet).

### visitPersonFiltersSchema (NEW)

```
{
  type: enum('visitor', 'service_provider'), optional,
  search: string, optional,
  status: enum('allowed', 'flagged', 'denied'), optional,
  sortBy: enum('full_name', 'code', 'created_at'), default 'full_name',
  sortOrder: enum('asc', 'desc'), default 'asc',
  page: number, min(1), default 1,
  pageSize: number, min(1), max(100), default 20,
}
```

### createVehicleSchema (MODIFIED)

Change from flat schema with required `userId` to discriminated union supporting both user and visit person ownership:

```
ownerType: 'user' → userId required
ownerType: 'visitPerson' → visitPersonId required
+ shared vehicle fields (vehicleType, brand, model, plate, color, notes)
```

### createAccessEventSchema (MODIFIED)

Extend existing schema to support `visitPersonId`:
- When personType = 'resident': `userId` required, `visitPersonId` absent
- When personType = 'visitor' | 'service_provider': `visitPersonId` required, `userId` absent

### updateAccessEventSchema (NEW)

```
{
  direction: enum('entry', 'exit'), optional,
  accessMode: enum('vehicle', 'pedestrian'), optional,
  vehicleId: uuid, optional (nullable),
  notes: string, optional,
}
```

Refinement: If `accessMode` changes to 'vehicle', `vehicleId` becomes required. If changes to 'pedestrian', `vehicleId` is cleared.
