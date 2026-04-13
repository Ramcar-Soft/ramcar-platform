import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { UsersService } from "../users/users.service";
import { AccessEventsService } from "./access-events.service";
import { createAccessEventSchema } from "./dto/create-access-event.dto";

@Controller("access-events")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin", "guard")
export class AccessEventsController {
  constructor(
    private readonly accessEventsService: AccessEventsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: { id: string },
    @CurrentTenant() tenantId: string,
  ) {
    const dto = createAccessEventSchema.parse(body);
    const profileId = await this.usersService.getProfileIdByAuthUserId(user.id);
    return this.accessEventsService.create(dto, tenantId, profileId);
  }

  @Get("recent/:userId")
  async findRecentByUserId(
    @Param("userId") userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accessEventsService.findRecentByUserId(userId, tenantId);
  }

  @Get("recent-visit-person/:visitPersonId")
  async findRecentByVisitPersonId(
    @Param("visitPersonId") visitPersonId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accessEventsService.findRecentByVisitPersonId(
      visitPersonId,
      tenantId,
    );
  }

  @Get("last/:userId")
  async findLastByUserId(
    @Param("userId") userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accessEventsService.findLastByUserId(userId, tenantId);
  }
}
