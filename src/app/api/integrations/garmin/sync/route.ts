import { NextResponse } from "next/server";
import { syncGarminAccount } from "@/lib/integrations/garmin/provider";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 503 });

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  try {
    return NextResponse.json(await syncGarminAccount(user.id, "MANUAL", "manual"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Garmin-Synchronisation fehlgeschlagen." }, { status: 500 });
  }
}
