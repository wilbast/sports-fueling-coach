import { dispatchDueGarminJobs } from "@/lib/integrations/garmin/jobs";
import { QStashConfigurationError, QStashSignatureError, readVerifiedQStashBody } from "@/lib/integrations/garmin/qstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await readVerifiedQStashBody(request);
    return Response.json({ ok: true, ...(await dispatchDueGarminJobs()) });
  } catch (error) {
    if (error instanceof QStashSignatureError) return Response.json({ ok: false, error: error.message }, { status: 401 });
    if (error instanceof QStashConfigurationError) return Response.json({ ok: false, error: error.message }, { status: 503 });
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Garmin Scheduler fehlgeschlagen."
    }, { status: 500 });
  }
}
