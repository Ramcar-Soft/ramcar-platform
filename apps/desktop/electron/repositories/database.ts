import { app } from "electron";
import Database from "better-sqlite3";
import { join } from "node:path";

let db: Database.Database | null = null;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS visit_persons (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('visitor', 'service_provider')),
    status TEXT NOT NULL DEFAULT 'allowed' CHECK(status IN ('allowed', 'flagged', 'denied')),
    full_name TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    resident_id TEXT,
    resident_name TEXT,
    notes TEXT,
    registered_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_visit_persons_tenant_type ON visit_persons(tenant_id, type);
  CREATE INDEX IF NOT EXISTS idx_visit_persons_tenant_name ON visit_persons(tenant_id, full_name);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_persons_tenant_code ON visit_persons(tenant_id, code);

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    visit_person_id TEXT,
    vehicle_type TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    plate TEXT,
    color TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_vehicles_visit_person ON vehicles(visit_person_id);
  CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);

  CREATE TABLE IF NOT EXISTS access_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    person_type TEXT NOT NULL,
    user_id TEXT,
    visit_person_id TEXT,
    direction TEXT NOT NULL CHECK(direction IN ('entry', 'exit')),
    access_mode TEXT NOT NULL CHECK(access_mode IN ('vehicle', 'pedestrian')),
    vehicle_id TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'desktop',
    registered_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_access_events_event_id ON access_events(event_id);
  CREATE INDEX IF NOT EXISTS idx_access_events_visit_person ON access_events(visit_person_id);

  CREATE TABLE IF NOT EXISTS visit_person_images_meta (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    visit_person_id TEXT NOT NULL,
    image_type TEXT NOT NULL CHECK(image_type IN ('face', 'id_card', 'vehicle_plate', 'other')),
    local_path TEXT NOT NULL,
    storage_path TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_images_visit_person ON visit_person_images_meta(visit_person_id);

  CREATE TABLE IF NOT EXISTS sync_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('create', 'update', 'upload_image')),
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'syncing', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_attempted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);
`;

// Schema version 2: adds tenant_id to sync_outbox
const MIGRATION_V2 = `
  ALTER TABLE sync_outbox ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
`;

function applyMigrations(database: Database.Database): void {
  const version = (database.pragma("user_version", { simple: true }) as number) ?? 0;

  if (version < 2) {
    database.exec(MIGRATION_V2);
    // Backfill existing rows from payload.tenant_id where available
    database.prepare(`
      UPDATE sync_outbox
      SET tenant_id = COALESCE(json_extract(payload, '$.tenant_id'), 'unknown')
      WHERE tenant_id = ''
    `).run();
    database.pragma("user_version = 2");
  }
}

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = join(app.getPath("userData"), "ramcar-local.db");
  db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  applyMigrations(db);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
