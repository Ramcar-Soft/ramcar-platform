import type { Role, UserProfile } from "../types/auth";

interface SupabaseUserLike {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
}

export function extractUserProfile(user: SupabaseUserLike): UserProfile {
  const meta = user.app_metadata;
  return {
    id: (meta.profile_id as string) ?? user.id,
    userId: user.id,
    tenantId: (meta.tenant_id as string) ?? "",
    email: user.email ?? "",
    fullName: (meta.full_name as string) ?? "",
    role: (meta.role as Role) ?? "resident",
  };
}
