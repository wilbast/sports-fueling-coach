import { NonRetryableGarminJobError, processGarminJob } from "@/lib/integrations/garmin/jobs";
import { QStashConfigurationError, QStashSignatureError, readVerifiedQStashBody } from "@/lib/integrations/garmin/qstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const rawBody = await readVerifiedQStashBody(request);
    const body = JSON.parse(rawBody) as { jobId?: string; connectionId?: string };
    if (!body.jobId || !body.connectionId) {
      return nonRetryable("Garmin Job-Payload ist unvollständig.");
    }
    return Response.json({ ok: true, ...(await processGarminJob({ jobId: body.jobId, connectionId: body.connectionId })) });
  } catch (error) {
    if (error instanceof SyntaxError) return nonRetryable("Garmin Job-Payload ist kein gültiges JSON.");
    if (error instanceof QStashSignatureError) return Response.json({ ok: false, error: error.message }, { status: 401 });
    if (error instanceof QStashConfigurationError) return Response.json({ ok: false, error: error.message }, { status: 503 });
    if (error instanceof NonRetryableGarminJobError) return nonRetryable(error.message);
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Garmin Job fehlgeschlagen."
    }, { status: 500 });
  }
}

function nonRetryable(message: string) {
  return Response.json({ ok: false, error: message }, {
    status: 489,
    headers: { "Upstash-NonRetryable-Error": "true" }
  });
}

