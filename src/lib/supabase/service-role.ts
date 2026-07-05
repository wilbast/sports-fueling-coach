import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createServiceRoleClient() {
  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!config || !serviceRoleKey) {
    throw new Error("Supabase Service Role ist nicht konfiguriert.");
  }

  return createClient(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(getSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getMissingServiceRoleEnvVars(): string[] {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? [] : ["SUPABASE_SERVICE_ROLE_KEY"];
}
