-- Feature 020 (FR-028a): SECURITY DEFINER function to keep
-- auth.users.raw_app_meta_data in lockstep with user_tenants without relying
-- on the GoTrue Admin API. The Auth Admin API rejects HS256-signed service
-- role JWTs when the project is configured with asymmetric signing keys,
-- which breaks auth.admin.updateUserById-based writebacks. Going through
-- PostgREST + a SECURITY DEFINER function avoids that entire failure mode.

CREATE OR REPLACE FUNCTION public.sync_user_app_metadata(
  p_user_id uuid,
  p_patch jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || p_patch
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auth user % not found', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_user_app_metadata(uuid, jsonb) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sync_user_app_metadata(uuid, jsonb) TO service_role;
