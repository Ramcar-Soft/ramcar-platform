import { Module } from "@nestjs/common";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";
import { TenantsRepository } from "./tenants.repository";
import { CreateTenantUseCase } from "./use-cases/create-tenant.use-case";
import { UploadTenantImageUseCase } from "./use-cases/upload-tenant-image.use-case";
import { DeleteTenantImageUseCase } from "./use-cases/delete-tenant-image.use-case";

@Module({
  controllers: [TenantsController],
  providers: [
    TenantsService,
    TenantsRepository,
    CreateTenantUseCase,
    UploadTenantImageUseCase,
    DeleteTenantImageUseCase,
  ],
  exports: [TenantsService],
})
export class TenantsModule {}
