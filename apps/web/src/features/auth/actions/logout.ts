"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import type { Locale } from "@ramcar/i18n";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = (await getLocale()) as Locale;
  revalidatePath("/", "layout");
  redirect({ href: "/login", locale });
}
