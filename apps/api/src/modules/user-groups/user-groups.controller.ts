import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserGroupsService } from "./user-groups.service";

@Controller("user-groups")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin")
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Get()
  async findAll() {
    const data = await this.userGroupsService.findAll();
    return { data };
  }
}
