import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { UsersService } from "./users.service";
import { userFiltersSchema } from "./dto/user-filters.dto";
import { createUserSchema } from "./dto/create-user.dto";
import { updateUserSchema } from "./dto/update-user.dto";
import { toggleStatusSchema } from "@ramcar/shared";
import type { TenantScope } from "../../common/utils/tenant-scope";

@Controller("users")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(
    @Query() query: Record<string, string>,
    @CurrentUser() user: unknown,
    @CurrentTenant() scope: TenantScope,
  ) {
    const filters = userFiltersSchema.parse(query);
    return this.usersService.list(
      filters,
      user as { id: string; app_metadata?: { role?: string; tenant_id?: string } },
      scope,
    );
  }

  @Get(":id")
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: unknown,
    @CurrentTenant() scope: TenantScope,
  ) {
    return this.usersService.getById(
      id,
      user as { id: string; app_metadata?: { role?: string; tenant_id?: string } },
      scope,
    );
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: unknown,
    @CurrentTenant() scope: TenantScope,
  ) {
    const dto = createUserSchema.parse(body);
    return this.usersService.create(
      dto,
      user as { id: string; app_metadata?: { role?: string; tenant_id?: string } },
      scope,
    );
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentUser() user: unknown,
    @CurrentTenant() scope: TenantScope,
  ) {
    const dto = updateUserSchema.parse(body);
    return this.usersService.update(
      id,
      dto,
      user as { id: string; app_metadata?: { role?: string; tenant_id?: string } },
      scope,
    );
  }

  @Patch(":id/status")
  async toggleStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentUser() user: unknown,
    @CurrentTenant() scope: TenantScope,
  ) {
    const { status } = toggleStatusSchema.parse(body);
    return this.usersService.toggleStatus(
      id,
      status,
      user as { id: string; app_metadata?: { role?: string; tenant_id?: string } },
      scope,
    );
  }
}
