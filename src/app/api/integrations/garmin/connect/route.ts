import { NextRequest, NextResponse } from "next/server";
import { connectGarminAccount } from "@/lib/integrations/garmin/provider";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 503 });

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim();
  const password = body?.password ?? "";
  if (!email || !password) return NextResponse.json({ error: "Garmin-E-Mail oder Passwort fehlt." }, { status: 400 });

  try {
    return NextResponse.json(await connectGarminAccount(user.id, { email, password }));
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}

function sanitizeError(error: unknown): string {
  return error instanceof Error ? error.message : "Garmin-Verbindung fehlgeschlagen.";
}
