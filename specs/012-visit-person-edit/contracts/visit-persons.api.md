# API Contract: Visit Persons — Update (used by edit flow)

**Feature**: `012-visit-person-edit`
**Endpoint**: `PATCH /api/visit-persons/:id`
**Status**: Existing endpoint; contract re-ratified for this feature. No server changes required.

## Guards

Request must be authenticated and authorized:

- `JwtAuthGuard`
- `TenantGuard` (resolves `tenant_id` from JWT, sets request context)
- `RolesGuard` with `@Roles("super_admin","admin","guard")`

A `resident` cannot reach this endpoint.

## Path parameters

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` (UUID) | The `visit_persons.id` to update. Must belong to the caller's tenant. |

## Request body

Validated server-side by `updateVisitPersonSchema` from `@ramcar/shared`. All fields optional — unknown fields rejected by Zod. The frontend typically sends the full editable field set but only changed fields are strictly required.

```ts
// packages/shared/src/validators/visit-person.ts (existing — unchanged)
z.object({
  fullName:   z.string().min(1).max(255).optional(),
  status:     z.enum(["allowed","flagged","denied"]).optional(),
  phone:      z.string().max(30).optional().or(z.literal("")),
  company:    z.string().max(255).optional().or(z.literal("")),
  residentId: z.string().uuid().optional().nullable(),
  notes:      z.string().optional().or(z.literal("")),
})
```

### Example request

```http
PATCH /api/visit-persons/7a3b9e0c-4f6d-4a1e-9b5a-3b9e0c4f6d11 HTTP/1.1
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "fullName": "María González",
  "status": "allowed",
  "residentId": "f0c5a2a4-9a1b-4e6a-8c42-2a1b9a1b4e6a",
  "notes": "Frequent visitor — sister of resident"
}
```

## Response

`200 OK` with the updated `VisitPerson` row (including fresh `updated_at`).

```ts
{
  id: string;
  tenantId: string;
  code: string;            // immutable
  type: "visitor" | "service_provider";
  fullName: string;
  status: "allowed" | "flagged" | "denied";
  phone: string | null;
  company: string | null;
  residentId: string | null;
  residentName: string | null;   // joined for display convenience
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## Error responses

| Status | Condition | Body |
|--------|-----------|------|
| `400 Bad Request` | Zod validation failure | `{ message, errors: ZodIssue[] }` |
| `401 Unauthorized` | Missing / invalid JWT | `{ message: "Unauthorized" }` |
| `403 Forbidden` | `resident` role, or tenant mismatch | `{ message: "Forbidden" }` |
| `404 Not Found` | No visit person with this `id` in the caller's tenant | `{ message: "Visit person not found" }` |
| `500 Internal Server Error` | Unexpected server failure | `{ message: "Internal server error" }` |

## Side effects

- `visit_persons.updated_at` is bumped to `now()`.
- **No access event is created.** (Critical — FR-006, SC-003.)

## Client consumers

- Web: `apps/web/src/features/{visitors,providers}/hooks/use-update-visit-person.ts` (new)
- Desktop (online): same IPC path that currently wraps `PATCH /api/visit-persons/:id`
- Desktop (offline): outbox op `"visit_person.update"` with payload `{ personId, patch, eventId }`, replayed against this endpoint when connectivity returns
