import { NextResponse } from "next/server";
import { getStravaIntegrationStatus } from "@/lib/integrations/activity-sync";
import { getMissingStravaEnvVars } from "@/lib/integrations/strava";
import { getMissingSupabaseEnvVars, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getMissingServiceRoleEnvVars } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics = createConfigDiagnostics();
  const missingEnv = [
    ...getMissingSupabaseEnvVars(),
    ...getMissingServiceRoleEnvVars(),
    ...getMissingStravaEnvVars()
  ];

  if (missingEnv.length > 0) {
    console.warn("[strava-status] integration is not configured", {
      missingEnv,
      diagnostics
    });

    return NextResponse.json({
      configured: false,
      connected: false,
      provider: "strava",
      activityCount: 0,
      missingEnv,
      diagnostics
    });
  }

  if (!isSupabaseConfigured()) {
    console.warn("[strava-status] supabase config unexpectedly missing", {
      diagnostics
    });

    return NextResponse.json({
      configured: false,
      connected: false,
      provider: "strava",
      activityCount: 0,
      missingEnv: getMissingSupabaseEnvVars(),
      diagnostics
    });
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const status = await getStravaIntegrationStatus(user.id);

    return NextResponse.json({
      ...status,
      diagnostics
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[strava-status] failed to load integration status", {
      message,
      diagnostics
    });

    return NextResponse.json({
      configured: true,
      connected: false,
      provider: "strava",
      status: "error",
      activityCount: 0,
      lastSyncError: "Strava-Status konnte serverseitig nicht geladen werden. Details stehen in den Vercel Runtime Logs.",
      diagnostics
    });
  }
}

function createConfigDiagnostics() {
  return {
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    hasSupabaseUrl: hasEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabasePublishableKey: hasEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    hasSupabaseAnonKey: hasEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasSupabaseServiceRoleKey: hasEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasStravaClientId: hasEnvValue(process.env.STRAVA_CLIENT_ID),
    hasStravaClientSecret: hasEnvValue(process.env.STRAVA_CLIENT_SECRET),
    hasStravaRedirectUri: hasEnvValue(process.env.STRAVA_REDIRECT_URI),
    hasStravaOAuthStateSecret: hasEnvValue(process.env.STRAVA_OAUTH_STATE_SECRET)
  };
}

function hasEnvValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
