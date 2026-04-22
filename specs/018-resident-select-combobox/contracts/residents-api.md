# API Contracts — Residents endpoints consumed by the picker

**Feature**: `018-resident-select-combobox`

All endpoints are guarded by `JwtAuthGuard`, `TenantGuard`, and `RolesGuard` with `@Roles("super_admin", "admin", "guard")`. The picker is used from guard-booth and admin flows; residents themselves do not use this picker.

---

## 1. `GET /residents` (EXISTING — reused unchanged)

List residents scoped to the caller's tenant. Used for the initial browse list and every debounced search request.

### Request

Query parameters (`residentFiltersSchema` from `apps/api/src/modules/residents/dto/resident-filters.dto.ts` — **do not edit**):

| Param | Type | Default | Picker's value |
|---|---|---|---|
| `search` | `string` (optional) | — | The debounced user input; omitted when empty |
| `status` | `"active" \| "inactive"` (optional) | `"active"` | `"active"` |
| `page` | `number` (optional) | `1` | `1` (picker does not paginate; US2 relies on server-side search, not on scrolling pages) |
| `pageSize` | `number` (optional, max 100) | — | `50` |
| `sortBy` | `string` (optional) | `"full_name"` | `"full_name"` |
| `sortOrder` | `"asc" \| "desc"` (optional) | `"asc"` | `"asc"` |

`tenantId` is NEVER sent by the client; the server extracts it from the JWT via `TenantGuard`.

### Response

`PaginatedResponse<ExtendedUserProfile>`:

```ts
{
  data: ExtendedUserProfile[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
```

### Server-side match semantics (authoritative for US2)

When `search` is present, the repository issues:

```
or(full_name.ilike.%SEARCH%, email.ilike.%SEARCH%, username.ilike.%SEARCH%, phone.ilike.%SEARCH%, role.ilike.%SEARCH%)
```

Result: a resident whose `full_name` is `"Zacarías Ortega"` is returned when `search=zaca`, even if they were not in the initial `page=1&pageSize=50` response. **`address` is NOT searched.** The picker MUST NOT show hint text implying otherwise.

### Errors

- `401 Unauthorized` — missing/invalid JWT. Picker surfaces the localized `residents.select.error` string.
- `403 Forbidden` — role not permitted. Same UI treatment; the picker does not attempt to distinguish.
- `5xx` — same UI treatment; React Query `retry: false` in the feature package's harness; app-level query client may choose to retry once.

---

## 2. `GET /residents/:id` (**NEW** — added by this feature)

Returns one resident by id, scoped to the caller's tenant. Used only for FR-008 (resolving a saved `value` that is not present in the current list page).

### Request

Path params:

| Param | Type |
|---|---|
| `id` | `string` (uuid) |

No query parameters. No body.

### Response

`ExtendedUserProfile`:

```ts
{
  id: string;
  fullName: string;
  email: string;
  address: string | null;
  status: "active" | "inactive";
  // …remaining ExtendedUserProfile fields, unchanged from the list response
}
```

The resolver MUST return inactive residents as well — a deactivated resident may still be the saved selection on a previously-created visit/provider record, and the picker must render their name instead of a blank trigger.

### Errors

- `401 Unauthorized` / `403 Forbidden` — same treatment as list.
- `404 Not Found` — the id does not exist, or exists in a different tenant. The picker's resolver query surfaces this as a "no resolved name" state; the trigger falls back to the localized placeholder. Crucially, this MUST NOT block submission of the parent form (the saved `value` remains in the form's state; the picker just can't give it a pretty label).

### Implementation note (for reviewers, not part of the public contract)

Implementation in `apps/api/src/modules/residents/`:

- Add a new `@Get(":id")` handler on `ResidentsController` that delegates to a new `ResidentsService.getById(id, tenantId)` method.
- `ResidentsService.getById` calls `UsersService.getById(id, actorUser, tenantId)`, which already:
  - looks up the profile by id via `UsersRepository.getById`,
  - enforces tenant scoping via the `@CurrentTenant()` decorator and the users service's existing checks,
  - returns an `ExtendedUserProfile` shape.
- The new handler MUST additionally assert the fetched profile's `role === "resident"` before returning; if not, respond `404` (do not leak the existence of non-resident users through this path).

---

## 3. Out of scope for this contract file

- **No changes** to `residentFiltersSchema`.
- **No changes** to `UsersRepository.list` or its search filter. Adding `address` to the server-side `or(...)` filter is explicitly deferred per the spec clarification.
- **No new endpoint** for batch id resolution. A future `ids` filter is noted in research R1 as a rejected alternative; if a later feature needs batch resolution, it can extend `GET /residents` at that time.
