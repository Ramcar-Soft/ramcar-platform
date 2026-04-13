# API Contract: Vehicles Extensions

**Base path**: `/vehicles`  
**Existing endpoints**: POST / (create with userId)  
**Changes below**:

---

## POST /vehicles (MODIFIED)

Extended to support creating vehicles for visit persons.

**Request body — for resident vehicles** (existing):
```json
{
  "ownerType": "user",
  "userId": "uuid",
  "vehicleType": "car",
  "brand": "Toyota",
  "model": "Corolla",
  "plate": "ABC-1234",
  "color": "White",
  "notes": ""
}
```

**Request body — for visit person vehicles** (NEW):
```json
{
  "ownerType": "visitPerson",
  "visitPersonId": "uuid",
  "vehicleType": "motorcycle",
  "brand": "Honda",
  "model": "CB500",
  "plate": "XYZ-5678",
  "color": "Black",
  "notes": ""
}
```

**Validation**:
- `ownerType` = `user` → `userId` required, `visitPersonId` must be absent
- `ownerType` = `visitPerson` → `visitPersonId` required, `userId` must be absent
- `vehicleType` required: `car`, `motorcycle`, `pickup_truck`, `truck`, `bicycle`, `scooter`, `other`
- All other fields optional

---

## GET /vehicles (NEW — query by owner)

List vehicles by owner.

**Query parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | UUID | no | Filter by resident owner |
| visitPersonId | UUID | no | Filter by visit person owner |

**Exactly one of `userId` or `visitPersonId` must be provided.**

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "userId": null,
    "visitPersonId": "uuid",
    "vehicleType": "car",
    "brand": "Toyota",
    "model": "Corolla",
    "plate": "ABC-1234",
    "color": "White",
    "notes": null,
    "createdAt": "2026-04-10T12:00:00Z",
    "updatedAt": "2026-04-10T12:00:00Z"
  }
]
```

**Note**: The existing `GET /residents/:id/vehicles` endpoint (on ResidentsController) remains unchanged for backward compatibility. The new `GET /vehicles?visitPersonId=` endpoint handles visit person vehicle lookups.
