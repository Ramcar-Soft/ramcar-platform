"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { loginSchema } from "@ramcar/shared";
import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import type { Locale } from "@ramcar/i18n";

export type LoginState = {
  error: string;
} | null;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  const locale = (await getLocale()) as Locale;
  revalidatePath("/", "layout");
  return redirect({ href: "/dashboard", locale });
}
