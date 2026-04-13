import { app } from "electron";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getDatabase } from "./database";

export interface LocalImageMeta {
  id: string;
  tenant_id: string;
  visit_person_id: string;
  image_type: "face" | "id_card" | "vehicle_plate" | "other";
  local_path: string;
  storage_path: string | null;
  created_at: string;
}

function getImagesDir(): string {
  const dir = join(app.getPath("userData"), "images");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function saveImageLocally(
  visitPersonId: string,
  imageType: string,
  data: Buffer,
): string {
  const dir = join(getImagesDir(), visitPersonId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filename = `${imageType}_${Date.now()}.jpg`;
  const filePath = join(dir, filename);
  writeFileSync(filePath, data);
  return filePath;
}

export function deleteLocalImage(localPath: string): void {
  if (existsSync(localPath)) {
    unlinkSync(localPath);
  }
}

export function upsertImageMeta(meta: LocalImageMeta): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO visit_person_images_meta (id, tenant_id, visit_person_id, image_type, local_path, storage_path, created_at)
    VALUES (@id, @tenant_id, @visit_person_id, @image_type, @local_path, @storage_path, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      local_path = @local_path, storage_path = @storage_path
  `).run(meta);
}

export function findImagesByVisitPersonId(visitPersonId: string): LocalImageMeta[] {
  const db = getDatabase();
  return db.prepare(
    "SELECT * FROM visit_person_images_meta WHERE visit_person_id = ? ORDER BY created_at DESC"
  ).all(visitPersonId) as LocalImageMeta[];
}

export function findImageByTypeAndPerson(
  visitPersonId: string,
  imageType: string,
): LocalImageMeta | undefined {
  const db = getDatabase();
  return db.prepare(
    "SELECT * FROM visit_person_images_meta WHERE visit_person_id = ? AND image_type = ?"
  ).get(visitPersonId, imageType) as LocalImageMeta | undefined;
}

export function deleteImageMeta(id: string): void {
  const db = getDatabase();
  db.prepare("DELETE FROM visit_person_images_meta WHERE id = ?").run(id);
}

export function findUnsyncedImages(): LocalImageMeta[] {
  const db = getDatabase();
  return db.prepare(
    "SELECT * FROM visit_person_images_meta WHERE storage_path IS NULL"
  ).all() as LocalImageMeta[];
}

export function markImageSynced(id: string, storagePath: string): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE visit_person_images_meta SET storage_path = ? WHERE id = ?"
  ).run(storagePath, id);
}
