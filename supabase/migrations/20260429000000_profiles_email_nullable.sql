-- Make profiles.email nullable so users can be created without an email address.
-- Supabase Auth still requires an email; the API generates a synthetic
-- "<uuid>@no-email.local" placeholder for auth.users in that case, while
-- profiles.email is stored as NULL.

alter table public.profiles
  alter column email drop not null;
