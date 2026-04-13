# Research: Visitor & Service Provider Access Logging

**Feature**: 011-visitor-provider-access  
**Date**: 2026-04-10

## R1: Supabase Storage for Image Uploads

**Decision**: Use Supabase Storage via the service-role client in the NestJS API. Create a private bucket `visit-person-images`. Files are uploaded via NestJS multipart endpoint, stored to Supabase Storage, and metadata saved in `visit_person_images` table.

**Rationale**: The `SupabaseService` in `apps/api/src/infrastructure/supabase/supabase.service.ts` already uses the service-role key (`SUPABASE_SECRET_KEY`), which has full storage access. This follows Constitution Principle VIII (API-First): all storage operations go through the API, never directly from the frontend.

**Alternatives considered**:
- Direct frontend upload to Supabase Storage with signed URLs: Rejected — violates API-First principle and bypasses tenant isolation logic.
- Upload to local filesystem: Rejected — doesn't scale across multiple API instances and doesn't leverage existing Supabase infrastructure.

**Implementation notes**:
- NestJS controller uses `@UseInterceptors(FileInterceptor('file'))` + `@UploadedFile()` for multipart handling (via `@nestjs/platform-express` Multer).
- Storage path: `{tenant_id}/visit-persons/{visit_person_id}/{image_type}_{timestamp}.jpg`
- For reading images, the API generates signed URLs with short TTL (60 min) via `supabase.storage.from('visit-person-images').createSignedUrl()`.
- Bucket must be created via Supabase dashboard or migration seed — not auto-created by the API.

---

## R2: Desktop Webcam Capture

**Decision**: Use the standard Web API `navigator.mediaDevices.getUserMedia()` in the Electron renderer process. Electron's Chromium engine supports this natively. Capture a still frame by drawing the video stream onto a canvas element and extracting a JPEG blob.

**Rationale**: Electron's renderer process has full access to web media APIs. No special Electron-specific APIs needed. This keeps the webcam component purely React-based and potentially reusable on web if getUserMedia is ever enabled there.

**Alternatives considered**:
- Electron `desktopCapturer` API: Rejected — designed for screen/window capture, not webcam input.
- Native Node.js camera libraries (node-webcam, v4l2): Rejected — adds native dependencies, complicates builds, and doesn't integrate cleanly with React rendering.

**Implementation notes**:
- Component: `WebcamCapture` — shows live preview, capture button, retake option.
- Output: JPEG blob (quality 0.85, max 1280px width) sent to API via multipart upload.
- Permission prompt: Electron grants camera access to the renderer by default. No special permissions config needed.
- Desktop preload bridge: Not needed for webcam — runs entirely in renderer process.

---

## R3: Desktop Offline Infrastructure (SQLite + Outbox)

**Decision**: The current desktop app has no SQLite or outbox infrastructure. The `electron/repositories/` and `electron/services/` directories contain only `settings-repository.ts` (flat file). All existing features (residents) fetch data directly from the API with no offline fallback. Full offline infrastructure (SQLite, sync engine, outbox) must be built as part of this feature.

**Rationale**: Constitution Principle IV (Offline-First Desktop) is marked NON-NEGOTIABLE. The spec clarification Q5 confirmed full offline support. However, the current codebase has no offline data layer — it needs to be created from scratch.

**Alternatives considered**:
- Defer offline support entirely: Rejected — violates constitution and spec requirement FR-026.
- Use localStorage/IndexedDB in renderer: Rejected — constitution requires SQLite in main process only, renderer must not access storage directly.
- Use sql.js (WASM SQLite): Rejected — runs in renderer, violates two-process architecture.

**Implementation notes**:
- Use `better-sqlite3` (synchronous, runs in Electron main process, well-supported).
- Database file: `{app.getPath('userData')}/ramcar.db` — single file for all local data.
- Schema: Local mirror tables for `visit_persons`, `vehicles`, `visit_person_images` (metadata only, images cached as files), `access_events`.
- Outbox table: `sync_outbox` with columns: `id`, `entity_type`, `entity_id`, `event_id` (UUID for idempotency), `operation` (create/update), `payload` (JSON), `status` (pending/syncing/synced/failed), `created_at`, `synced_at`.
- Sync engine: On reconnect, process outbox in FIFO order. Use `event_id` for idempotent server reconciliation.
- IPC handlers: Renderer calls `window.api.visitPersons.list()`, etc. Main process checks online status — if online, proxies to API; if offline, reads from local SQLite.
- Image offline cache: Files stored in `{app.getPath('userData')}/images/{tenant_id}/visit-persons/...` — same path convention as Supabase Storage. On sync, files uploaded to API multipart endpoint.
- SyncSlice in Zustand store: `idle | syncing | error | offline` — UI shows connectivity status.

**Scope warning**: This is significant infrastructure work. Estimated ~30% of total feature effort. Consider phasing: build online-only first (Phase 1), add offline infra (Phase 2 follow-up).

---

## R4: Multipart Upload from API Clients

**Decision**: Extend the `apiClient` in both web and desktop apps to support `FormData` / multipart POST requests alongside the existing JSON-only pattern.

**Rationale**: The current `apiClient.post()` always sets `Content-Type: application/json` and JSON-stringifies the body. Image uploads require `multipart/form-data` with a file blob.

**Alternatives considered**:
- Create a separate upload utility: Rejected — creates parallel code paths for auth header handling, error handling, etc.
- Use base64 encoding in JSON body: Rejected — inflates payload size by ~33%, inefficient for images up to 5MB.

**Implementation notes**:
- Add `apiClient.upload<T>(path: string, formData: FormData): Promise<T>` method.
- This method uses the same auth headers but does NOT set `Content-Type` (let browser/fetch set the multipart boundary automatically).
- Usage: `const formData = new FormData(); formData.append('file', blob); formData.append('imageType', 'face'); apiClient.upload('/visit-persons/:id/images', formData)`.

---

## R5: Extending Existing Schemas for Visit Person Support

**Decision**: Modify `createVehicleSchema` and `createAccessEventSchema` in `@ramcar/shared` to support both `userId` and `visitPersonId` as owner identifiers, using discriminated unions.

**Rationale**: The existing schemas hardcode `userId` as required. Visit person vehicles use `visitPersonId` instead. The database has a mutual exclusion constraint (`chk_vehicle_owner`), which the Zod schema should mirror.

**Implementation notes**:

**Vehicle schema** — change from flat object to discriminated union:
```
createVehicleSchema = z.discriminatedUnion("ownerType", [
  z.object({ ownerType: z.literal("user"), userId: z.string().uuid(), ...vehicleFields }),
  z.object({ ownerType: z.literal("visitPerson"), visitPersonId: z.string().uuid(), ...vehicleFields }),
])
```

**Access event schema** — already has `personType` which can serve as discriminator:
- When `personType` is "resident": `userId` required, `visitPersonId` absent.
- When `personType` is "visitor" or "service_provider": `visitPersonId` required, `userId` absent.
- Use `.superRefine()` instead of `.discriminatedUnion()` to keep backward compatibility with the existing schema shape.

**Vehicle type** — extend the `Vehicle` interface to include optional `visitPersonId`:
```typescript
interface Vehicle {
  // ...existing fields
  userId: string | null;
  visitPersonId: string | null;
}
```

---

## R6: Reusing vs. Creating New Feature Directories

**Decision**: Create separate `visitors` and `providers` feature directories rather than a shared `visit-persons` feature with conditional rendering.

**Rationale**: While visitors and providers share ~80% of the same structure, they have distinct fields (visitors: resident_id required; providers: company, phone, resident_id optional) and distinct page routes. Separate features follow the existing codebase pattern where each submodule page has its own feature slice. Shared logic (types, the sidebar component skeleton, keyboard navigation hook) goes in `@ramcar/shared` or a shared local utility.

**Alternatives considered**:
- Single `visit-persons` feature with type parameter: Considered — would reduce duplication but adds conditional complexity and makes each feature harder to reason about independently.
- Shared feature with sub-directories: Considered — breaks the "flat features" pattern used elsewhere.

**Implementation notes**:
- Both features import the same types/validators from `@ramcar/shared`.
- The `useKeyboardNavigation` hook can be generalized (it already takes generic row data).
- The `AccessEventSidebar` pattern is shared but with different header sections per type.
- The VehicleForm and AccessEventForm are reused directly (already in `shared/`).
