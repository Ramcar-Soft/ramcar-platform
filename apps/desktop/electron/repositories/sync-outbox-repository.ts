import { getDatabase } from "./database";

export interface OutboxEntry {
  id: number;
  entity_type: string;
  entity_id: string;
  action: "create" | "update" | "upload_image";
  payload: string;
  status: "pending" | "syncing" | "failed";
  retry_count: number;
  created_at: string;
  last_attempted_at: string | null;
}

export function enqueue(
  entityType: string,
  entityId: string,
  action: "create" | "update" | "upload_image",
  payload: unknown,
): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO sync_outbox (entity_type, entity_id, action, payload)
    VALUES (?, ?, ?, ?)
  `).run(entityType, entityId, action, JSON.stringify(payload));
}

export function dequeuePending(limit = 10): OutboxEntry[] {
  const db = getDatabase();
  const entries = db.prepare(`
    SELECT * FROM sync_outbox
    WHERE status IN ('pending', 'failed')
    AND retry_count < 5
    ORDER BY id ASC
    LIMIT ?
  `).all(limit) as OutboxEntry[];

  if (entries.length > 0) {
    const ids = entries.map((e) => e.id);
    db.prepare(
      `UPDATE sync_outbox SET status = 'syncing', last_attempted_at = datetime('now') WHERE id IN (${ids.map(() => "?").join(",")})`,
    ).run(...ids);
  }

  return entries;
}

export function markSynced(id: number): void {
  const db = getDatabase();
  db.prepare("DELETE FROM sync_outbox WHERE id = ?").run(id);
}

export function markFailed(id: number): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE sync_outbox SET status = 'failed', retry_count = retry_count + 1 WHERE id = ?"
  ).run(id);
}

export function getPendingCount(): number {
  const db = getDatabase();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM sync_outbox WHERE status IN ('pending', 'failed') AND retry_count < 5"
  ).get() as { count: number };
  return row.count;
}

export function resetStuckSyncing(): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE sync_outbox SET status = 'pending' WHERE status = 'syncing'"
  ).run();
}
