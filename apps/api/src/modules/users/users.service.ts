import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  canModifyUser,
  getAssignableRoles,
  ROLE_HIERARCHY,
  type Role,
  type ExtendedUserProfile,
  type PaginatedResponse,
} from "@ramcar/shared";
import { UsersRepository } from "./users.repository";
import { UserGroupsService } from "../user-groups/user-groups.service";
import type { UserFiltersDto } from "./dto/user-filters.dto";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { UserStatus } from "@ramcar/shared";

interface AuthUser {
  id: string;
  app_metadata?: {
    role?: string;
    tenant_id?: string;
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly userGroupsService: UserGroupsService,
  ) {}

  async list(
    filters: UserFiltersDto,
    actorUser: AuthUser,
    actorTenantId: string,
  ): Promise<PaginatedResponse<ExtendedUserProfile>> {
    const actorRole = (actorUser.app_metadata?.role ?? "resident") as Role;
    const tenantScope = actorRole === "super_admin" ? undefined : actorTenantId;

    const { data, total } = await this.repository.list(filters, tenantScope);
    const allGroups = await this.userGroupsService.findAll();
    const groupMap = new Map(allGroups.map((g) => [g.id, g.name]));

    const users: ExtendedUserProfile[] = data.map((row) =>
      this.mapProfileRow(row, actorRole, groupMap),
    );

    const { page, pageSize } = filters;
    return {
      data: users,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(
    id: string,
    actorUser: AuthUser,
    actorTenantId: string,
  ): Promise<ExtendedUserProfile> {
    const row = await this.repository.getById(id);
    if (!row) throw new NotFoundException("User not found");

    const actorRole = (actorUser.app_metadata?.role ?? "resident") as Role;
    if (actorRole !== "super_admin" && row.tenant_id !== actorTenantId) {
      throw new NotFoundException("User not found");
    }

    const allGroups = await this.userGroupsService.findAll();
    const groupMap = new Map(allGroups.map((g) => [g.id, g.name]));

    return this.mapProfileRow(row, actorRole, groupMap);
  }

  async create(
    dto: CreateUserDto,
    actorUser: AuthUser,
    actorTenantId: string,
  ) {
    const actorRole = (actorUser.app_metadata?.role ?? "resident") as Role;

    const assignableRoles = getAssignableRoles(actorRole);
    if (!assignableRoles.includes(dto.role as Role)) {
      throw new ForbiddenException(
        `Cannot assign role "${dto.role}" with your current permissions`,
      );
    }

    if (actorRole !== "super_admin" && dto.tenantId !== actorTenantId) {
      throw new ForbiddenException("Cannot create users in another tenant");
    }

    const emailExists = await this.repository.checkEmailExists(dto.email);
    if (emailExists) {
      throw new ConflictException("A user with this email already exists");
    }

    if (dto.username) {
      const usernameExists = await this.repository.checkUsernameExists(
        dto.username,
      );
      if (usernameExists) {
        throw new ConflictException(
          "A user with this username already exists",
        );
      }
    }

    const { profile } = await this.repository.create(dto);

    const allGroups = await this.userGroupsService.findAll();
    const groupMap = new Map(allGroups.map((g) => [g.id, g.name]));

    return this.mapProfileRow(profile, actorRole, groupMap);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorUser: AuthUser,
    actorTenantId: string,
  ) {
    const target = await this.repository.getById(id);
    if (!target) throw new NotFoundException("User not found");

    const actorRole = (actorUser.app_metadata?.role ?? "resident") as Role;
    const targetRole = target.role as Role;

    if (actorRole !== "super_admin" && target.tenant_id !== actorTenantId) {
      throw new NotFoundException("User not found");
    }

    if (!canModifyUser(actorRole, targetRole)) {
      throw new ForbiddenException(
        "Cannot edit a user with a higher or equal role",
      );
    }

    if (dto.role) {
      const assignableRoles = getAssignableRoles(actorRole);
      if (!assignableRoles.includes(dto.role as Role)) {
        throw new ForbiddenException(`Cannot assign role "${dto.role}"`);
      }
    }

    if (dto.email) {
      const emailExists = await this.repository.checkEmailExists(
        dto.email,
        id,
      );
      if (emailExists) {
        throw new ConflictException("A user with this email already exists");
      }
    }

    if (dto.username) {
      const usernameExists = await this.repository.checkUsernameExists(
        dto.username,
        id,
      );
      if (usernameExists) {
        throw new ConflictException(
          "A user with this username already exists",
        );
      }
    }

    const profile = await this.repository.update(id, dto);

    const allGroups = await this.userGroupsService.findAll();
    const groupMap = new Map(allGroups.map((g) => [g.id, g.name]));

    return this.mapProfileRow(profile, actorRole, groupMap);
  }

  async toggleStatus(
    id: string,
    status: UserStatus,
    actorUser: AuthUser,
    actorTenantId: string,
  ) {
    const target = await this.repository.getById(id);
    if (!target) throw new NotFoundException("User not found");

    const actorRole = (actorUser.app_metadata?.role ?? "resident") as Role;
    const targetRole = target.role as Role;

    if (actorRole !== "super_admin" && target.tenant_id !== actorTenantId) {
      throw new NotFoundException("User not found");
    }

    if (target.user_id === actorUser.id) {
      throw new ForbiddenException("Cannot deactivate your own account");
    }

    if (!canModifyUser(actorRole, targetRole)) {
      throw new ForbiddenException(
        "Cannot change status of a user with a higher role",
      );
    }

    if (status === "inactive" && targetRole === "super_admin") {
      const activeCount = await this.repository.countActiveSuperAdmins();
      if (activeCount <= 1) {
        throw new ForbiddenException(
          "Cannot deactivate the last active super admin",
        );
      }
    }

    const profile = await this.repository.toggleStatus(id, status);

    const allGroups = await this.userGroupsService.findAll();
    const groupMap = new Map(allGroups.map((g) => [g.id, g.name]));

    return this.mapProfileRow(profile, actorRole, groupMap);
  }

  private mapProfileRow(
    row: Record<string, unknown>,
    actorRole: Role,
    groupMap: Map<string, string>,
  ): ExtendedUserProfile {
    const targetRole = row.role as Role;
    const userGroupIds = (row.user_group_ids as string[]) ?? [];
    const tenantData = row.tenants as { name: string } | null;

    return {
      id: row.id as string,
      userId: row.user_id as string,
      tenantId: row.tenant_id as string,
      tenantName: tenantData?.name ?? "",
      fullName: row.full_name as string,
      email: row.email as string,
      role: targetRole,
      address: (row.address as string) ?? null,
      username: (row.username as string) ?? null,
      phone: (row.phone as string) ?? null,
      phoneType: (row.phone_type as ExtendedUserProfile["phoneType"]) ?? null,
      status: (row.status as ExtendedUserProfile["status"]) ?? "active",
      userGroupIds,
      userGroups: userGroupIds
        .filter((gid) => groupMap.has(gid))
        .map((gid) => ({ id: gid, name: groupMap.get(gid)! })),
      observations: (row.observations as string) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      canEdit:
        ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole],
      canDeactivate:
        ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole],
    };
  }
}
