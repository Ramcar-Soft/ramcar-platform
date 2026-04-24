// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";
const TENANT_B = "3d8b2fbc-0000-0000-0000-000000000002";

// Captured fetch requests
const capturedRequests: Array<{ url: string; headers: Record<string, string> }> = [];

vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
  capturedRequests.push({
    url,
    headers: (init?.headers ?? {}) as Record<string, string>,
  });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});

vi.mock("electron", () => ({
  app: { getPath: () => ":memory:" },
  BrowserWindow: { getAllWindows: () => [] },
  net: { isOnline: () => true },
}));

// Mock the outbox repository with an in-memory queue
const outboxQueue: Array<{
  id: number;
  entity_type: string;
  action: string;
  payload: string;
  tenant_id: string;
  status: string;
  retry_count: number;
  last_attempted_at: null;
}> = [];
let nextId = 1;

vi.mock("../../repositories/sync-outbox-repository", () => ({
  dequeuePending: vi.fn(() => {
    const pending = outboxQueue.filter((r) => r.status === "pending");
    pending.forEach((r) => (r.status = "syncing"));
    return pending;
  }),
  markSynced: vi.fn((id: number) => {
    const idx = outboxQueue.findIndex((r) => r.id === id);
    if (idx >= 0) outboxQueue.splice(idx, 1);
  }),
  markFailed: vi.fn((id: number) => {
    const r = outboxQueue.find((r) => r.id === id);
    if (r) { r.status = "failed"; r.retry_count += 1; }
  }),
  getPendingCount: vi.fn(() => outboxQueue.filter((r) => r.status === "pending").length),
  resetStuckSyncing: vi.fn(),
}));

beforeEach(() => {
  outboxQueue.length = 0;
  capturedRequests.length = 0;
  nextId = 1;
});

function enqueueRow(tenantId: string, entityType = "access_event", action = "create") {
  outboxQueue.push({
    id: nextId++,
    entity_type: entityType,
    action,
    payload: JSON.stringify({ id: `entity-${nextId}` }),
    tenant_id: tenantId,
    status: "pending",
    retry_count: 0,
    last_attempted_at: null,
  });
}

describe("SyncEngine — tenant_id preservation on flush (T018)", () => {
  it("sends X-Active-Tenant-Id from the outbox row, not the current UI tenant", async () => {
    // Enqueue with TENANT_A (capture-time tenant)
    enqueueRow(TENANT_A);

    const { configureSyncEngine, setAuthToken } = await import("../../services/sync-engine");
    configureSyncEngine({ apiBaseUrl: "http://localhost:3001" });
    setAuthToken("test-token");

    // Dynamically set the active tenant to TENANT_B (as if the user switched)
    localStorage.setItem("ramcar.auth.activeTenantId", TENANT_B);

    const { triggerSync } = await import("../../services/sync-engine");
    triggerSync();

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The flush should have used TENANT_A (from the row), not TENANT_B (current UI)
    expect(capturedRequests.length).toBeGreaterThan(0);
    const flushRequest = capturedRequests.find((r) => r.url.includes("access-events"));
    expect(flushRequest?.headers?.["X-Active-Tenant-Id"]).toBe(TENANT_A);
  });

  it("skips rows with tenant_id = 'unknown' and marks them as failed", async () => {
    enqueueRow("unknown");

    const { triggerSync } = await import("../../services/sync-engine");
    triggerSync();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // No HTTP request should be made for the unknown-tenant row
    const flushRequests = capturedRequests.filter((r) => r.url.includes("access-events"));
    expect(flushRequests.length).toBe(0);
  });
});
