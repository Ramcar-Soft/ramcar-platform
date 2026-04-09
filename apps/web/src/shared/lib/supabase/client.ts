// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
