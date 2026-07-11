export function getSupabaseConfig() {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? normalizeEnvValue(process.env.SUPABASE_URL);
  const publishableKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    ?? normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ?? normalizeEnvValue(process.env.SUPABASE_ANON_KEY);

  if (!url || !publishableKey) return null;

  return {
    url,
    publishableKey
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getMissingSupabaseEnvVars(): string[] {
  const missing: string[] = [];

  if (!normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) && !normalizeEnvValue(process.env.SUPABASE_URL)) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_URL");
  }

  if (!normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    && !normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    && !normalizeEnvValue(process.env.SUPABASE_ANON_KEY)) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY oder NEXT_PUBLIC_SUPABASE_ANON_KEY oder SUPABASE_ANON_KEY");
  }

  return missing;
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}
