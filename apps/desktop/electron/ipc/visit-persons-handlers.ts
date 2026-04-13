import { ipcMain, net } from "electron";
import { randomUUID } from "node:crypto";
import {
  listVisitPersons,
  upsertVisitPerson,
  upsertVisitPersonsBatch,
  findVisitPersonById,
  type LocalVisitPerson,
  type VisitPersonFilters,
} from "../repositories/visit-persons-repository";
import {
  findVehiclesByVisitPersonId,
  upsertVehicle,
  upsertVehiclesBatch,
  type LocalVehicle,
} from "../repositories/vehicles-repository";
import {
  upsertAccessEvent,
  upsertAccessEventsBatch,
  findRecentByVisitPersonId,
  type LocalAccessEvent,
} from "../repositories/access-events-repository";
import {
  findImagesByVisitPersonId,
  saveImageLocally,
  upsertImageMeta,
  findImageByTypeAndPerson,
  deleteImageMeta,
  deleteLocalImage,
} from "../repositories/images-repository";
import { enqueue } from "../repositories/sync-outbox-repository";

let apiBaseUrl = "http://localhost:3001";
let authToken: string | null = null;

export function configureVisitPersonsHandlers(config: { apiBaseUrl: string }): void {
  apiBaseUrl = config.apiBaseUrl;
}

export function setVisitPersonsAuthToken(token: string | null): void {
  authToken = token;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
}

async function fetchFromApi<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const url = new URL(path, apiBaseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  const response = await fetch(url.toString(), { method: "GET", headers: getHeaders() });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<T>;
}

async function postToApi<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<T>;
}

async function patchToApi<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<T>;
}

function applyPatchToLocalPerson(
  existing: LocalVisitPerson,
  patch: Record<string, unknown>,
): LocalVisitPerson {
  return {
    ...existing,
    full_name: (patch.fullName as string) ?? existing.full_name,
    status: (patch.status as "allowed" | "flagged" | "denied") ?? existing.status,
    phone: (patch.phone as string | null | undefined) ?? existing.phone,
    company: (patch.company as string | null | undefined) ?? existing.company,
    resident_id: patch.residentId !== undefined ? (patch.residentId as string | null) : existing.resident_id,
    notes: (patch.notes as string | null | undefined) ?? existing.notes,
    updated_at: new Date().toISOString(),
  };
}

export function registerVisitPersonsHandlers(): void {
  // List visit persons (online → API + cache, offline → SQLite)
  ipcMain.handle("visit-persons:list", async (_event, filters: VisitPersonFilters) => {
    if (net.isOnline() && authToken) {
      try {
        const result = await fetchFromApi<{ data: LocalVisitPerson[]; total: number; page: number; pageSize: number }>(
          "/visit-persons",
          filters as unknown as Record<string, unknown>,
        );
        // Cache results locally
        if (result.data.length > 0) {
          upsertVisitPersonsBatch(result.data.map(mapApiPersonToLocal));
        }
        return result;
      } catch {
        // Fallback to local
      }
    }
    const local = listVisitPersons(filters);
    return { data: local.data, total: local.total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 };
  });

  // Get visit person by ID
  ipcMain.handle("visit-persons:get", async (_event, id: string) => {
    if (net.isOnline() && authToken) {
      try {
        const person = await fetchFromApi<LocalVisitPerson>(`/visit-persons/${id}`);
        upsertVisitPerson(mapApiPersonToLocal(person));
        return person;
      } catch {
        // Fallback
      }
    }
    return findVisitPersonById(id);
  });

  // Create visit person
  ipcMain.handle("visit-persons:create", async (_event, data: Record<string, unknown>) => {
    if (net.isOnline() && authToken) {
      try {
        const created = await postToApi<LocalVisitPerson>("/visit-persons", data);
        upsertVisitPerson(mapApiPersonToLocal(created));
        return created;
      } catch {
        // Fallback to offline create
      }
    }

    const localPerson: LocalVisitPerson = {
      id: randomUUID(),
      tenant_id: data.tenant_id as string ?? "",
      code: `OFFLINE-${Date.now()}`,
      type: data.type as "visitor" | "service_provider",
      status: (data.status as string ?? "allowed") as "allowed" | "flagged" | "denied",
      full_name: data.fullName as string,
      phone: (data.phone as string) ?? null,
      company: (data.company as string) ?? null,
      resident_id: (data.residentId as string) ?? null,
      resident_name: null,
      notes: (data.notes as string) ?? null,
      registered_by: data.registeredBy as string ?? "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertVisitPerson(localPerson);
    enqueue("visit_person", localPerson.id, "create", data);
    return localPerson;
  });

  // Get vehicles for visit person
  ipcMain.handle("visit-persons:vehicles", async (_event, visitPersonId: string) => {
    if (net.isOnline() && authToken) {
      try {
        const vehicles = await fetchFromApi<LocalVehicle[]>("/vehicles", { visitPersonId });
        if (vehicles.length > 0) {
          upsertVehiclesBatch(vehicles.map(mapApiVehicleToLocal));
        }
        return vehicles;
      } catch {
        // Fallback
      }
    }
    return findVehiclesByVisitPersonId(visitPersonId);
  });

  // Create vehicle for visit person
  ipcMain.handle("visit-persons:create-vehicle", async (_event, data: Record<string, unknown>) => {
    if (net.isOnline() && authToken) {
      try {
        const created = await postToApi<LocalVehicle>("/vehicles", data);
        upsertVehicle(mapApiVehicleToLocal(created));
        return created;
      } catch {
        // Fallback
      }
    }

    const localVehicle: LocalVehicle = {
      id: randomUUID(),
      tenant_id: data.tenant_id as string ?? "",
      user_id: null,
      visit_person_id: data.visitPersonId as string,
      vehicle_type: data.vehicleType as string,
      brand: (data.brand as string) ?? null,
      model: (data.model as string) ?? null,
      plate: (data.plate as string) ?? null,
      color: (data.color as string) ?? null,
      notes: (data.notes as string) ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertVehicle(localVehicle);
    enqueue("vehicle", localVehicle.id, "create", data);
    return localVehicle;
  });

  // Recent access events for visit person
  ipcMain.handle("visit-persons:recent-events", async (_event, visitPersonId: string) => {
    if (net.isOnline() && authToken) {
      try {
        const events = await fetchFromApi<LocalAccessEvent[]>(
          `/access-events/recent-visit-person/${visitPersonId}`,
        );
        if (events.length > 0) {
          upsertAccessEventsBatch(events.map(mapApiEventToLocal));
        }
        return events;
      } catch {
        // Fallback
      }
    }
    return findRecentByVisitPersonId(visitPersonId);
  });

  // Create access event
  ipcMain.handle("visit-persons:create-event", async (_event, data: Record<string, unknown>) => {
    const eventId = data.eventId as string ?? randomUUID();

    if (net.isOnline() && authToken) {
      try {
        const created = await postToApi<LocalAccessEvent>("/access-events", { ...data, eventId });
        upsertAccessEvent(mapApiEventToLocal(created));
        return created;
      } catch {
        // Fallback
      }
    }

    const localEvent: LocalAccessEvent = {
      id: randomUUID(),
      tenant_id: data.tenant_id as string ?? "",
      event_id: eventId,
      person_type: data.personType as string,
      user_id: null,
      visit_person_id: data.visitPersonId as string,
      direction: data.direction as "entry" | "exit",
      access_mode: data.accessMode as "vehicle" | "pedestrian",
      vehicle_id: (data.vehicleId as string) ?? null,
      notes: (data.notes as string) ?? null,
      source: "desktop",
      registered_by: data.registeredBy as string ?? "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertAccessEvent(localEvent);
    enqueue("access_event", localEvent.id, "create", { ...data, eventId });
    return localEvent;
  });

  // Update visit person (optimistic SQLite update + API/outbox)
  ipcMain.handle("visit-persons:update", async (_event, id: string, patch: Record<string, unknown>) => {
    const existing = findVisitPersonById(id);

    if (net.isOnline() && authToken) {
      try {
        const updated = await patchToApi<LocalVisitPerson>(`/visit-persons/${id}`, patch);
        upsertVisitPerson(mapApiPersonToLocal(updated));
        return updated;
      } catch {
        // Fallback to offline update
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

  // Get images for visit person
  ipcMain.handle("visit-persons:images", async (_event, visitPersonId: string) => {
    if (net.isOnline() && authToken) {
      try {
        return await fetchFromApi<unknown[]>(`/visit-persons/${visitPersonId}/images`);
      } catch {
        // Fallback
      }
    }
    return findImagesByVisitPersonId(visitPersonId);
  });

  // Upload image (save locally + enqueue sync)
  ipcMain.handle(
    "visit-persons:upload-image",
    async (_event, visitPersonId: string, imageType: string, imageData: Uint8Array) => {
      const buffer = Buffer.from(imageData);
      const localPath = saveImageLocally(visitPersonId, imageType, buffer);
      const id = randomUUID();

      // Replace existing image of same type
      const existing = findImageByTypeAndPerson(visitPersonId, imageType);
      if (existing) {
        deleteLocalImage(existing.local_path);
        deleteImageMeta(existing.id);
      }

      upsertImageMeta({
        id,
        tenant_id: "",
        visit_person_id: visitPersonId,
        image_type: imageType as "face" | "id_card" | "vehicle_plate" | "other",
        local_path: localPath,
        storage_path: null,
        created_at: new Date().toISOString(),
      });

      enqueue("image", id, "upload_image", {
        visitPersonId,
        imageType,
        localPath,
      });

      return { id, localPath, imageType };
    },
  );
}

// Map API camelCase response to local snake_case
function mapApiPersonToLocal(person: Record<string, unknown>): LocalVisitPerson {
  return {
    id: person.id as string,
    tenant_id: (person.tenantId ?? person.tenant_id) as string,
    code: person.code as string,
    type: (person.type as "visitor" | "service_provider"),
    status: (person.status as "allowed" | "flagged" | "denied"),
    full_name: (person.fullName ?? person.full_name) as string,
    phone: (person.phone as string) ?? null,
    company: (person.company as string) ?? null,
    resident_id: (person.residentId ?? person.resident_id) as string | null,
    resident_name: (person.residentName ?? person.resident_name) as string | null,
    notes: (person.notes as string) ?? null,
    registered_by: (person.registeredBy ?? person.registered_by) as string,
    created_at: (person.createdAt ?? person.created_at) as string,
    updated_at: (person.updatedAt ?? person.updated_at) as string,
  };
}

function mapApiVehicleToLocal(vehicle: Record<string, unknown>): LocalVehicle {
  return {
    id: vehicle.id as string,
    tenant_id: (vehicle.tenantId ?? vehicle.tenant_id) as string,
    user_id: (vehicle.userId ?? vehicle.user_id) as string | null,
    visit_person_id: (vehicle.visitPersonId ?? vehicle.visit_person_id) as string | null,
    vehicle_type: (vehicle.vehicleType ?? vehicle.vehicle_type) as string,
    brand: (vehicle.brand as string) ?? null,
    model: (vehicle.model as string) ?? null,
    plate: (vehicle.plate as string) ?? null,
    color: (vehicle.color as string) ?? null,
    notes: (vehicle.notes as string) ?? null,
    created_at: (vehicle.createdAt ?? vehicle.created_at) as string,
    updated_at: (vehicle.updatedAt ?? vehicle.updated_at) as string,
  };
}

function mapApiEventToLocal(event: Record<string, unknown>): LocalAccessEvent {
  return {
    id: event.id as string,
    tenant_id: (event.tenantId ?? event.tenant_id) as string,
    event_id: (event.eventId ?? event.event_id) as string,
    person_type: (event.personType ?? event.person_type) as string,
    user_id: (event.userId ?? event.user_id) as string | null,
    visit_person_id: (event.visitPersonId ?? event.visit_person_id) as string | null,
    direction: (event.direction as "entry" | "exit"),
    access_mode: (event.accessMode ?? event.access_mode) as "vehicle" | "pedestrian",
    vehicle_id: (event.vehicleId ?? event.vehicle_id) as string | null,
    notes: (event.notes as string) ?? null,
    source: (event.source as string) ?? "desktop",
    registered_by: (event.registeredBy ?? event.registered_by) as string,
    created_at: (event.createdAt ?? event.created_at) as string,
    updated_at: (event.updatedAt ?? event.updated_at) as string,
  };
}
