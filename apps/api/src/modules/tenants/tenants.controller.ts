import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { SkipTenant } from "../../common/decorators/skip-tenant.decorator";
import { TenantsService } from "./tenants.service";
import {
  createTenantSchema,
  updateTenantSchema,
  tenantListQuerySchema,
  TENANT_IMAGE_MAX_BYTES,
} from "@ramcar/shared";
import { acceptImageMimes } from "./utils/accept-image-mimes";
import type { TenantScope } from "../../common/utils/tenant-scope";
import { UploadTenantImageUseCase } from "./use-cases/upload-tenant-image.use-case";
import { DeleteTenantImageUseCase } from "./use-cases/delete-tenant-image.use-case";

@Controller("tenants")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin", "guard")
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly uploadTenantImage: UploadTenantImageUseCase,
    private readonly deleteTenantImage: DeleteTenantImageUseCase,
  ) {}

  @Get()
  @SkipTenant()
  async list(
    @Query() query: Record<string, string>,
    @CurrentTenant() scope: TenantScope,
  ) {
    const parsed = tenantListQuerySchema.parse(query);
    const { data, total } = await this.tenantsService.list(scope, parsed);
    return {
      data,
      meta: {
        page: parsed.page,
        page_size: parsed.page_size,
        total,
        total_pages: Math.ceil(total / parsed.page_size),
      },
    };
  }

  @Get(":id")
  async findById(
    @Param("id") id: string,
    @CurrentTenant() scope: TenantScope,
  ) {
    return this.tenantsService.findById(id, scope);
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: { id: string },
    @CurrentTenant() scope: TenantScope,
  ) {
    const dto = createTenantSchema.parse(body);
    return this.tenantsService.create(dto, scope, user.id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentTenant() scope: TenantScope,
  ) {
    const dto = updateTenantSchema.parse(body);
    return this.tenantsService.update(id, dto, scope);
  }

  @Post(":id/image")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: TENANT_IMAGE_MAX_BYTES },
      fileFilter: acceptImageMimes,
    }),
  )
  async uploadImage(
    @Param("id") id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @CurrentUser() user: { id: string },
    @CurrentTenant() scope: TenantScope,
  ) {
    return this.uploadTenantImage.execute(id, file, scope, user.id);
  }

  @Delete(":id/image")
  @HttpCode(HttpStatus.OK)
  async deleteImage(
    @Param("id") id: string,
    @CurrentTenant() scope: TenantScope,
  ) {
    return this.deleteTenantImage.execute(id, scope);
  }
}
