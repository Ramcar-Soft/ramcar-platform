# API Contract: Access Events Extensions

**Base path**: `/access-events`  
**Existing endpoints**: POST / (create), GET /recent/:userId, GET /last/:userId  
**New endpoints below**:

---

## POST /access-events (MODIFIED)

Extended to support `visitPersonId` in addition to existing `userId`.

**Request body changes**:

When `personType` is `resident` (existing behavior):
```json
{
  "personType": "resident",
  "userId": "uuid",
  "direction": "entry",
  "accessMode": "vehicle",
  "vehicleId": "uuid",
  "notes": "...",
  "source": "web",
  "eventId": "uuid"
}
```

When `personType` is `visitor` or `service_provider` (NEW):
```json
{
  "personType": "visitor",
  "visitPersonId": "uuid",
  "direction": "entry",
  "accessMode": "pedestrian",
  "notes": "...",
  "source": "desktop",
  "eventId": "uuid"
}
```

**Validation**:
- `personType` = `resident` → `userId` required, `visitPersonId` must be absent
- `personType` = `visitor` | `service_provider` → `visitPersonId` required, `userId` must be absent
- `accessMode` = `vehicle` → `vehicleId` required
- `eventId` optional (for offline sync idempotency)

---

## PATCH /access-events/:id (NEW)

Update an existing access event. Only mutable fields can be changed.

**Request body** (all optional):
```json
{
  "direction": "exit",
  "accessMode": "pedestrian",
  "vehicleId": null,
  "notes": "Corrected entry"
}
```

**Immutable fields** (cannot be changed): `personType`, `visitPersonId`, `userId`, `registeredBy`, `tenantId`, `source`, `createdAt`, `eventId`.

**Validation**:
- If `accessMode` is set to `vehicle`, `vehicleId` must be provided.
- If `accessMode` is set to `pedestrian`, `vehicleId` is cleared (set to null).

**Response** `200 OK`: Updated AccessEvent.  
**Response** `404 Not Found`: Event not found in this tenant.

---

## GET /access-events/recent-visit-person/:visitPersonId (NEW)

Get the 3 most recent access events for a visit person.

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "eventId": "uuid",
    "tenantId": "uuid",
    "personType": "visitor",
    "visitPersonId": "uuid",
    "userId": null,
    "direction": "entry",
    "accessMode": "vehicle",
    "vehicleId": "uuid",
    "registeredBy": "uuid",
    "notes": null,
    "source": "desktop",
    "createdAt": "2026-04-10T12:00:00Z"
  }
]
```
