import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { imageTypeEnum } from "@ramcar/shared";
import { VisitPersonImagesService } from "./visit-person-images.service";

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin", "guard")
export class VisitPersonImagesController {
  constructor(
    private readonly imagesService: VisitPersonImagesService,
  ) {}

  @Post("visit-persons/:id/images")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Param("id") visitPersonId: string,
    @Body("imageType") imageTypeRaw: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @CurrentTenant() tenantId: string,
  ) {
    const imageType = imageTypeEnum.parse(imageTypeRaw);
    return this.imagesService.upload(tenantId, visitPersonId, imageType, file);
  }

  @Get("visit-persons/:id/images")
  async findByVisitPerson(
    @Param("id") visitPersonId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.imagesService.findByVisitPersonId(visitPersonId, tenantId);
  }

  @Delete("visit-person-images/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.imagesService.deleteById(id, tenantId);
  }
}
