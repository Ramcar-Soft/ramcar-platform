import type { Role, UserProfile } from "../types/auth";

// Suffix used by the API when a user is created without an email. The address
// satisfies Supabase Auth's email-or-phone requirement but represents "no email"
// at the UI layer; we strip it here so the logged-in user's profile mirrors
// the NULL stored in the profiles row.
export const NO_EMAIL_SUFFIX = "@no-email.local";

interface SupabaseUserLike {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
}

export function extractUserProfile(user: SupabaseUserLike): UserProfile {
  const meta = user.app_metadata;
  const rawEmail = user.email ?? "";
  const email = rawEmail.endsWith(NO_EMAIL_SUFFIX) ? null : rawEmail || null;
  return {
    id: (meta.profile_id as string) ?? user.id,
    userId: user.id,
    tenantId: (meta.tenant_id as string) ?? "",
    email,
    fullName: (meta.full_name as string) ?? "",
    role: (meta.role as Role) ?? "resident",
  };
}
