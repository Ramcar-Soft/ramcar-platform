// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component where cookies cannot be set.
            // This can be ignored if middleware refreshes sessions.
          }
        },
      },
    },
  );
}
