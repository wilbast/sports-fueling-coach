"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

export { isSupabaseConfigured };

export function createClient() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  return createBrowserClient(config.url, config.publishableKey);
}
