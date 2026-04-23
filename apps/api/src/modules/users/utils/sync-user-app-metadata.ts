import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@ramcar/shared";

export type TenantIdsClaim = string[] | "*";

export type UserAppMetadataPatch = {
  tenant_ids?: TenantIdsClaim;
  tenant_id?: string | null;
  role?: Role;
};

/**
 * FR-028a: mirror a patch into `auth.users.raw_app_meta_data` via the
 * `public.sync_user_app_metadata(uuid, jsonb)` SECURITY DEFINER function.
 *
 * We deliberately go through PostgREST + RPC instead of the GoTrue Admin API
 * (`auth.admin.updateUserById`) because the Admin API rejects HS256 service
 * role JWTs once the project is configured with asymmetric signing keys,
 * while PostgREST keeps accepting the same key. The SQL function performs a
 * shallow JSONB merge (`|| p_patch`) so existing keys (`role`, `tenant_id`,
 * app-specific flags) are preserved.
 */
export async function syncUserAppMetadata(
  supabase: SupabaseClient,
  userId: string,
  patch: UserAppMetadataPatch,
): Promise<void> {
  const jsonPatch: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(patch, "tenant_ids")) {
    jsonPatch.tenant_ids = patch.tenant_ids;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "tenant_id")) {
    jsonPatch.tenant_id = patch.tenant_id;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "role")) {
    jsonPatch.role = patch.role;
  }

  if (Object.keys(jsonPatch).length === 0) return;

  const { error } = await supabase.rpc("sync_user_app_metadata", {
    p_user_id: userId,
    p_patch: jsonPatch,
  });
  if (error) throw error;
}
