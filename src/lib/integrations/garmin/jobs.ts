import { createHash, randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { publishGarminSyncJob } from "@/lib/integrations/garmin/qstash";
import { syncGarminWindow } from "@/lib/integrations/garmin/provider";

type SyncType = "HOURLY" | "MANUAL" | "BACKFILL";

type GarminJobRow = {
  id: string;
  user_id: string;
  connection_id: string;
  sync_type: SyncType;
  status: string;
  window_start: string;
  window_end: string;
  backfill_cutoff: string | null;
  deduplication_key: string;
  attempt_count: number;
};

export async function dispatchDueGarminJobs(options: { force?: boolean } = {}) {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const { data, error } = await supabase
    .from("garmin_connections")
    .select("id,user_id,next_sync_after,earliest_imported_date,connection_status")
    .eq("provider", "garmin")
    .in("connection_status", ["CONNECTED", "RATE_LIMITED"]);
  if (error) throw new Error("Fällige Garmin-Verbindungen konnten nicht geladen werden.");

  const due = (data ?? []).filter((row) => options.force
    || !row.next_sync_after
    || new Date(String(row.next_sync_after)).getTime() <= now.getTime());
  const results = [];
  for (const connection of due) {
    const isInitial = !connection.earliest_imported_date;
    const chunkDays = boundedDays(process.env.GARMIN_INITIAL_BACKFILL_CHUNK_DAYS, 1, 1);
    const lookbackDays = boundedDays(process.env.GARMIN_SYNC_LOOKBACK_DAYS, 1, 1);
    const endDate = isoDate(now);
    const startDate = isoDate(addDays(now, -(isInitial ? chunkDays : lookbackDays) + 1));
    const cutoff = isInitial
      ? isoDate(addDays(now, -positiveInt(process.env.GARMIN_INITIAL_BACKFILL_DAYS, 365) + 1))
      : null;
    results.push(await enqueueGarminJob({
      userId: String(connection.user_id),
      connectionId: String(connection.id),
      syncType: isInitial ? "BACKFILL" : "HOURLY",
      startDate,
      endDate,
      backfillCutoff: cutoff
    }));
  }
  return { checkedConnections: data?.length ?? 0, dispatchedConnections: due.length, results };
}

export async function enqueueGarminSyncForUser(userId: string, mode: "initial" | "manual") {
  const supabase = createServiceRoleClient();
  const { data: connection, error } = await supabase.from("garmin_connections")
    .select("id,earliest_imported_date")
    .eq("user_id", userId)
    .eq("provider", "garmin")
    .eq("connection_status", "CONNECTED")
    .maybeSingle();
  if (error || !connection) throw new Error("Garmin ist nicht verbunden.");

  const now = new Date();
  const isBackfill = mode === "initial" && !connection.earliest_imported_date;
  const days = isBackfill
    ? boundedDays(process.env.GARMIN_INITIAL_BACKFILL_CHUNK_DAYS, 1, 1)
    : boundedDays(process.env.GARMIN_SYNC_LOOKBACK_DAYS, 1, 1);
  return enqueueGarminJob({
    userId,
    connectionId: String(connection.id),
    syncType: isBackfill ? "BACKFILL" : mode === "manual" ? "MANUAL" : "HOURLY",
    startDate: isoDate(addDays(now, -days + 1)),
    endDate: isoDate(now),
    backfillCutoff: isBackfill
      ? isoDate(addDays(now, -positiveInt(process.env.GARMIN_INITIAL_BACKFILL_DAYS, 365) + 1))
      : null
  });
}

export async function enqueueGarminJob(input: {
  userId: string;
  connectionId: string;
  syncType: SyncType;
  startDate: string;
  endDate: string;
  backfillCutoff?: string | null;
}) {
  const supabase = createServiceRoleClient();
  const deduplicationKey = [
    input.connectionId,
    input.syncType,
    input.startDate,
    input.endDate,
    input.syncType === "HOURLY" ? hourSlot(new Date()) : null,
    input.syncType === "MANUAL" ? randomUUID() : null
  ].filter(Boolean).join(":");
  const { data: existing } = await supabase
    .from("garmin_sync_jobs")
    .select("id,status,qstash_message_id,attempt_count,started_at")
    .eq("deduplication_key", deduplicationKey)
    .maybeSingle();
  if (existing) {
    const staleRunning = existing.status === "RUNNING"
      && existing.started_at
      && new Date(String(existing.started_at)).getTime() < Date.now() - 3 * 60 * 1000;
    if (["DISPATCH_FAILED", "RETRYING"].includes(String(existing.status)) || staleRunning || (existing.status === "QUEUED" && !existing.qstash_message_id)) {
      const dispatchKey = `${deduplicationKey}:recovery:${Number(existing.attempt_count ?? 0) + 1}:v2`;
      return publishExistingJob(String(existing.id), input.connectionId, dispatchKey);
    }
    return { jobId: existing.id, status: existing.status, messageId: existing.qstash_message_id, deduplicated: true };
  }

  const { data: job, error } = await supabase.from("garmin_sync_jobs").insert({
    user_id: input.userId,
    connection_id: input.connectionId,
    sync_type: input.syncType,
    status: "QUEUED",
    window_start: input.startDate,
    window_end: input.endDate,
    backfill_cutoff: input.backfillCutoff ?? null,
    deduplication_key: deduplicationKey
  }).select("id").single();
  if (error || !job) throw new Error("Garmin Sync-Job konnte nicht angelegt werden.");

  try {
    return await publishExistingJob(String(job.id), input.connectionId, deduplicationKey);
  } catch (error) {
    await supabase.from("garmin_sync_jobs").update({
      status: "DISPATCH_FAILED",
      last_error_code: "qstash_publish_failed",
      sanitized_error_message: sanitize(error)
    }).eq("id", job.id);
    throw error;
  }
}

async function publishExistingJob(jobId: string, connectionId: string, deduplicationKey: string) {
  const published = await publishGarminSyncJob(
    { jobId, connectionId },
    createQStashDeduplicationId(deduplicationKey)
  );
  await createServiceRoleClient().from("garmin_sync_jobs").update({
    status: "QUEUED",
    qstash_message_id: published.messageId,
    last_error_code: null,
    sanitized_error_message: null
  }).eq("id", jobId);
  return { jobId, status: "QUEUED", messageId: published.messageId, deduplicated: published.deduplicated };
}

export function createQStashDeduplicationId(deduplicationKey: string): string {
  return `garmin-v2-${createHash("sha256").update(deduplicationKey).digest("hex")}`;
}

export async function processGarminJob(message: { jobId: string; connectionId: string }) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("garmin_sync_jobs").select("*")
    .eq("id", message.jobId).eq("connection_id", message.connectionId).maybeSingle();
  const job = data as GarminJobRow | null;
  if (!job) throw new NonRetryableGarminJobError("Garmin Sync-Job existiert nicht.");
  if (job.status === "SUCCESS") return { jobId: job.id, status: "SUCCESS", alreadyProcessed: true };

  if (job.status === "RUNNING") {
    const { data: stale } = await supabase.from("garmin_sync_jobs").select("id")
      .eq("id", job.id)
      .lt("started_at", new Date(Date.now() - 3 * 60 * 1000).toISOString())
      .maybeSingle();
    if (!stale) return { jobId: job.id, status: "RUNNING", alreadyClaimed: true };
    await supabase.from("garmin_sync_jobs").update({ status: "RETRYING" }).eq("id", job.id).eq("status", "RUNNING");
  }

  const { data: claimed } = await supabase.from("garmin_sync_jobs").update({
    status: "RUNNING",
    started_at: new Date().toISOString(),
    attempt_count: (job.attempt_count ?? 0) + 1,
    last_error_code: null,
    sanitized_error_message: null
  }).eq("id", job.id).in("status", ["QUEUED", "RETRYING", "DISPATCH_FAILED"]).select("id").maybeSingle();
  if (!claimed) return { jobId: job.id, status: "RUNNING", alreadyClaimed: true };

  try {
    const result = await syncGarminWindow({
      userId: job.user_id,
      connectionId: job.connection_id,
      syncType: job.sync_type,
      trigger: "qstash",
      startDate: job.window_start,
      endDate: job.window_end
    });
    await supabase.from("garmin_sync_jobs").update({ status: "SUCCESS", finished_at: new Date().toISOString() }).eq("id", job.id);

    const next = job.sync_type === "BACKFILL" ? await enqueuePreviousBackfill(job) : null;
    return { jobId: job.id, status: "SUCCESS", sync: result, next };
  } catch (error) {
    await supabase.from("garmin_sync_jobs").update({
      status: "RETRYING",
      last_error_code: "garmin_sync_failed",
      sanitized_error_message: sanitize(error)
    }).eq("id", job.id);
    throw error;
  }
}

async function enqueuePreviousBackfill(job: GarminJobRow) {
  if (!job.backfill_cutoff || job.window_start <= job.backfill_cutoff) return null;
  const chunkDays = boundedDays(process.env.GARMIN_INITIAL_BACKFILL_CHUNK_DAYS, 1, 1);
  const nextEnd = addDays(new Date(`${job.window_start}T00:00:00.000Z`), -1);
  const proposedStart = isoDate(addDays(nextEnd, -chunkDays + 1));
  const nextStart = proposedStart < job.backfill_cutoff ? job.backfill_cutoff : proposedStart;
  return enqueueGarminJob({
    userId: job.user_id,
    connectionId: job.connection_id,
    syncType: "BACKFILL",
    startDate: nextStart,
    endDate: isoDate(nextEnd),
    backfillCutoff: job.backfill_cutoff
  });
}

export class NonRetryableGarminJobError extends Error {}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boundedDays(value: string | undefined, fallback: number, maximum: number) {
  return Math.min(positiveInt(value, fallback), maximum);
}

function isoDate(value: Date) { return value.toISOString().slice(0, 10); }
function hourSlot(value: Date) { return value.toISOString().slice(0, 13); }
function addDays(value: Date, days: number) { const next = new Date(value); next.setUTCDate(next.getUTCDate() + days); return next; }
function sanitize(error: unknown) { return (error instanceof Error ? error.message : "Unbekannter Fehler").replace(/\s+/g, " ").slice(0, 500); }
