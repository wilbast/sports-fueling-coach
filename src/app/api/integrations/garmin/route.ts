import { NextRequest, NextResponse } from "next/server";
import { disconnectGarminAccount } from "@/lib/integrations/garmin/provider";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 503 });

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await request.json().catch(() => null) as { deleteData?: boolean } | null;

  try {
    return NextResponse.json(await disconnectGarminAccount(user.id, Boolean(body?.deleteData)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Garmin-Verbindung konnte nicht getrennt werden." }, { status: 500 });
  }
}
