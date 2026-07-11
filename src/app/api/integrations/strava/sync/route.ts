import { NextResponse } from "next/server";
import { syncStravaActivities } from "@/lib/integrations/activity-sync";
import { getMissingStravaEnvVars } from "@/lib/integrations/strava";
import { getMissingSupabaseEnvVars, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getMissingServiceRoleEnvVars } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const missingEnv = [
    ...getMissingSupabaseEnvVars(),
    ...getMissingServiceRoleEnvVars(),
    ...getMissingStravaEnvVars()
  ];

  if (missingEnv.length > 0 || !isSupabaseConfigured()) {
    return NextResponse.json({
      error: `Strava ist serverseitig nicht vollständig konfiguriert. Fehlend: ${missingEnv.join(", ") || "Supabase-Konfiguration"}.`,
      missingEnv
    }, { status: 503 });
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    return NextResponse.json(await syncStravaActivities(user.id, "manual"));
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Strava-Synchronisation fehlgeschlagen."
    }, { status: 500 });
  }
}
