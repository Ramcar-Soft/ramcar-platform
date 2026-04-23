import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import {
  accessEventExportQuerySchema,
  accessEventListQuerySchema,
  updateAccessEventSchema,
} from "@ramcar/shared";
import { UsersService } from "../users/users.service";
import { AccessEventsService } from "./access-events.service";
import { createAccessEventSchema } from "./dto/create-access-event.dto";
import type { TenantScope } from "../../common/utils/tenant-scope";

@Controller("access-events")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin", "guard")
export class AccessEventsController {
  constructor(
    private readonly accessEventsService: AccessEventsService,
    private readonly usersService: UsersService,
  ) {}

  @Get("export")
  @Roles("super_admin", "admin")
  @Header("Cache-Control", "no-store")
  async export(
    @Query() query: Record<string, string>,
    @CurrentTenant() scope: TenantScope,
    @Res({ passthrough: true }) res: Response,
  ) {
    const dto = accessEventExportQuerySchema.parse(query);
    const file = await this.accessEventsService.exportCsv(dto, scope);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    });
    return file;
  }

  @Get()
  @Roles("super_admin", "admin")
  async list(
    @Query() query: Record<string, string>,
    @CurrentTenant() scope: TenantScope,
  ) {
    const dto = accessEventListQuerySchema.parse(query);
    return this.accessEventsService.list(dto, scope);
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: { id: string },
    @CurrentTenant() scope: TenantScope,
  ) {
    const dto = createAccessEventSchema.parse(body);
    const profileId = await this.usersService.getProfileIdByAuthUserId(user.id);
    return this.accessEventsService.create(dto, scope, profileId);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentTenant() scope: TenantScope,
  ) {
    const dto = updateAccessEventSchema.parse(body);
    return this.accessEventsService.update(id, dto, scope);
  }

  @Get("recent/:userId")
  async findRecentByUserId(
    @Param("userId") userId: string,
    @CurrentTenant() scope: TenantScope,
  ) {
    return this.accessEventsService.findRecentByUserId(userId, scope);
  }

  @Get("recent-visit-person/:visitPersonId")
  async findRecentByVisitPersonId(
    @Param("visitPersonId") visitPersonId: string,
    @CurrentTenant() scope: TenantScope,
  ) {
    return this.accessEventsService.findRecentByVisitPersonId(visitPersonId, scope);
  }

  @Get("last/:userId")
  async findLastByUserId(
    @Param("userId") userId: string,
    @CurrentTenant() scope: TenantScope,
  ) {
    return this.accessEventsService.findLastByUserId(userId, scope);
  }
}
