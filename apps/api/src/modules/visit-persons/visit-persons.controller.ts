import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { UsersService } from "../users/users.service";
import { VisitPersonsService } from "./visit-persons.service";
import { createVisitPersonSchema } from "./dto/create-visit-person.dto";
import { updateVisitPersonSchema } from "./dto/update-visit-person.dto";
import { visitPersonFiltersSchema } from "./dto/visit-person-filters.dto";

@Controller("visit-persons")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin", "guard")
export class VisitPersonsController {
  constructor(
    private readonly visitPersonsService: VisitPersonsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async list(
    @Query() query: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    const filters = visitPersonFiltersSchema.parse(query);
    return this.visitPersonsService.list(filters, tenantId);
  }

  @Get(":id")
  async findById(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.visitPersonsService.findById(id, tenantId);
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: { id: string },
    @CurrentTenant() tenantId: string,
  ) {
    const dto = createVisitPersonSchema.parse(body);
    const profileId = await this.usersService.getProfileIdByAuthUserId(user.id);
    return this.visitPersonsService.create(dto, tenantId, profileId);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    const dto = updateVisitPersonSchema.parse(body);
    return this.visitPersonsService.update(id, dto, tenantId);
  }
}
