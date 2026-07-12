import { NextRequest, NextResponse } from "next/server";
import { dispatchDueGarminJobs } from "@/lib/integrations/garmin/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  try {
    return NextResponse.json({
      ok: true,
      ...(await dispatchDueGarminJobs({
        force: request.nextUrl.searchParams.get("force") === "1"
      }))
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Automatischer Garmin-Sync fehlgeschlagen."
    }, { status: 500 });
  }
}

function authorizeCronRequest(request: NextRequest): { ok: true } | { ok: false; status: number; message: string } {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret && process.env.NODE_ENV !== "production") return { ok: true };
  if (!secret) return { ok: false, status: 503, message: "CRON_SECRET ist nicht konfiguriert." };

  return request.headers.get("authorization") === `Bearer ${secret}`
    ? { ok: true }
    : { ok: false, status: 401, message: "Cron-Aufruf ist nicht autorisiert." };
}
