import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createServiceRoleClient() {
  const config = getSupabaseConfig();
  const serviceRoleKey = getServiceRoleKey();

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
  return Boolean(getSupabaseConfig() && getServiceRoleKey());
}

export function getMissingServiceRoleEnvVars(): string[] {
  return getServiceRoleKey() ? [] : ["SUPABASE_SERVICE_ROLE_KEY oder SUPABASE_SERVICE_KEY"];
}

export function hasServiceRoleEnvValue(): boolean {
  return Boolean(getServiceRoleKey());
}

function getServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || undefined;
}
