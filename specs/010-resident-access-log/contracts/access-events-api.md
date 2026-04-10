# API Contract: Access Events

**Base path**: `/api/access-events`  
**Guards**: JwtAuthGuard, TenantGuard, RolesGuard  
**Allowed roles**: guard, admin, super_admin

---

## POST /api/access-events

Create a new access event (entry or exit log).

**Request Body** (CreateAccessEventDto):

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| personType | string | Yes | Enum: resident | "resident" for this feature (visitor, service_provider for future) |
| userId | UUID | Yes | Must reference an existing user in the same tenant | Resident being logged |
| direction | string | Yes | Enum: entry, exit | Entry or exit |
| accessMode | string | Yes | Enum: vehicle, pedestrian | Mode of access |
| vehicleId | UUID | Conditional | Required when accessMode = "vehicle" | Vehicle used for access |
| notes | string | No | - | Free-text observations |
| source | string | Yes | Enum: web, desktop, mobile | Auto-set by the calling platform |
| eventId | UUID | No | Auto-generated if not provided | Idempotency key (used by desktop offline sync) |

**Validation** (Zod schema — `createAccessEventSchema` from `@ramcar/shared`):
- `personType` must be "resident" (for this feature)
- `userId` must be a valid UUID referencing a user in the current tenant
- `direction` must be "entry" or "exit"
- `accessMode` must be "vehicle" or "pedestrian"
- `vehicleId` is required when `accessMode` is "vehicle"; must reference a vehicle belonging to the specified user
- `source` must be "web", "desktop", or "mobile"
- `eventId` is optional; if provided, it enables idempotent upsert (duplicate event_id within same tenant is silently ignored)

**Response** `201 Created`:

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "tenantId": "uuid",
  "personType": "resident",
  "userId": "uuid",
  "direction": "entry",
  "accessMode": "vehicle",
  "vehicleId": "uuid | null",
  "registeredBy": "uuid",
  "notes": null,
  "source": "web",
  "createdAt": "ISO 8601"
}
```

**Error responses**:
- `400 Bad Request` — Validation error (missing required fields, vehicleId missing when accessMode=vehicle, etc.)
- `401 Unauthorized` — Missing or invalid JWT
- `403 Forbidden` — Role not in [guard, admin, super_admin]
- `404 Not Found` — userId or vehicleId does not exist or belongs to a different tenant
- `409 Conflict` — eventId already exists for this tenant (idempotency check — silent success in practice, but documented for completeness)

---

## GET /api/access-events/last/:userId

Get the most recent access event for a specific resident user. Used to display context in the access event form (FR-021).

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| userId | UUID | Resident's profile ID |

**Response** `200 OK` (when a previous event exists):

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "tenantId": "uuid",
  "personType": "resident",
  "userId": "uuid",
  "direction": "entry",
  "accessMode": "vehicle",
  "vehicleId": "uuid | null",
  "registeredBy": "uuid",
  "notes": null,
  "source": "desktop",
  "createdAt": "ISO 8601"
}
```

**Response** `200 OK` (when no previous event exists):

```json
null
```

**Error responses**:
- `401 Unauthorized` — Missing or invalid JWT
- `403 Forbidden` — Role not in [guard, admin, super_admin]
- `404 Not Found` — userId does not exist or belongs to a different tenant
