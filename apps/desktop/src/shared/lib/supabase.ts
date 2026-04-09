// AUTH & REALTIME ONLY — Do not use .from(), .rpc(), or .storage on this client.
// All database operations must go through NestJS API endpoints.
// See Constitution Principle VIII and CLAUDE.md Data Access Rules.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
