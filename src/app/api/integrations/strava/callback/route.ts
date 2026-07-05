import { NextRequest, NextResponse } from "next/server";
import { exchangeStravaCode } from "@/lib/integrations/strava";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";
import { syncStravaActivities } from "@/lib/integrations/activity-sync";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const scope = url.searchParams.get("scope") ?? "";

  if (error) {
    return redirectToSettings(request, `strava=${encodeURIComponent(error)}`);
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!code || !state || !verifyOAuthState(state, user.id)) {
    return redirectToSettings(request, "strava=invalid_state");
  }

  try {
    const token = await exchangeStravaCode(code);
    const serviceSupabase = createServiceRoleClient();
    const athlete = token.athlete;
    const providerUserId = athlete?.id ? String(athlete.id) : null;
    const providerUsername = [athlete?.firstname, athlete?.lastname].filter(Boolean).join(" ") || athlete?.username || null;
    const scopes = scope.split(/[,\s]+/).filter(Boolean);

    const { data: connection, error: connectionError } = await serviceSupabase
      .from("external_connections")
      .upsert({
        user_id: user.id,
        provider: "strava",
        provider_user_id: providerUserId,
        provider_username: providerUsername,
        status: "connected",
        scopes,
        connected_at: new Date().toISOString(),
        metadata: { athlete }
      }, { onConflict: "user_id,provider" })
      .select("id")
      .single<{ id: string }>();

    if (connectionError || !connection) {
      throw new Error("Strava-Verbindung konnte nicht gespeichert werden.");
    }

    await serviceSupabase
      .from("external_source_tokens")
      .upsert({
        connection_id: connection.id,
        provider: "strava",
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: new Date(token.expires_at * 1000).toISOString(),
        token_type: token.token_type ?? "Bearer",
        scopes
      }, { onConflict: "connection_id" });

    await syncStravaActivities(user.id, "initial").catch(async (syncError) => {
      await serviceSupabase
        .from("external_connections")
        .update({
          last_sync_status: "error",
          last_sync_error: syncError instanceof Error ? syncError.message : "Initiale Synchronisation fehlgeschlagen."
        })
        .eq("id", connection.id);
    });

    return redirectToSettings(request, "strava=connected");
  } catch (exchangeError) {
    const message = exchangeError instanceof Error ? exchangeError.message : "Strava OAuth fehlgeschlagen.";

    return redirectToSettings(request, `strava_error=${encodeURIComponent(message)}`);
  }
}

function redirectToSettings(request: NextRequest, query: string): NextResponse {
  const redirectUrl = new URL("/settings", request.url);
  const [key, value] = query.split("=");
  redirectUrl.searchParams.set(key, value ?? "1");

  return NextResponse.redirect(redirectUrl);
}
