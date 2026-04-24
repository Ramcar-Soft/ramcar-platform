import { net, BrowserWindow } from "electron";
import { readFileSync } from "node:fs";
import {
  dequeuePending,
  markSynced,
  markFailed,
  markError,
  getPendingCount,
  resetStuckSyncing,
} from "../repositories/sync-outbox-repository";

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let apiBaseUrl = "http://localhost:3001";
let authToken: string | null = null;

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export function configureSyncEngine(config: { apiBaseUrl: string }): void {
  apiBaseUrl = config.apiBaseUrl;
}

export function setAuthToken(token: string | null): void {
  authToken = token;
}

function isOnline(): boolean {
  return net.isOnline();
}

function notifyRenderer(status: SyncStatus, pendingCount: number): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("sync-status", { status, pendingCount });
  }
}

async function processOutbox(): Promise<void> {
  if (isSyncing || !isOnline() || !authToken) {
    if (!isOnline()) notifyRenderer("offline", getPendingCount());
    return;
  }

  const entries = dequeuePending(10);
  if (entries.length === 0) {
    notifyRenderer("idle", 0);
    return;
  }

  isSyncing = true;
  notifyRenderer("syncing", entries.length);

  let hadError = false;
  for (const entry of entries) {
    // Rows with unknown tenant_id cannot be reliably synced — mark as error.
    if (!entry.tenant_id || entry.tenant_id === "unknown" || entry.tenant_id === "") {
      markError(entry.id, "tenant_id missing — manual re-capture required");
      hadError = true;
      continue;
    }

    try {
      const payload = JSON.parse(entry.payload);
      // Use the row's captured tenant_id, NOT the current UI active tenant.
      await syncEntry(entry.entity_type, entry.action, payload, entry.tenant_id);
      markSynced(entry.id);
    } catch {
      markFailed(entry.id);
      hadError = true;
    }
  }

  isSyncing = false;
  const remaining = getPendingCount();
  notifyRenderer(hadError ? "error" : remaining > 0 ? "syncing" : "idle", remaining);
}

async function syncEntry(
  entityType: string,
  action: string,
  payload: Record<string, unknown>,
  tenantId: string,
): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${authToken}`,
    "X-Active-Tenant-Id": tenantId,
  };

  if (action === "upload_image") {
    const localPath = payload.localPath as string;
    const fileData = readFileSync(localPath);
    const boundary = `----FormBoundary${Date.now()}`;
    headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;

    const imageType = payload.imageType as string;
    const visitPersonId = payload.visitPersonId as string;

    const body = buildMultipartBody(boundary, fileData, imageType);
    const url = `${apiBaseUrl}/visit-persons/${visitPersonId}/images`;

    const response = await fetch(url, { method: "POST", headers, body });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    return;
  }

  headers["Content-Type"] = "application/json";

  const endpointMap: Record<string, Record<string, { method: string; path: string }>> = {
    visit_person: {
      create: { method: "POST", path: "/visit-persons" },
      update: { method: "PATCH", path: `/visit-persons/${payload.id}` },
    },
    vehicle: {
      create: { method: "POST", path: "/vehicles" },
    },
    access_event: {
      create: { method: "POST", path: "/access-events" },
      update: { method: "PATCH", path: `/access-events/${payload.id}` },
    },
  };

  const endpoint = endpointMap[entityType]?.[action];
  if (!endpoint) throw new Error(`Unknown sync target: ${entityType}/${action}`);

  const response = await fetch(`${apiBaseUrl}${endpoint.path}`, {
    method: endpoint.method,
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
}

function buildMultipartBody(
  boundary: string,
  fileData: Buffer,
  imageType: string,
): Buffer {
  const parts: Buffer[] = [];
  const crlf = "\r\n";

  // imageType field
  parts.push(Buffer.from(
    `--${boundary}${crlf}Content-Disposition: form-data; name="imageType"${crlf}${crlf}${imageType}${crlf}`,
  ));

  // file field
  parts.push(Buffer.from(
    `--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="image.jpg"${crlf}Content-Type: image/jpeg${crlf}${crlf}`,
  ));
  parts.push(fileData);
  parts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

  return Buffer.concat(parts);
}

export function startSyncEngine(): void {
  resetStuckSyncing();
  syncInterval = setInterval(() => {
    processOutbox().catch(() => {
      notifyRenderer("error", getPendingCount());
    });
  }, 15_000);

  // Initial sync attempt
  processOutbox().catch(() => {
    notifyRenderer("error", getPendingCount());
  });
}

export function stopSyncEngine(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export function triggerSync(): void {
  processOutbox().catch(() => {
    notifyRenderer("error", getPendingCount());
  });
}

export function getSyncStatus(): { status: SyncStatus; pendingCount: number } {
  const pendingCount = getPendingCount();
  if (!isOnline()) return { status: "offline", pendingCount };
  if (isSyncing) return { status: "syncing", pendingCount };
  if (pendingCount > 0) return { status: "error", pendingCount };
  return { status: "idle", pendingCount: 0 };
}
