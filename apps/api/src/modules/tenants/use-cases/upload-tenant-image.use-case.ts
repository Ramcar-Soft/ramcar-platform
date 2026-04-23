import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { TenantsRepository } from "../tenants.repository";
import { TENANT_IMAGE_MAX_BYTES, TENANT_IMAGE_ALLOWED_MIME } from "@ramcar/shared";
import type { TenantScope } from "../../../common/utils/tenant-scope";

const BUCKET = "tenant-images";

@Injectable()
export class UploadTenantImageUseCase {
  private readonly logger = new Logger(UploadTenantImageUseCase.name);

  constructor(
    private readonly repository: TenantsRepository,
    private readonly supabase: SupabaseService,
  ) {}

  async execute(
    tenantId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    scope: TenantScope,
    _actorId: string,
  ) {
    if (!TENANT_IMAGE_ALLOWED_MIME.includes(file.mimetype as typeof TENANT_IMAGE_ALLOWED_MIME[number])) {
      throw new BadRequestException("tenants.validation.imageWrongType");
    }
    if (file.size > TENANT_IMAGE_MAX_BYTES) {
      throw new BadRequestException("tenants.validation.imageTooLarge");
    }

    const tenant = await this.repository.findById(tenantId, scope);
    if (tenant.image_path) {
      try {
        await this.supabase.getClient().storage.from(BUCKET).remove([tenant.image_path]);
      } catch (err) {
        this.logger.warn({ tenantId, orphan: tenant.image_path, err }, "Best-effort old image removal failed");
      }
    }

    const ext = file.mimetype.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const random = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    const objectPath = `tenants/${tenantId}/${ts}-${random}.${ext}`;

    const { error: uploadError } = await this.supabase
      .getClient()
      .storage.from(BUCKET)
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) throw uploadError;

    return this.repository.setImagePath(tenantId, objectPath);
  }
}
