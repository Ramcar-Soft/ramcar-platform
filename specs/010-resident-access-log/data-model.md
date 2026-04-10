# Data Model: Resident Access Log

**Feature**: 010-resident-access-log  
**Date**: 2026-04-10  
**Source**: `database-visits-schema.md` (project design document)

## Entities

### 1. Vehicle

Represents a vehicle registered to a resident user. Reused across the platform (residents, visitors, providers).

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, auto-generated | |
| tenant_id | UUID | Yes | FK → tenants(id) | Multi-tenant isolation |
| user_id | UUID | Conditional | FK → users(id) | Set for resident-owned vehicles |
| visit_person_id | UUID | Conditional | FK → visit_persons(id) | Set for visitor/provider vehicles (future) |
| vehicle_type | VARCHAR(20) | Yes | Enum: car, motorcycle, pickup_truck, truck, bicycle, scooter, other | |
| brand | VARCHAR(100) | No | | e.g., "Toyota", "Honda" |
| model | VARCHAR(100) | No | | e.g., "Corolla", "Civic" |
| plate | VARCHAR(20) | No | | License plate number |
| color | VARCHAR(50) | No | | From predefined color catalog |
| notes | TEXT | No | | Free-text observations |
| is_blacklisted | BOOLEAN | Yes | Default: false | Blacklist flag (future) |
| blacklist_scope | VARCHAR(10) | No | Enum: local, global | Only when is_blacklisted=true |
| blacklist_reason | TEXT | No | | Only when is_blacklisted=true |
| created_at | TIMESTAMPTZ | Yes | Default: now() | |
| updated_at | TIMESTAMPTZ | Yes | Default: now() | Auto-updated via trigger |

**Constraints**:
- Exactly one owner must be set: `(user_id IS NOT NULL AND visit_person_id IS NULL) OR (user_id IS NULL AND visit_person_id IS NOT NULL)`
- For this feature, only `user_id` is used (resident vehicles). `visit_person_id` is for future visitor/provider submodules.

**Indexes**:
- `idx_vehicles_tenant` on (tenant_id)
- `idx_vehicles_user` on (user_id) WHERE user_id IS NOT NULL
- `idx_vehicles_visit_person` on (visit_person_id) WHERE visit_person_id IS NOT NULL
- `idx_vehicles_plate` on (tenant_id, plate) WHERE plate IS NOT NULL
- `idx_vehicles_blacklisted` on (tenant_id) WHERE is_blacklisted = TRUE

**Relationships**:
- Belongs to one User (via user_id) OR one VisitPerson (via visit_person_id)
- Referenced by AccessEvent (via vehicle_id)

---

### 2. Access Event

An append-only log entry recording an entry or exit through the community gate. Never updated or deleted.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, auto-generated | |
| event_id | UUID | Yes | Default: auto-generated | Idempotency key for offline sync |
| tenant_id | UUID | Yes | FK → tenants(id) | Multi-tenant isolation |
| person_type | VARCHAR(20) | Yes | Enum: visitor, service_provider, resident | "resident" for this feature |
| visit_person_id | UUID | Conditional | FK → visit_persons(id) | For visitors/providers (future) |
| user_id | UUID | Conditional | FK → users(id) | For residents |
| direction | VARCHAR(5) | Yes | Enum: entry, exit | |
| access_mode | VARCHAR(15) | Yes | Default: pedestrian. Enum: vehicle, pedestrian | |
| vehicle_id | UUID | Conditional | FK → vehicles(id) | Required when access_mode = vehicle |
| registered_by | UUID | Yes | FK → users(id) | Guard/admin who logged the event |
| notes | TEXT | No | | Free-text observations |
| evidence_urls | JSONB | Yes | Default: [] | Array of storage URLs (future) |
| source | VARCHAR(10) | Yes | Default: desktop. Enum: web, desktop, mobile | Auto-set by platform |
| created_at | TIMESTAMPTZ | Yes | Default: now() | Timestamp of the event |

**Constraints**:
- Idempotency: UNIQUE on (tenant_id, event_id)
- Person type integrity: `(person_type IN ('visitor', 'service_provider') AND visit_person_id IS NOT NULL AND user_id IS NULL) OR (person_type = 'resident' AND user_id IS NOT NULL AND visit_person_id IS NULL)`
- Vehicle requirement: `access_mode = 'pedestrian' OR (access_mode = 'vehicle' AND vehicle_id IS NOT NULL)`

**Indexes**:
- `idx_access_events_tenant_date` on (tenant_id, created_at DESC) — primary query path for logbook
- `idx_access_events_tenant_type_date` on (tenant_id, person_type, created_at DESC) — filtered by person type
- `idx_access_events_user` on (user_id) WHERE user_id IS NOT NULL — last event lookup for residents
- `idx_access_events_visit_person` on (visit_person_id) WHERE visit_person_id IS NOT NULL
- `idx_access_events_vehicle` on (vehicle_id) WHERE vehicle_id IS NOT NULL
- `idx_access_events_guard` on (registered_by)

**Relationships**:
- References one User (via user_id) when person_type = 'resident'
- References one VisitPerson (via visit_person_id) when person_type = 'visitor' or 'service_provider' (future)
- Optionally references one Vehicle (via vehicle_id)
- References one User as the recording guard (via registered_by)

---

### 3. Resident (existing entity — not a new table)

Residents are stored in the existing `profiles` table with `role = 'resident'`. No schema changes needed. The residents API endpoint filters profiles by role.

**Relevant fields for this feature**:
- id, user_id, tenant_id, full_name, email, phone, phone_type, address, status, observations

---

## State Transitions

### Access Event Lifecycle

Access events are **append-only** — they have no state transitions. Each event is created once and never modified.

```
[Created] → (immutable — no further state changes)
```

### Desktop Sync States (SyncSlice)

```
idle ──→ syncing ──→ idle     (successful sync)
  │         │
  │         └──→ error ──→ syncing (retry)
  │
  └──→ offline ──→ syncing    (connectivity restored)
```

### Vehicle Lifecycle

Vehicles are **create + read** in this feature. No update or delete operations are exposed.

```
[Created] → (available for selection in access events)
```

---

## Desktop SQLite Schema (offline cache)

### vehicles_cache

Mirrors the server `vehicles` table for offline vehicle selection.

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT (UUID) | PK |
| tenant_id | TEXT (UUID) | |
| user_id | TEXT (UUID) | |
| vehicle_type | TEXT | |
| brand | TEXT | |
| model | TEXT | |
| plate | TEXT | |
| color | TEXT | |
| notes | TEXT | |
| synced_at | TEXT (ISO 8601) | When last synced from server |

### access_events_outbox

Stores access events created offline, pending sync to server.

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT (UUID) | PK |
| event_id | TEXT (UUID) | Idempotency key sent to server |
| tenant_id | TEXT (UUID) | |
| person_type | TEXT | Always "resident" for this feature |
| user_id | TEXT (UUID) | |
| direction | TEXT | entry or exit |
| access_mode | TEXT | vehicle or pedestrian |
| vehicle_id | TEXT (UUID) | Nullable |
| registered_by | TEXT (UUID) | |
| notes | TEXT | |
| source | TEXT | Always "desktop" |
| created_at | TEXT (ISO 8601) | |
| sync_status | TEXT | pending, syncing, synced, failed |
| sync_error | TEXT | Error message if sync_status = failed |

### vehicles_outbox

Stores vehicles created offline, pending sync to server.

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT (UUID) | PK (temporary, replaced by server ID on sync) |
| tenant_id | TEXT (UUID) | |
| user_id | TEXT (UUID) | |
| vehicle_type | TEXT | |
| brand | TEXT | |
| model | TEXT | |
| plate | TEXT | |
| color | TEXT | |
| notes | TEXT | |
| created_at | TEXT (ISO 8601) | |
| sync_status | TEXT | pending, syncing, synced, failed |
| sync_error | TEXT | |
| server_id | TEXT (UUID) | Populated after successful sync |
