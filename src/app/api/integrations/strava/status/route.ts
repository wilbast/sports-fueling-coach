import { NextResponse } from "next/server";
import { getStravaIntegrationStatus } from "@/lib/integrations/activity-sync";
import { getMissingStravaEnvVars } from "@/lib/integrations/strava";
import { getMissingSupabaseEnvVars, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getMissingServiceRoleEnvVars } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const missingEnv = [
    ...getMissingSupabaseEnvVars(),
    ...getMissingServiceRoleEnvVars(),
    ...getMissingStravaEnvVars()
  ];

  if (missingEnv.length > 0) {
    return NextResponse.json({
      configured: false,
      connected: false,
      provider: "strava",
      activityCount: 0,
      missingEnv
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      provider: "strava",
      activityCount: 0,
      missingEnv: getMissingSupabaseEnvVars()
    });
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  return NextResponse.json(await getStravaIntegrationStatus(user.id));
}
