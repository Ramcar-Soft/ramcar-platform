import { getDatabase } from "./database";

export interface LocalVehicle {
  id: string;
  tenant_id: string;
  user_id: string | null;
  visit_person_id: string | null;
  vehicle_type: string;
  brand: string | null;
  model: string | null;
  plate: string | null;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function upsertVehicle(vehicle: LocalVehicle): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO vehicles (id, tenant_id, user_id, visit_person_id, vehicle_type, brand, model, plate, color, notes, created_at, updated_at)
    VALUES (@id, @tenant_id, @user_id, @visit_person_id, @vehicle_type, @brand, @model, @plate, @color, @notes, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      brand = @brand, model = @model, plate = @plate, color = @color, notes = @notes, updated_at = @updated_at
  `).run(vehicle);
}

export function upsertVehiclesBatch(vehicles: LocalVehicle[]): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO vehicles (id, tenant_id, user_id, visit_person_id, vehicle_type, brand, model, plate, color, notes, created_at, updated_at)
    VALUES (@id, @tenant_id, @user_id, @visit_person_id, @vehicle_type, @brand, @model, @plate, @color, @notes, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      brand = @brand, model = @model, plate = @plate, color = @color, notes = @notes, updated_at = @updated_at
  `);
  const batch = db.transaction((items: LocalVehicle[]) => {
    for (const item of items) stmt.run(item);
  });
  batch(vehicles);
}

export function findVehiclesByVisitPersonId(visitPersonId: string): LocalVehicle[] {
  const db = getDatabase();
  return db.prepare("SELECT * FROM vehicles WHERE visit_person_id = ?").all(visitPersonId) as LocalVehicle[];
}

export function findVehiclesByUserId(userId: string): LocalVehicle[] {
  const db = getDatabase();
  return db.prepare("SELECT * FROM vehicles WHERE user_id = ?").all(userId) as LocalVehicle[];
}
