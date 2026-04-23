import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import type { VisitPersonImage } from "@ramcar/shared";

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import { VisitPersonImagesRepository } from "./visit-person-images.repository";
import type { TenantScope } from "../../common/utils/tenant-scope";

const BUCKET = "visit-person-images";
const SIGNED_URL_TTL = 3600;

function scopeToTenantId(scope: TenantScope): string {
  if (scope.scope === "single") return scope.tenantId;
  if (scope.scope === "list") return scope.tenantIds[0] ?? "";
  return "";
}

@Injectable()
export class VisitPersonImagesService {
  constructor(
    private readonly repository: VisitPersonImagesRepository,
    private readonly supabase: SupabaseService,
  ) {}

  async upload(
    scope: TenantScope,
    visitPersonId: string,
    imageType: string,
    file: UploadedFile,
  ): Promise<VisitPersonImage> {
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("File must be an image");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException("File must be under 5MB");
    }

    const tenantId = scopeToTenantId(scope);

    const existing = await this.repository.findByPersonAndType(
      visitPersonId,
      imageType,
      scope,
    );

    if (existing) {
      await this.supabase
        .getClient()
        .storage.from(BUCKET)
        .remove([existing.storage_path as string]);
      await this.repository.deleteById(existing.id as string, scope);
    }

    const timestamp = Date.now();
    const storagePath = `${tenantId}/visit-persons/${visitPersonId}/${imageType}_${timestamp}.jpg`;

    const { error: uploadError } = await this.supabase
      .getClient()
      .storage.from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const row = await this.repository.create(
      tenantId,
      visitPersonId,
      imageType,
      storagePath,
    );

    return this.mapRowWithSignedUrl(row);
  }

  async findByVisitPersonId(
    visitPersonId: string,
    scope: TenantScope,
  ): Promise<VisitPersonImage[]> {
    const rows = await this.repository.findByVisitPersonId(visitPersonId, scope);
    return Promise.all(rows.map((row) => this.mapRowWithSignedUrl(row)));
  }

  async deleteById(id: string, scope: TenantScope): Promise<void> {
    const row = await this.repository.findById(id, scope);
    if (!row) throw new NotFoundException("Image not found");

    await this.supabase
      .getClient()
      .storage.from(BUCKET)
      .remove([row.storage_path as string]);

    await this.repository.deleteById(id, scope);
  }

  private async mapRowWithSignedUrl(
    row: Record<string, unknown>,
  ): Promise<VisitPersonImage> {
    const storagePath = row.storage_path as string;
    const { data } = await this.supabase
      .getClient()
      .storage.from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      visitPersonId: row.visit_person_id as string,
      imageType: row.image_type as VisitPersonImage["imageType"],
      storagePath,
      signedUrl: data?.signedUrl,
      createdAt: row.created_at as string,
    };
  }
}
