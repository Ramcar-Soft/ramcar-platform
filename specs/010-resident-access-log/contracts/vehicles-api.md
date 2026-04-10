# API Contract: Vehicles

**Base path**: `/api/vehicles`  
**Guards**: JwtAuthGuard, TenantGuard, RolesGuard  
**Allowed roles**: guard, admin, super_admin

---

## POST /api/vehicles

Create a new vehicle and associate it with a resident user.

**Request Body** (CreateVehicleDto):

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| userId | UUID | Yes | Must reference an existing user in the same tenant | Resident owner |
| vehicleType | string | Yes | Enum: car, motorcycle, pickup_truck, truck, bicycle, scooter, other | Vehicle type |
| brand | string | No | Max 100 chars | Vehicle brand/make |
| model | string | No | Max 100 chars | Vehicle model/line |
| plate | string | No | Max 20 chars | License plate number |
| color | string | No | Max 50 chars | Vehicle color |
| notes | string | No | - | Free-text observations |

**Validation** (Zod schema — `createVehicleSchema` from `@ramcar/shared`):
- `userId` must be a valid UUID
- `vehicleType` must be one of the allowed enum values
- `brand`, `model`, `plate`, `color` are optional strings with max length constraints
- The referenced user must belong to the current tenant (checked at service layer)

**Response** `201 Created`:

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "userId": "uuid",
  "vehicleType": "car",
  "brand": "Toyota",
  "model": "Corolla",
  "plate": "ABC-1234",
  "color": "White",
  "notes": null,
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

**Error responses**:
- `400 Bad Request` — Validation error (missing vehicleType, invalid UUID, etc.)
- `401 Unauthorized` — Missing or invalid JWT
- `403 Forbidden` — Role not in [guard, admin, super_admin]
- `404 Not Found` — userId does not exist or belongs to a different tenant
