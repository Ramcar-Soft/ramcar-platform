import { app, ipcMain, net, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path, { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
const SETTINGS_FILE = "settings.json";
const VALID_LOCALES = ["es", "en"];
const DEFAULT_LOCALE = "es";
function getSettingsPath() {
  return join(app.getPath("userData"), SETTINGS_FILE);
}
function readSettings() {
  const path2 = getSettingsPath();
  if (!existsSync(path2)) {
    return { language: DEFAULT_LOCALE };
  }
  try {
    const data = readFileSync(path2, "utf-8");
    const parsed = JSON.parse(data);
    if (!VALID_LOCALES.includes(parsed.language)) {
      return { language: DEFAULT_LOCALE };
    }
    return parsed;
  } catch {
    return { language: DEFAULT_LOCALE };
  }
}
function writeSettings(settings) {
  const path2 = getSettingsPath();
  try {
    writeFileSync(path2, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
  }
}
function getLanguage() {
  return readSettings().language;
}
function setLanguage(locale) {
  if (!VALID_LOCALES.includes(locale)) return;
  writeSettings({ language: locale });
}
function registerSettingsHandlers() {
  ipcMain.handle("get-language", () => {
    return getLanguage();
  });
  ipcMain.handle("set-language", (_event, locale) => {
    setLanguage(locale);
  });
}
let db = null;
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
function getDatabase() {
  if (db) return db;
  const dbPath = join(app.getPath("userData"), "ramcar-local.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
function upsertVisitPerson(person) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO visit_persons (id, tenant_id, code, type, status, full_name, phone, company, resident_id, resident_name, notes, registered_by, created_at, updated_at)
    VALUES (@id, @tenant_id, @code, @type, @status, @full_name, @phone, @company, @resident_id, @resident_name, @notes, @registered_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      status = @status, full_name = @full_name, phone = @phone, company = @company,
      resident_id = @resident_id, resident_name = @resident_name, notes = @notes, updated_at = @updated_at
  `);
  stmt.run(person);
}
function upsertVisitPersonsBatch(persons) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO visit_persons (id, tenant_id, code, type, status, full_name, phone, company, resident_id, resident_name, notes, registered_by, created_at, updated_at)
    VALUES (@id, @tenant_id, @code, @type, @status, @full_name, @phone, @company, @resident_id, @resident_name, @notes, @registered_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      status = @status, full_name = @full_name, phone = @phone, company = @company,
      resident_id = @resident_id, resident_name = @resident_name, notes = @notes, updated_at = @updated_at
  `);
  const batch = db2.transaction((items) => {
    for (const item of items) stmt.run(item);
  });
  batch(persons);
}
function findVisitPersonById(id) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM visit_persons WHERE id = ?").get(id);
}
function listVisitPersons(filters) {
  const db2 = getDatabase();
  const conditions = ["tenant_id = @tenant_id"];
  const params = { tenant_id: filters.tenant_id };
  if (filters.type) {
    conditions.push("type = @type");
    params.type = filters.type;
  }
  if (filters.status) {
    conditions.push("status = @status");
    params.status = filters.status;
  }
  if (filters.search) {
    conditions.push("(full_name LIKE @search OR code LIKE @search OR phone LIKE @search OR company LIKE @search)");
    params.search = `%${filters.search}%`;
  }
  const where = conditions.join(" AND ");
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;
  const total = db2.prepare(`SELECT COUNT(*) as count FROM visit_persons WHERE ${where}`).get(params).count;
  const data = db2.prepare(`SELECT * FROM visit_persons WHERE ${where} ORDER BY full_name ASC LIMIT @limit OFFSET @offset`).all({ ...params, limit: pageSize, offset });
  return { data, total };
}
function upsertVehicle(vehicle) {
  const db2 = getDatabase();
  db2.prepare(`
    INSERT INTO vehicles (id, tenant_id, user_id, visit_person_id, vehicle_type, brand, model, plate, color, notes, created_at, updated_at)
    VALUES (@id, @tenant_id, @user_id, @visit_person_id, @vehicle_type, @brand, @model, @plate, @color, @notes, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      brand = @brand, model = @model, plate = @plate, color = @color, notes = @notes, updated_at = @updated_at
  `).run(vehicle);
}
function upsertVehiclesBatch(vehicles) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO vehicles (id, tenant_id, user_id, visit_person_id, vehicle_type, brand, model, plate, color, notes, created_at, updated_at)
    VALUES (@id, @tenant_id, @user_id, @visit_person_id, @vehicle_type, @brand, @model, @plate, @color, @notes, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      brand = @brand, model = @model, plate = @plate, color = @color, notes = @notes, updated_at = @updated_at
  `);
  const batch = db2.transaction((items) => {
    for (const item of items) stmt.run(item);
  });
  batch(vehicles);
}
function findVehiclesByVisitPersonId(visitPersonId) {
  const db2 = getDatabase();
  return db2.prepare("SELECT * FROM vehicles WHERE visit_person_id = ?").all(visitPersonId);
}
function upsertAccessEvent(event) {
  const db2 = getDatabase();
  db2.prepare(`
    INSERT INTO access_events (id, tenant_id, event_id, person_type, user_id, visit_person_id, direction, access_mode, vehicle_id, notes, source, registered_by, created_at, updated_at)
    VALUES (@id, @tenant_id, @event_id, @person_type, @user_id, @visit_person_id, @direction, @access_mode, @vehicle_id, @notes, @source, @registered_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      direction = @direction, access_mode = @access_mode, vehicle_id = @vehicle_id, notes = @notes, updated_at = @updated_at
  `).run(event);
}
function upsertAccessEventsBatch(events) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO access_events (id, tenant_id, event_id, person_type, user_id, visit_person_id, direction, access_mode, vehicle_id, notes, source, registered_by, created_at, updated_at)
    VALUES (@id, @tenant_id, @event_id, @person_type, @user_id, @visit_person_id, @direction, @access_mode, @vehicle_id, @notes, @source, @registered_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      direction = @direction, access_mode = @access_mode, vehicle_id = @vehicle_id, notes = @notes, updated_at = @updated_at
  `);
  const batch = db2.transaction((items) => {
    for (const item of items) stmt.run(item);
  });
  batch(events);
}
function findRecentByVisitPersonId(visitPersonId, limit = 5) {
  const db2 = getDatabase();
  return db2.prepare(
    "SELECT * FROM access_events WHERE visit_person_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(visitPersonId, limit);
}
function getImagesDir() {
  const dir = join(app.getPath("userData"), "images");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
function saveImageLocally(visitPersonId, imageType, data) {
  const dir = join(getImagesDir(), visitPersonId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filename = `${imageType}_${Date.now()}.jpg`;
  const filePath = join(dir, filename);
  writeFileSync(filePath, data);
  return filePath;
}
function deleteLocalImage(localPath) {
  if (existsSync(localPath)) {
    unlinkSync(localPath);
  }
}
function upsertImageMeta(meta) {
  const db2 = getDatabase();
  db2.prepare(`
    INSERT INTO visit_person_images_meta (id, tenant_id, visit_person_id, image_type, local_path, storage_path, created_at)
    VALUES (@id, @tenant_id, @visit_person_id, @image_type, @local_path, @storage_path, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      local_path = @local_path, storage_path = @storage_path
  `).run(meta);
}
function findImagesByVisitPersonId(visitPersonId) {
  const db2 = getDatabase();
  return db2.prepare(
    "SELECT * FROM visit_person_images_meta WHERE visit_person_id = ? ORDER BY created_at DESC"
  ).all(visitPersonId);
}
function findImageByTypeAndPerson(visitPersonId, imageType) {
  const db2 = getDatabase();
  return db2.prepare(
    "SELECT * FROM visit_person_images_meta WHERE visit_person_id = ? AND image_type = ?"
  ).get(visitPersonId, imageType);
}
function deleteImageMeta(id) {
  const db2 = getDatabase();
  db2.prepare("DELETE FROM visit_person_images_meta WHERE id = ?").run(id);
}
function enqueue(entityType, entityId, action, payload) {
  const db2 = getDatabase();
  db2.prepare(`
    INSERT INTO sync_outbox (entity_type, entity_id, action, payload)
    VALUES (?, ?, ?, ?)
  `).run(entityType, entityId, action, JSON.stringify(payload));
}
function dequeuePending(limit = 10) {
  const db2 = getDatabase();
  const entries = db2.prepare(`
    SELECT * FROM sync_outbox
    WHERE status IN ('pending', 'failed')
    AND retry_count < 5
    ORDER BY id ASC
    LIMIT ?
  `).all(limit);
  if (entries.length > 0) {
    const ids = entries.map((e) => e.id);
    db2.prepare(
      `UPDATE sync_outbox SET status = 'syncing', last_attempted_at = datetime('now') WHERE id IN (${ids.map(() => "?").join(",")})`
    ).run(...ids);
  }
  return entries;
}
function markSynced(id) {
  const db2 = getDatabase();
  db2.prepare("DELETE FROM sync_outbox WHERE id = ?").run(id);
}
function markFailed(id) {
  const db2 = getDatabase();
  db2.prepare(
    "UPDATE sync_outbox SET status = 'failed', retry_count = retry_count + 1 WHERE id = ?"
  ).run(id);
}
function getPendingCount() {
  const db2 = getDatabase();
  const row = db2.prepare(
    "SELECT COUNT(*) as count FROM sync_outbox WHERE status IN ('pending', 'failed') AND retry_count < 5"
  ).get();
  return row.count;
}
function resetStuckSyncing() {
  const db2 = getDatabase();
  db2.prepare(
    "UPDATE sync_outbox SET status = 'pending' WHERE status = 'syncing'"
  ).run();
}
let apiBaseUrl$1 = "http://localhost:3001";
let authToken$1 = null;
function setVisitPersonsAuthToken(token) {
  authToken$1 = token;
}
function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (authToken$1) headers["Authorization"] = `Bearer ${authToken$1}`;
  return headers;
}
async function fetchFromApi(path2, params) {
  const url = new URL(path2, apiBaseUrl$1);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== void 0 && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  const response = await fetch(url.toString(), { method: "GET", headers: getHeaders() });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
async function postToApi(path2, data) {
  const response = await fetch(`${apiBaseUrl$1}${path2}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
async function patchToApi(path2, data) {
  const response = await fetch(`${apiBaseUrl$1}${path2}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
function applyPatchToLocalPerson(existing, patch) {
  return {
    ...existing,
    full_name: patch.fullName ?? existing.full_name,
    status: patch.status ?? existing.status,
    phone: patch.phone ?? existing.phone,
    company: patch.company ?? existing.company,
    resident_id: patch.residentId !== void 0 ? patch.residentId : existing.resident_id,
    notes: patch.notes ?? existing.notes,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function registerVisitPersonsHandlers() {
  ipcMain.handle("visit-persons:list", async (_event, filters) => {
    if (net.isOnline() && authToken$1) {
      try {
        const result = await fetchFromApi(
          "/visit-persons",
          filters
        );
        if (result.data.length > 0) {
          upsertVisitPersonsBatch(result.data.map(mapApiPersonToLocal));
        }
        return result;
      } catch {
      }
    }
    const local = listVisitPersons(filters);
    return { data: local.data, total: local.total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 };
  });
  ipcMain.handle("visit-persons:get", async (_event, id) => {
    if (net.isOnline() && authToken$1) {
      try {
        const person = await fetchFromApi(`/visit-persons/${id}`);
        upsertVisitPerson(mapApiPersonToLocal(person));
        return person;
      } catch {
      }
    }
    return findVisitPersonById(id);
  });
  ipcMain.handle("visit-persons:create", async (_event, data) => {
    if (net.isOnline() && authToken$1) {
      try {
        const created = await postToApi("/visit-persons", data);
        upsertVisitPerson(mapApiPersonToLocal(created));
        return created;
      } catch {
      }
    }
    const localPerson = {
      id: randomUUID(),
      tenant_id: data.tenant_id ?? "",
      code: `OFFLINE-${Date.now()}`,
      type: data.type,
      status: data.status ?? "allowed",
      full_name: data.fullName,
      phone: data.phone ?? null,
      company: data.company ?? null,
      resident_id: data.residentId ?? null,
      resident_name: null,
      notes: data.notes ?? null,
      registered_by: data.registeredBy ?? "",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    upsertVisitPerson(localPerson);
    enqueue("visit_person", localPerson.id, "create", data);
    return localPerson;
  });
  ipcMain.handle("visit-persons:vehicles", async (_event, visitPersonId) => {
    if (net.isOnline() && authToken$1) {
      try {
        const vehicles = await fetchFromApi("/vehicles", { visitPersonId });
        if (vehicles.length > 0) {
          upsertVehiclesBatch(vehicles.map(mapApiVehicleToLocal));
        }
        return vehicles;
      } catch {
      }
    }
    return findVehiclesByVisitPersonId(visitPersonId);
  });
  ipcMain.handle("visit-persons:create-vehicle", async (_event, data) => {
    if (net.isOnline() && authToken$1) {
      try {
        const created = await postToApi("/vehicles", data);
        upsertVehicle(mapApiVehicleToLocal(created));
        return created;
      } catch {
      }
    }
    const localVehicle = {
      id: randomUUID(),
      tenant_id: data.tenant_id ?? "",
      user_id: null,
      visit_person_id: data.visitPersonId,
      vehicle_type: data.vehicleType,
      brand: data.brand ?? null,
      model: data.model ?? null,
      plate: data.plate ?? null,
      color: data.color ?? null,
      notes: data.notes ?? null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    upsertVehicle(localVehicle);
    enqueue("vehicle", localVehicle.id, "create", data);
    return localVehicle;
  });
  ipcMain.handle("visit-persons:recent-events", async (_event, visitPersonId) => {
    if (net.isOnline() && authToken$1) {
      try {
        const events = await fetchFromApi(
          `/access-events/recent-visit-person/${visitPersonId}`
        );
        if (events.length > 0) {
          upsertAccessEventsBatch(events.map(mapApiEventToLocal));
        }
        return events;
      } catch {
      }
    }
    return findRecentByVisitPersonId(visitPersonId);
  });
  ipcMain.handle("visit-persons:create-event", async (_event, data) => {
    const eventId = data.eventId ?? randomUUID();
    if (net.isOnline() && authToken$1) {
      try {
        const created = await postToApi("/access-events", { ...data, eventId });
        upsertAccessEvent(mapApiEventToLocal(created));
        return created;
      } catch {
      }
    }
    const localEvent = {
      id: randomUUID(),
      tenant_id: data.tenant_id ?? "",
      event_id: eventId,
      person_type: data.personType,
      user_id: null,
      visit_person_id: data.visitPersonId,
      direction: data.direction,
      access_mode: data.accessMode,
      vehicle_id: data.vehicleId ?? null,
      notes: data.notes ?? null,
      source: "desktop",
      registered_by: data.registeredBy ?? "",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    upsertAccessEvent(localEvent);
    enqueue("access_event", localEvent.id, "create", { ...data, eventId });
    return localEvent;
  });
  ipcMain.handle("visit-persons:update", async (_event, id, patch) => {
    const existing = findVisitPersonById(id);
    if (net.isOnline() && authToken$1) {
      try {
        const updated = await patchToApi(`/visit-persons/${id}`, patch);
        upsertVisitPerson(mapApiPersonToLocal(updated));
        return updated;
      } catch {
      }
    }
    if (existing) {
      const patched = applyPatchToLocalPerson(existing, patch);
      upsertVisitPerson(patched);
      enqueue("visit_person", id, "update", { id, ...patch });
      return patched;
    }
    enqueue("visit_person", id, "update", { id, ...patch });
    return { id, ...patch };
  });
  ipcMain.handle("visit-persons:images", async (_event, visitPersonId) => {
    if (net.isOnline() && authToken$1) {
      try {
        return await fetchFromApi(`/visit-persons/${visitPersonId}/images`);
      } catch {
      }
    }
    return findImagesByVisitPersonId(visitPersonId);
  });
  ipcMain.handle(
    "visit-persons:upload-image",
    async (_event, visitPersonId, imageType, imageData) => {
      const buffer = Buffer.from(imageData);
      const localPath = saveImageLocally(visitPersonId, imageType, buffer);
      const id = randomUUID();
      const existing = findImageByTypeAndPerson(visitPersonId, imageType);
      if (existing) {
        deleteLocalImage(existing.local_path);
        deleteImageMeta(existing.id);
      }
      upsertImageMeta({
        id,
        tenant_id: "",
        visit_person_id: visitPersonId,
        image_type: imageType,
        local_path: localPath,
        storage_path: null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      enqueue("image", id, "upload_image", {
        visitPersonId,
        imageType,
        localPath
      });
      return { id, localPath, imageType };
    }
  );
}
function mapApiPersonToLocal(person) {
  return {
    id: person.id,
    tenant_id: person.tenantId ?? person.tenant_id,
    code: person.code,
    type: person.type,
    status: person.status,
    full_name: person.fullName ?? person.full_name,
    phone: person.phone ?? null,
    company: person.company ?? null,
    resident_id: person.residentId ?? person.resident_id,
    resident_name: person.residentName ?? person.resident_name,
    notes: person.notes ?? null,
    registered_by: person.registeredBy ?? person.registered_by,
    created_at: person.createdAt ?? person.created_at,
    updated_at: person.updatedAt ?? person.updated_at
  };
}
function mapApiVehicleToLocal(vehicle) {
  return {
    id: vehicle.id,
    tenant_id: vehicle.tenantId ?? vehicle.tenant_id,
    user_id: vehicle.userId ?? vehicle.user_id,
    visit_person_id: vehicle.visitPersonId ?? vehicle.visit_person_id,
    vehicle_type: vehicle.vehicleType ?? vehicle.vehicle_type,
    brand: vehicle.brand ?? null,
    model: vehicle.model ?? null,
    plate: vehicle.plate ?? null,
    color: vehicle.color ?? null,
    notes: vehicle.notes ?? null,
    created_at: vehicle.createdAt ?? vehicle.created_at,
    updated_at: vehicle.updatedAt ?? vehicle.updated_at
  };
}
function mapApiEventToLocal(event) {
  return {
    id: event.id,
    tenant_id: event.tenantId ?? event.tenant_id,
    event_id: event.eventId ?? event.event_id,
    person_type: event.personType ?? event.person_type,
    user_id: event.userId ?? event.user_id,
    visit_person_id: event.visitPersonId ?? event.visit_person_id,
    direction: event.direction,
    access_mode: event.accessMode ?? event.access_mode,
    vehicle_id: event.vehicleId ?? event.vehicle_id,
    notes: event.notes ?? null,
    source: event.source ?? "desktop",
    registered_by: event.registeredBy ?? event.registered_by,
    created_at: event.createdAt ?? event.created_at,
    updated_at: event.updatedAt ?? event.updated_at
  };
}
let syncInterval = null;
let isSyncing = false;
let apiBaseUrl = "http://localhost:3001";
let authToken = null;
function setAuthToken(token) {
  authToken = token;
}
function isOnline() {
  return net.isOnline();
}
function notifyRenderer(status, pendingCount) {
  for (const win2 of BrowserWindow.getAllWindows()) {
    win2.webContents.send("sync-status", { status, pendingCount });
  }
}
async function processOutbox() {
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
    try {
      const payload = JSON.parse(entry.payload);
      await syncEntry(entry.entity_type, entry.action, payload);
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
async function syncEntry(entityType, action, payload) {
  var _a;
  const headers = {
    Authorization: `Bearer ${authToken}`
  };
  if (action === "upload_image") {
    const localPath = payload.localPath;
    const fileData = readFileSync(localPath);
    const boundary = `----FormBoundary${Date.now()}`;
    headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
    const imageType = payload.imageType;
    const visitPersonId = payload.visitPersonId;
    const body = buildMultipartBody(boundary, fileData, imageType);
    const url = `${apiBaseUrl}/visit-persons/${visitPersonId}/images`;
    const response2 = await fetch(url, { method: "POST", headers, body });
    if (!response2.ok) throw new Error(`Upload failed: ${response2.status}`);
    return;
  }
  headers["Content-Type"] = "application/json";
  const endpointMap = {
    visit_person: {
      create: { method: "POST", path: "/visit-persons" },
      update: { method: "PATCH", path: `/visit-persons/${payload.id}` }
    },
    vehicle: {
      create: { method: "POST", path: "/vehicles" }
    },
    access_event: {
      create: { method: "POST", path: "/access-events" }
    }
  };
  const endpoint = (_a = endpointMap[entityType]) == null ? void 0 : _a[action];
  if (!endpoint) throw new Error(`Unknown sync target: ${entityType}/${action}`);
  const response = await fetch(`${apiBaseUrl}${endpoint.path}`, {
    method: endpoint.method,
    headers,
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
}
function buildMultipartBody(boundary, fileData, imageType) {
  const parts = [];
  const crlf = "\r\n";
  parts.push(Buffer.from(
    `--${boundary}${crlf}Content-Disposition: form-data; name="imageType"${crlf}${crlf}${imageType}${crlf}`
  ));
  parts.push(Buffer.from(
    `--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="image.jpg"${crlf}Content-Type: image/jpeg${crlf}${crlf}`
  ));
  parts.push(fileData);
  parts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));
  return Buffer.concat(parts);
}
function startSyncEngine() {
  resetStuckSyncing();
  syncInterval = setInterval(() => {
    processOutbox().catch(() => {
      notifyRenderer("error", getPendingCount());
    });
  }, 15e3);
  processOutbox().catch(() => {
    notifyRenderer("error", getPendingCount());
  });
}
function stopSyncEngine() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
function triggerSync() {
  processOutbox().catch(() => {
    notifyRenderer("error", getPendingCount());
  });
}
function getSyncStatus() {
  const pendingCount = getPendingCount();
  if (!isOnline()) return { status: "offline", pendingCount };
  if (isSyncing) return { status: "syncing", pendingCount };
  if (pendingCount > 0) return { status: "error", pendingCount };
  return { status: "idle", pendingCount: 0 };
}
function registerSyncHandlers() {
  ipcMain.handle("sync:status", () => {
    return getSyncStatus();
  });
  ipcMain.handle("sync:trigger", () => {
    triggerSync();
    return { triggered: true };
  });
  ipcMain.handle("sync:outbox-count", () => {
    return getPendingCount();
  });
  ipcMain.handle("sync:set-auth-token", (_event, token) => {
    setAuthToken(token);
    setVisitPersonsAuthToken(token);
  });
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  registerSettingsHandlers();
  registerVisitPersonsHandlers();
  registerSyncHandlers();
  startSyncEngine();
  createWindow();
});
app.on("before-quit", () => {
  stopSyncEngine();
  closeDatabase();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
