# Contract — `GET /api/access-events/export` (CSV Stream)

**Feature**: `019-logbook-bitacora`
**Purpose**: CSV download of access events matching the active filter set (Export current view) or an independent date range (Export all).

## Route

```
GET /api/access-events/export
```

## Authentication / Authorisation

Identical to the list endpoint (`JwtAuthGuard + TenantGuard + RolesGuard`, method-level `@Roles("super_admin", "admin")`). Guard/Resident → 403.

## Query parameters

Validated by `accessEventExportQuerySchema` — the same fields as `accessEventListQuerySchema` minus `page` and `pageSize`:

| Param | Type | Required | Notes |
|---|---|---|---|
| `personType` | `"visitor" \| "service_provider" \| "resident"` | yes | Determines the subpage's column set and filename segment. |
| `dateFrom` | `YYYY-MM-DD` | no (defaults to today, tenant local) | Inclusive start. |
| `dateTo` | `YYYY-MM-DD` | no (defaults to today, tenant local) | Inclusive end. Must be ≥ `dateFrom`. |
| `tenantId` | uuid | no | Admin: must match JWT tenant or omit (else 403). SuperAdmin: must be in authorised set if present. |
| `residentId` | uuid | no | Same semantics as list. "Export all" modal omits this on purpose. |
| `search` | string (≤ 200) | no | "Export all" modal omits this; "Export current view" forwards it if present. |
| `locale` | `"en" \| "es"` | no (defaults `"en"`) | Selects the header row + enum cell labels from `LOGBOOK_CSV_LABELS`. |

The same tenant-scope rules as the list endpoint apply (`resolveTenantScope`, research R4).

## Response

### 200 OK

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="logbook-<subpage>-<yyyy-mm-dd>.csv"`
  - `<subpage>`: `visitors`, `providers`, `residents` (mapped from `personType`).
  - `<yyyy-mm-dd>`: Today's date in the scoped tenant's `time_zone`. For SuperAdmin "all tenants" mode (`scope.kind === "many"`), the filename uses UTC — an explicit trade-off documented here.
- `Cache-Control: no-store`
- Body: UTF-8-encoded CSV with a leading BOM (`﻿`) so Excel in Latin locales opens the file with correct accent rendering.

### CSV shape

- Line terminator: `\r\n`.
- Field quoting: any field containing `,`, `"`, `\n`, or leading/trailing whitespace is wrapped in `"..."` with embedded `"` doubled (`""`).
- Header row comes from `LOGBOOK_CSV_LABELS[locale].columns` for the appropriate subpage.
- Each data row emits the same field set visible on the on-screen table for the subpage (see `data-model.md`).

**Visitors columns** (in order):
`Code, Name, Direction, Resident visited, Vehicle, Status, Registered by, Date`
**Providers columns**:
`Code, Name, Company, Direction, Vehicle, Status, Registered by, Date`
**Residents columns**:
`Name, Unit, Direction, Mode, Vehicle, Registered by, Date`

**SuperAdmin "all tenants" mode** prepends a `Tenant` column to the start of the header + data rows. Filename is still `logbook-<subpage>-<yyyy-mm-dd>.csv` (no per-tenant splitting).

### Error bodies

Identical error statuses to the list endpoint (400 / 401 / 403 / 500). Note: an error body is JSON, which means the client must test for `response.headers["content-type"]` starting with `text/csv` before assuming a blob download. The frontend download helper (`apiClient.download`) does exactly this.

## Streaming behaviour

- The handler returns a `StreamableFile` whose underlying stream is produced by `AccessEventsService.exportCsv(filters, scope, locale)`. The service:
  1. Enqueues a BOM + header row synchronously.
  2. Queries `access_events` in batches of 500 rows ordered by `created_at DESC`, using `.range(offset, offset + 499)`. If `search` is present, it calls the same `search_access_events` RPC but without the paging arguments' limiting effect (the RPC is invoked in chunks of 500 as well; offset advances until a short batch is returned).
  3. For each batch: maps to `AccessEventListItem`, formats into CSV lines, and enqueues the chunk.
  4. Closes the stream when a batch returns fewer than 500 rows.
- The stream never buffers the full dataset in memory (research R2).
- SC-005 target: for ≤5,000 rows, first byte arrives inside 15 s.

## Concurrency guarantees

- The endpoint is idempotent. Two simultaneous calls produce two identical files. No server-side job lock.
- The frontend disables the Export button between click and completion (FR-033) to prevent duplicate downloads from the same tab.

## Frontend download helper

A new method on `apiClient` (`apps/web/src/shared/lib/api-client.ts`):

```ts
// Returns the blob plus the server-provided filename (extracted from Content-Disposition)
async download(path: string, options?: { params?: Record<string, unknown> }): Promise<{ blob: Blob; filename: string }> {
  const headers = await getAuthHeaders();
  const url = buildUrl(path, options?.params);
  const response = await fetch(url, { method: "GET", headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(body.message ?? response.statusText, response.status, body);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("text/csv")) {
    throw new ApiError("Unexpected response format", response.status, null);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename = match?.[1] ?? "export.csv";

  const blob = await response.blob();
  return { blob, filename };
}
```

The caller triggers the download via a transient `<a href={URL.createObjectURL(blob)} download={filename}>` that it clicks and revokes.

## Security considerations

- No raw strings from user input (dates, search, ids) are concatenated into the CSV without passing through the standard quoting rules above — prevents CSV injection into Excel (a leading `=`, `+`, `-`, `@` in a cell is prefixed with `'` by the quoting layer to disarm formula execution).
- The endpoint never accepts a `format` param — CSV is hard-coded (FR-032). PDF requests must be rejected at the controller layer (not relied on a 415 content negotiation).
