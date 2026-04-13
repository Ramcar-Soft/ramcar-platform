import { getDatabase } from "./database";

export interface LocalAccessEvent {
  id: string;
  tenant_id: string;
  event_id: string;
  person_type: string;
  user_id: string | null;
  visit_person_id: string | null;
  direction: "entry" | "exit";
  access_mode: "vehicle" | "pedestrian";
  vehicle_id: string | null;
  notes: string | null;
  source: string;
  registered_by: string;
  created_at: string;
  updated_at: string;
}

export function upsertAccessEvent(event: LocalAccessEvent): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO access_events (id, tenant_id, event_id, person_type, user_id, visit_person_id, direction, access_mode, vehicle_id, notes, source, registered_by, created_at, updated_at)
    VALUES (@id, @tenant_id, @event_id, @person_type, @user_id, @visit_person_id, @direction, @access_mode, @vehicle_id, @notes, @source, @registered_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      direction = @direction, access_mode = @access_mode, vehicle_id = @vehicle_id, notes = @notes, updated_at = @updated_at
  `).run(event);
}

export function upsertAccessEventsBatch(events: LocalAccessEvent[]): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO access_events (id, tenant_id, event_id, person_type, user_id, visit_person_id, direction, access_mode, vehicle_id, notes, source, registered_by, created_at, updated_at)
    VALUES (@id, @tenant_id, @event_id, @person_type, @user_id, @visit_person_id, @direction, @access_mode, @vehicle_id, @notes, @source, @registered_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      direction = @direction, access_mode = @access_mode, vehicle_id = @vehicle_id, notes = @notes, updated_at = @updated_at
  `);
  const batch = db.transaction((items: LocalAccessEvent[]) => {
    for (const item of items) stmt.run(item);
  });
  batch(events);
}

export function findRecentByVisitPersonId(visitPersonId: string, limit = 5): LocalAccessEvent[] {
  const db = getDatabase();
  return db.prepare(
    "SELECT * FROM access_events WHERE visit_person_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(visitPersonId, limit) as LocalAccessEvent[];
}

export function findAccessEventByEventId(eventId: string): LocalAccessEvent | undefined {
  const db = getDatabase();
  return db.prepare("SELECT * FROM access_events WHERE event_id = ?").get(eventId) as LocalAccessEvent | undefined;
}
