import { NextRequest, NextResponse } from "next/server";
import { createOAuthState } from "@/lib/integrations/oauth-state";
import { createStravaAuthorizeUrl, getStravaConfig } from "@/lib/integrations/strava";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getStravaConfig();
  if (!config || !isServiceRoleConfigured()) {
    return NextResponse.redirect(createSettingsUrl(request, "strava=not_configured"));
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const redirectUri = process.env.STRAVA_REDIRECT_URI ?? new URL("/api/integrations/strava/callback", request.url).toString();
  const state = createOAuthState(user.id, "/settings");
  const authorizeUrl = createStravaAuthorizeUrl({ redirectUri, state });

  return NextResponse.redirect(authorizeUrl);
}

function createSettingsUrl(request: NextRequest, query: string): URL {
  const url = new URL("/settings", request.url);
  const [key, value] = query.split("=");
  url.searchParams.set(key, value);

  return url;
}
