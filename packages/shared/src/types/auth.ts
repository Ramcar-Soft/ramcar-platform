export type Role = "super_admin" | "admin" | "guard" | "resident";

export interface UserProfile {
  id: string;
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
