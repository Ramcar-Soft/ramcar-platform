import type { Role } from "./auth";

export type PhoneType = "house" | "cellphone" | "work" | "primary";

export type UserStatus = "active" | "inactive";

export interface UserGroup {
  id: string;
  name: string;
}

export interface ExtendedUserProfile {
  id: string;
  userId: string;
  tenantId: string;
  tenantName: string;
  tenantIds: string[];
  fullName: string;
  email: string;
  role: Role;
  address: string | null;
  username: string | null;
  phone: string | null;
  phoneType: PhoneType | null;
  status: UserStatus;
  userGroupIds: string[];
  userGroups: UserGroup[];
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDeactivate: boolean;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface UserFilters {
  search?: string;
  tenantId?: string;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 4,
  admin: 3,
  guard: 2,
  resident: 1,
};

export function canModifyUser(actorRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole];
}

export function getAssignableRoles(actorRole: Role): Role[] {
  if (actorRole === "super_admin") {
    return ["super_admin", "admin", "guard", "resident"];
  }
  if (actorRole === "admin") {
    return ["guard", "resident"];
  }
  return [];
}
