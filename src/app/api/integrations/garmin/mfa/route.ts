import { NextRequest, NextResponse } from "next/server";
import { completeGarminMfa } from "@/lib/integrations/garmin/provider";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 503 });

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await request.json().catch(() => null) as { attemptId?: string; mfaCode?: string } | null;
  const attemptId = body?.attemptId?.trim();
  const mfaCode = body?.mfaCode?.trim();
  if (!attemptId || !mfaCode) return NextResponse.json({ error: "MFA-Vorgang oder Code fehlt." }, { status: 400 });

  try {
    return NextResponse.json(await completeGarminMfa(user.id, { attemptId, mfaCode }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Garmin MFA fehlgeschlagen." }, { status: 500 });
  }
}
