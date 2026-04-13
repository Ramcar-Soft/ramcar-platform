import { getDatabase } from "./database";

export interface LocalVisitPerson {
  id: string;
  tenant_id: string;
  code: string;
  type: "visitor" | "service_provider";
  status: "allowed" | "flagged" | "denied";
  full_name: string;
  phone: string | null;
  company: string | null;
  resident_id: string | null;
  resident_name: string | null;
  notes: string | null;
  registered_by: string;
  created_at: string;
  updated_at: string;
}

export interface VisitPersonFilters {
  tenant_id: string;
  type?: "visitor" | "service_provider";
  search?: string;
  status?: "allowed" | "flagged" | "denied";
  page?: number;
  pageSize?: number;
}

export function upsertVisitPerson(person: LocalVisitPerson): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO visit_persons (id, tenant_id, code, type, status, full_name, phone, company, resident_id, resident_name, notes, registered_by, created_at, updated_at)
    VALUES (@id, @tenant_id, @code, @type, @status, @full_name, @phone, @company, @resident_id, @resident_name, @notes, @registered_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      status = @status, full_name = @full_name, phone = @phone, company = @company,
      resident_id = @resident_id, resident_name = @resident_name, notes = @notes, updated_at = @updated_at
  `);
  stmt.run(person);
}

export function upsertVisitPersonsBatch(persons: LocalVisitPerson[]): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO visit_persons (id, tenant_id, code, type, status, full_name, phone, company, resident_id, resident_name, notes, registered_by, created_at, updated_at)
    VALUES (@id, @tenant_id, @code, @type, @status, @full_name, @phone, @company, @resident_id, @resident_name, @notes, @registered_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      status = @status, full_name = @full_name, phone = @phone, company = @company,
      resident_id = @resident_id, resident_name = @resident_name, notes = @notes, updated_at = @updated_at
  `);
  const batch = db.transaction((items: LocalVisitPerson[]) => {
    for (const item of items) stmt.run(item);
  });
  batch(persons);
}

export function findVisitPersonById(id: string): LocalVisitPerson | undefined {
  const db = getDatabase();
  return db.prepare("SELECT * FROM visit_persons WHERE id = ?").get(id) as LocalVisitPerson | undefined;
}

export function listVisitPersons(filters: VisitPersonFilters): { data: LocalVisitPerson[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = ["tenant_id = @tenant_id"];
  const params: Record<string, unknown> = { tenant_id: filters.tenant_id };

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

  const total = (db.prepare(`SELECT COUNT(*) as count FROM visit_persons WHERE ${where}`).get(params) as { count: number }).count;
  const data = db.prepare(`SELECT * FROM visit_persons WHERE ${where} ORDER BY full_name ASC LIMIT @limit OFFSET @offset`).all({ ...params, limit: pageSize, offset }) as LocalVisitPerson[];

  return { data, total };
}
