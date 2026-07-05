"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeRedirectPath(String(formData.get("next") ?? "/today"));

  if (!isSupabaseConfigured()) {
    redirect(`/login?error=missing-config&next=${encodeURIComponent(next)}`);
  }

  if (!email || !password) {
    redirect(`/login?error=missing-fields&next=${encodeURIComponent(next)}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?error=invalid-login&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

function sanitizeRedirectPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/today";
  if (value.startsWith("/login")) return "/today";

  return value;
}
