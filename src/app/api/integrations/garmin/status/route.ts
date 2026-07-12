import { NextResponse } from "next/server";
import { getGarminIntegrationStatus } from "@/lib/integrations/garmin/provider";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      featureEnabled: false,
      connected: false,
      provider: "garmin",
      status: "DISCONNECTED",
      activityCount: 0,
      rawRecordCount: 0,
      dailyHealthCount: 0,
      sleepCount: 0,
      hrvCount: 0,
      missingEnv: ["Supabase-Konfiguration"]
    });
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  return NextResponse.json(await getGarminIntegrationStatus(user.id));
}
