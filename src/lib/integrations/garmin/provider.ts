import { createHash, randomUUID } from "crypto";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/service-role";
import { getMissingSupabaseEnvVars, isSupabaseConfigured } from "@/lib/supabase/config";
import { decryptGarminSecret, encryptGarminSecret, getMissingGarminEncryptionEnvVars, isGarminEncryptionConfigured, maskGarminEmail } from "@/lib/integrations/garmin/crypto";
import { runGarminLogin, runGarminSync, type GarminBridgeRecord } from "@/lib/integrations/garmin/bridge";
import { assertGarminReadRegistryIsSafe, getGarminReadRegistry } from "@/lib/integrations/garmin/registry";

type GarminConnectionStatus =
  | "DISCONNECTED"
  | "AUTHENTICATING"
  | "MFA_REQUIRED"
  | "CONNECTED"
  | "REAUTH_REQUIRED"
  | "RATE_LIMITED"
  | "ERROR";

type GarminConnectionRow = {
  id: string;
  user_id: string;
  encrypted_token_payload: string | null;
  encrypted_provider_username_or_email: string | null;
  connection_status: GarminConnectionStatus;
  provider_display_name: string | null;
  connected_at: string | null;
  reauth_required_at: string | null;
  last_auth_success_at: string | null;
  last_auth_error_code: string | null;
  last_sync_attempt_at: string | null;
  last_successful_sync_at: string | null;
  next_sync_after: string | null;
  earliest_imported_date: string | null;
  metadata_json: Record<string, unknown>;
};

type GarminSyncRunRow = {
  id: string;
  status: string;
  sync_type: string;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  processed_domains: string[];
  successful_requests: number;
  failed_requests: number;
  created_records: number;
  updated_records: number;
  unchanged_records: number;
  error_code: string | null;
  sanitized_error_message: string | null;
};

export type GarminIntegrationStatus = {
  configured: boolean;
  featureEnabled: boolean;
  connected: boolean;
  provider: "garmin";
  status: GarminConnectionStatus;
  maskedAccount?: string;
  connectedAt?: string;
  lastSuccessfulSyncAt?: string;
  lastSyncAttemptAt?: string;
  nextSyncAfter?: string;
  earliestImportedDate?: string;
  latestSyncRun?: {
    id: string;
    status: string;
    syncType: string;
    trigger: string;
    startedAt: string;
    finishedAt?: string;
    processedDomains: string[];
    successfulRequests: number;
    failedRequests: number;
    createdRecords: number;
    updatedRecords: number;
    unchangedRecords: number;
    errorCode?: string;
    errorMessage?: string;
  };
  activityCount: number;
  rawRecordCount: number;
  dailyHealthCount: number;
  sleepCount: number;
  hrvCount: number;
  missingEnv?: string[];
  warning?: string;
};

export type GarminSyncResult = {
  syncRunId: string;
  status: string;
  successfulRequests: number;
  failedRequests: number;
  createdRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
  startedAt: string;
  finishedAt: string;
};

export function isGarminFeatureEnabled(): boolean {
  return process.env.GARMIN_INTEGRATION_ENABLED?.trim() === "true"
    || process.env.FEATURE_GARMIN_INTEGRATION?.trim() === "true"
    || process.env.NEXT_PUBLIC_FEATURE_GARMIN_INTEGRATION?.trim() === "true";
}

export function getMissingGarminEnvVars(): string[] {
  return [
    ...getMissingSupabaseEnvVars(),
    ...(isServiceRoleConfigured() ? [] : ["SUPABASE_SERVICE_ROLE_KEY oder SUPABASE_SERVICE_KEY"]),
    ...getMissingGarminEncryptionEnvVars()
  ];
}

export async function getGarminIntegrationStatus(userId: string): Promise<GarminIntegrationStatus> {
  const featureEnabled = isGarminFeatureEnabled();
  const missingEnv = getMissingGarminEnvVars();
  if (!featureEnabled || missingEnv.length > 0 || !isSupabaseConfigured() || !isServiceRoleConfigured() || !isGarminEncryptionConfigured()) {
    return {
      configured: missingEnv.length === 0,
      featureEnabled,
      connected: false,
      provider: "garmin",
      status: "DISCONNECTED",
      activityCount: 0,
      rawRecordCount: 0,
      dailyHealthCount: 0,
      sleepCount: 0,
      hrvCount: 0,
      missingEnv,
      warning: featureEnabled ? undefined : "Garmin-Integration ist per Feature Flag deaktiviert."
    };
  }

  const supabase = createServiceRoleClient();
  const { data: connection } = await supabase
    .from("garmin_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "garmin")
    .maybeSingle();
  const { data: latestSyncRun } = await supabase
    .from("garmin_sync_runs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const [activityCount, rawRecordCount, dailyHealthCount, sleepCount, hrvCount] = await Promise.all([
    countRows("activities", userId, "source_provider", "garmin"),
    countRows("garmin_raw_records", userId),
    countRows("daily_health_summaries", userId, "source", "garmin"),
    countRows("sleep_summaries", userId, "source", "garmin"),
    countRows("hrv_summaries", userId, "source", "garmin")
  ]);
  const row = connection as GarminConnectionRow | null;
  const syncRun = latestSyncRun as GarminSyncRunRow | null;

  return {
    configured: true,
    featureEnabled,
    connected: row?.connection_status === "CONNECTED",
    provider: "garmin",
    status: row?.connection_status ?? "DISCONNECTED",
    maskedAccount: row?.encrypted_provider_username_or_email ? safeDecryptMaskedEmail(row.encrypted_provider_username_or_email) : row?.provider_display_name ?? undefined,
    connectedAt: row?.connected_at ?? undefined,
    lastSuccessfulSyncAt: row?.last_successful_sync_at ?? undefined,
    lastSyncAttemptAt: row?.last_sync_attempt_at ?? undefined,
    nextSyncAfter: row?.next_sync_after ?? undefined,
    earliestImportedDate: row?.earliest_imported_date ?? undefined,
    latestSyncRun: syncRun ? {
      id: syncRun.id,
      status: syncRun.status,
      syncType: syncRun.sync_type,
      trigger: syncRun.trigger,
      startedAt: syncRun.started_at,
      finishedAt: syncRun.finished_at ?? undefined,
      processedDomains: syncRun.processed_domains ?? [],
      successfulRequests: syncRun.successful_requests ?? 0,
      failedRequests: syncRun.failed_requests ?? 0,
      createdRecords: syncRun.created_records ?? 0,
      updatedRecords: syncRun.updated_records ?? 0,
      unchangedRecords: syncRun.unchanged_records ?? 0,
      errorCode: syncRun.error_code ?? undefined,
      errorMessage: syncRun.sanitized_error_message ?? undefined
    } : undefined,
    activityCount,
    rawRecordCount,
    dailyHealthCount,
    sleepCount,
    hrvCount
  };
}

export async function connectGarminAccount(userId: string, input: { email: string; password: string }) {
  assertGarminCanRun();
  await preventConcurrentAuth(userId);

  const login = await runGarminLogin({ email: input.email, password: input.password });
  if (!login.ok && login.errorCode === "mfa_required") {
    const attemptId = await createAuthAttempt(userId, input.email, input.password, "MFA_REQUIRED");
    await upsertConnectionStatus(userId, "MFA_REQUIRED", { lastAuthErrorCode: "mfa_required" });
    return {
      status: "MFA_REQUIRED" as const,
      attemptId,
      message: "Garmin verlangt einen MFA-Code."
    };
  }

  if (!login.ok || !login.tokenPayload) {
    await upsertConnectionStatus(userId, "ERROR", { lastAuthErrorCode: login.errorCode ?? "login_failed" });
    throw new Error(login.message ?? "Garmin Login fehlgeschlagen.");
  }

  const connectionId = await persistConnectedGarminAccount(userId, input.email, login.tokenPayload, login.profile);
  void syncGarminAccount(userId, "INITIAL", "connect").catch(() => undefined);

  return {
    status: "CONNECTED" as const,
    connectionId
  };
}

export async function completeGarminMfa(userId: string, input: { attemptId: string; mfaCode: string }) {
  assertGarminCanRun();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("garmin_auth_attempts")
    .select("*")
    .eq("id", input.attemptId)
    .eq("user_id", userId)
    .eq("status", "MFA_REQUIRED")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) throw new Error("Garmin MFA-Vorgang ist abgelaufen oder ungültig.");

  const email = decryptGarminSecret<string>(String(data.encrypted_email));
  const password = decryptGarminSecret<string>(String(data.encrypted_password));
  const login = await runGarminLogin({ email, password, mfaCode: input.mfaCode });
  if (!login.ok || !login.tokenPayload) {
    await supabase.from("garmin_auth_attempts").update({
      error_code: login.errorCode ?? "mfa_failed",
      sanitized_error_message: login.message ?? "MFA fehlgeschlagen."
    }).eq("id", input.attemptId);
    await upsertConnectionStatus(userId, login.errorCode === "reauth_required" ? "REAUTH_REQUIRED" : "ERROR", { lastAuthErrorCode: login.errorCode ?? "mfa_failed" });
    throw new Error(login.message ?? "Garmin MFA fehlgeschlagen.");
  }

  await supabase.from("garmin_auth_attempts").update({
    status: "CONNECTED",
    consumed_at: new Date().toISOString(),
    encrypted_password: encryptGarminSecret("__consumed__")
  }).eq("id", input.attemptId);
  const connectionId = await persistConnectedGarminAccount(userId, email, login.tokenPayload, login.profile);
  void syncGarminAccount(userId, "INITIAL", "connect_mfa").catch(() => undefined);

  return {
    status: "CONNECTED" as const,
    connectionId
  };
}

export async function syncGarminAccount(userId: string, syncType: "INITIAL" | "HOURLY" | "MANUAL" | "BACKFILL" | "REPAIR", trigger: string): Promise<GarminSyncResult> {
  assertGarminCanRun();
  assertGarminReadRegistryIsSafe();
  const supabase = createServiceRoleClient();
  const connection = await loadConnectedConnection(userId);
  const existingRun = await findRunningSync(userId, connection.id);
  if (existingRun) {
    throw new Error("Für diesen Garmin-Account läuft bereits eine Synchronisation.");
  }

  const now = new Date();
  const lookbackDays = syncType === "INITIAL"
    ? Number.parseInt(process.env.GARMIN_INITIAL_BACKFILL_CHUNK_DAYS ?? "7", 10)
    : Number.parseInt(process.env.GARMIN_SYNC_LOOKBACK_DAYS ?? "3", 10);
  const endDate = toIsoDate(now);
  const startDate = toIsoDate(addDays(now, -Math.max(1, lookbackDays - 1)));
  const syncRun = await createSyncRun(userId, connection.id, syncType, trigger, startDate, endDate);
  const tokenPayload = decryptGarminSecret<Record<string, string>>(connection.encrypted_token_payload ?? "");

  await supabase.from("garmin_connections").update({
    last_sync_attempt_at: now.toISOString(),
    connection_status: "CONNECTED"
  }).eq("id", connection.id);

  const bridgeResult = await runGarminSync({
    tokenPayload,
    startDate,
    endDate,
    maxDays: lookbackDays,
    registry: getGarminReadRegistry()
  });

  if (!bridgeResult.ok) {
    const status = bridgeResult.errorCode === "rate_limited"
      ? "RATE_LIMITED"
      : bridgeResult.errorCode === "reauth_required"
        ? "REAUTH_REQUIRED"
        : "FAILED";
    await finishSyncRun(syncRun.id, status, {
      errorCode: bridgeResult.errorCode ?? "garmin_sync_failed",
      errorMessage: bridgeResult.message ?? "Garmin Sync fehlgeschlagen."
    });
    await upsertConnectionStatus(userId, status === "REAUTH_REQUIRED" ? "REAUTH_REQUIRED" : status === "RATE_LIMITED" ? "RATE_LIMITED" : "ERROR", {
      lastAuthErrorCode: bridgeResult.errorCode
    });
    throw new Error(bridgeResult.message ?? "Garmin Sync fehlgeschlagen.");
  }

  const stats = await persistGarminRecords(userId, connection.id, syncRun.id, bridgeResult.records ?? []);
  const errors = bridgeResult.errors ?? [];
  const finishedAt = new Date().toISOString();
  const status = errors.length > 0 ? "PARTIALLY_SUCCESSFUL" : "SUCCESS";
  await finishSyncRun(syncRun.id, status, {
    successfulRequests: bridgeResult.records?.length ?? 0,
    failedRequests: errors.length,
    createdRecords: stats.created,
    updatedRecords: stats.updated,
    unchangedRecords: stats.unchanged,
    processedDomains: Array.from(new Set((bridgeResult.records ?? []).map((record) => record.dataDomain))),
    errorCode: errors[0]?.errorCode,
    errorMessage: errors[0]?.message
  });
  await supabase.from("garmin_connections").update({
    connection_status: status === "SUCCESS" || status === "PARTIALLY_SUCCESSFUL" ? "CONNECTED" : "ERROR",
    last_successful_sync_at: finishedAt,
    next_sync_after: addMinutes(new Date(), Number.parseInt(process.env.GARMIN_SYNC_INTERVAL_MINUTES ?? "60", 10)).toISOString(),
    earliest_imported_date: startDate
  }).eq("id", connection.id);

  return {
    syncRunId: syncRun.id,
    status,
    successfulRequests: bridgeResult.records?.length ?? 0,
    failedRequests: errors.length,
    createdRecords: stats.created,
    updatedRecords: stats.updated,
    unchangedRecords: stats.unchanged,
    startedAt: syncRun.startedAt,
    finishedAt
  };
}

export async function syncConnectedGarminAccountsForCron(options: { force?: boolean } = {}) {
  assertGarminCanRun();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("garmin_connections")
    .select("id,user_id,next_sync_after,last_sync_attempt_at,connection_status")
    .eq("provider", "garmin")
    .in("connection_status", ["CONNECTED", "RATE_LIMITED"]);
  const now = new Date();
  const maxAccounts = Number.parseInt(process.env.GARMIN_MAX_CONCURRENT_ACCOUNTS ?? "2", 10);
  const due = (data ?? [])
    .filter((row) => options.force || !row.next_sync_after || new Date(String(row.next_sync_after)).getTime() <= now.getTime())
    .slice(0, Number.isFinite(maxAccounts) && maxAccounts > 0 ? maxAccounts : 2);
  const results = [];

  for (const connection of due) {
    try {
      const result = await syncGarminAccount(String(connection.user_id), "HOURLY", "cron");
      results.push({ ...result, userId: connection.user_id, connectionId: connection.id, status: "synced", syncStatus: result.status });
    } catch (error) {
      results.push({
        userId: connection.user_id,
        connectionId: connection.id,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Garmin Sync fehlgeschlagen."
      });
    }
  }

  return {
    checkedConnections: data?.length ?? 0,
    processedConnections: due.length,
    results
  };
}

export async function disconnectGarminAccount(userId: string, deleteData: boolean) {
  assertGarminCanRun();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("garmin_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "garmin")
    .maybeSingle();
  const connectionId = (data as { id?: string } | null)?.id;

  if (deleteData) {
    await Promise.all([
      supabase.from("activities").delete().eq("user_id", userId).eq("source_provider", "garmin"),
      supabase.from("garmin_raw_records").delete().eq("user_id", userId),
      supabase.from("garmin_activity_files").delete().eq("user_id", userId),
      supabase.from("daily_health_summaries").delete().eq("user_id", userId).eq("source", "garmin"),
      supabase.from("sleep_summaries").delete().eq("user_id", userId).eq("source", "garmin"),
      supabase.from("hrv_summaries").delete().eq("user_id", userId).eq("source", "garmin"),
      supabase.from("recovery_training_states").delete().eq("user_id", userId).eq("source", "garmin")
    ]);
  }

  if (connectionId) {
    await supabase.from("garmin_connections").update({
      encrypted_token_payload: null,
      encrypted_provider_username_or_email: null,
      connection_status: "DISCONNECTED",
      disconnected_at: new Date().toISOString(),
      next_sync_after: null
    }).eq("id", connectionId);
  }

  await supabase.from("garmin_auth_attempts").delete().eq("user_id", userId);

  return { disconnected: true, deletedData: deleteData };
}

export async function loadGarminWellnessForCoach(userId: string, selectedDate: string) {
  if (!isServiceRoleConfigured()) return null;

  const supabase = createServiceRoleClient();
  const since = toIsoDate(addDays(new Date(`${selectedDate}T00:00:00.000Z`), -13));
  const [{ data: daily }, { data: sleep }, { data: hrv }, { data: recovery }] = await Promise.all([
    supabase
      .from("daily_health_summaries")
      .select("date,steps,total_calories,active_calories,resting_calories,resting_heart_rate,min_heart_rate,max_heart_rate,average_stress,body_battery_start,body_battery_end,body_battery_low,body_battery_high,source_updated_at")
      .eq("user_id", userId)
      .eq("source", "garmin")
      .gte("date", since)
      .lte("date", selectedDate)
      .order("date", { ascending: false })
      .limit(14),
    supabase
      .from("sleep_summaries")
      .select("sleep_date,sleep_start,sleep_end,duration_seconds,deep_sleep_seconds,light_sleep_seconds,rem_sleep_seconds,awake_seconds,sleep_score,average_stress,average_respiration,average_spo2,average_hrv,source_updated_at")
      .eq("user_id", userId)
      .eq("source", "garmin")
      .gte("sleep_date", since)
      .lte("sleep_date", selectedDate)
      .order("sleep_date", { ascending: false })
      .limit(14),
    supabase
      .from("hrv_summaries")
      .select("date,nightly_average,weekly_average,baseline_low,baseline_high,status,source_updated_at")
      .eq("user_id", userId)
      .eq("source", "garmin")
      .gte("date", since)
      .lte("date", selectedDate)
      .order("date", { ascending: false })
      .limit(14),
    supabase
      .from("recovery_training_states")
      .select("measured_at,training_readiness,recovery_time_seconds,training_status,acute_load,load_ratio,vo2max_running,vo2max_cycling,ftp,endurance_score,hill_score")
      .eq("user_id", userId)
      .eq("source", "garmin")
      .gte("measured_at", `${since}T00:00:00.000Z`)
      .order("measured_at", { ascending: false })
      .limit(14)
  ]);

  return {
    status: (daily?.length || sleep?.length || hrv?.length || recovery?.length) ? "available_from_supabase" : "empty",
    source: "garmin_normalized_tables",
    lookbackDays: 14,
    dailyHealth: daily ?? [],
    sleep: sleep ?? [],
    hrv: hrv ?? [],
    recovery: recovery ?? []
  };
}

async function persistConnectedGarminAccount(userId: string, email: string, tokenPayload: Record<string, string>, profile?: Record<string, unknown>) {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("garmin_connections").upsert({
    user_id: userId,
    provider: "garmin",
    encrypted_token_payload: encryptGarminSecret(tokenPayload),
    encrypted_provider_username_or_email: encryptGarminSecret(email),
    provider_display_name: typeof profile?.displayName === "string" ? profile.displayName : maskGarminEmail(email),
    connection_status: "CONNECTED",
    connected_at: now,
    disconnected_at: null,
    reauth_required_at: null,
    last_auth_success_at: now,
    last_auth_error_code: null,
    next_sync_after: now,
    metadata_json: { profile: sanitizeProfile(profile) }
  }, { onConflict: "user_id,provider" }).select("id").single();

  if (error || !data) throw new Error("Garmin-Verbindung konnte nicht gespeichert werden.");

  return (data as { id: string }).id;
}

async function persistGarminRecords(userId: string, connectionId: string, syncRunId: string, records: GarminBridgeRecord[]) {
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const record of records) {
    const raw = await upsertRawRecord(userId, connectionId, syncRunId, record);
    if (raw.change === "created") created += 1;
    else if (raw.change === "updated") updated += 1;
    else unchanged += 1;

    await normalizeRecord(userId, connectionId, raw.id, record);
  }

  return { created, updated, unchanged };
}

async function upsertRawRecord(userId: string, connectionId: string, syncRunId: string, record: GarminBridgeRecord): Promise<{ id: string; change: "created" | "updated" | "unchanged" }> {
  const supabase = createServiceRoleClient();
  const payloadHash = hashPayload(record.payload);
  const providerRecordId = createProviderRecordId(record);
  const { data: existing } = await supabase
    .from("garmin_raw_records")
    .select("id,payload_hash")
    .eq("user_id", userId)
    .eq("provider", "garmin")
    .eq("endpoint_key", record.endpointKey)
    .eq("provider_record_id", providerRecordId)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && String(existing.payload_hash) === payloadHash) {
    await supabase.from("garmin_raw_records").update({
      last_seen_at: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      sync_run_id: syncRunId
    }).eq("id", String(existing.id));
    return { id: String(existing.id), change: "unchanged" };
  }

  const { data, error } = await supabase.from("garmin_raw_records").insert({
    user_id: userId,
    connection_id: connectionId,
    provider: "garmin",
    data_domain: record.dataDomain,
    endpoint_key: record.endpointKey,
    method_name: record.methodName,
    provider_record_id: providerRecordId,
    record_date: record.recordDate ?? null,
    range_start: record.rangeStart ?? null,
    range_end: record.rangeEnd ?? null,
    request_parameters_json: record.requestParameters ?? {},
    payload_json: record.payload,
    payload_hash: payloadHash,
    sync_run_id: syncRunId
  }).select("id").single();

  if (error || !data) throw new Error("Garmin-Rohdatensatz konnte nicht gespeichert werden.");
  if (existing?.id) {
    await supabase.from("garmin_raw_records").update({
      is_current: false,
      superseded_by_id: String(data.id)
    }).eq("id", String(existing.id));
  }

  return { id: String(data.id), change: existing ? "updated" : "created" };
}

async function normalizeRecord(userId: string, connectionId: string, rawRecordId: string, record: GarminBridgeRecord) {
  if (record.dataDomain === "activities") return normalizeActivities(userId, connectionId, rawRecordId, record);
  if (record.dataDomain === "daily_health" || record.dataDomain === "stress" || record.dataDomain === "body_battery") return normalizeDailyHealth(userId, rawRecordId, record);
  if (record.dataDomain === "sleep") return normalizeSleep(userId, rawRecordId, record);
  if (record.dataDomain === "hrv") return normalizeHrv(userId, rawRecordId, record);
  if (record.dataDomain === "training_readiness" || record.dataDomain === "training_status") return normalizeRecovery(userId, rawRecordId, record);
}

async function normalizeActivities(userId: string, connectionId: string, rawRecordId: string, record: GarminBridgeRecord) {
  const activities = Array.isArray(record.payload) ? record.payload : [];
  const supabase = createServiceRoleClient();
  for (const item of activities) {
    if (!item || typeof item !== "object") continue;
    const activity = item as Record<string, unknown>;
    const providerActivityId = firstString(activity.activityId, activity.activityIdStr, activity.id, activity.uuid);
    if (!providerActivityId) continue;
    const startDate = firstString(activity.startTimeGMT, activity.startTimeLocal, activity.beginTimestamp, activity.startTime) ?? new Date().toISOString();
    await supabase.from("activities").upsert({
      user_id: userId,
      source_provider: "garmin",
      source_connection_id: connectionId,
      source_activity_id: providerActivityId,
      name: firstString(activity.activityName, activity.name) ?? "Garmin-Aktivität",
      description: firstString(activity.description, activity.summary) ?? null,
      sport_type: firstString(nestedValue(activity.activityType, "typeKey"), activity.activityType, activity.sportType) ?? "unknown",
      workout_type: firstString(nestedValue(activity.activityType, "typeId"), activity.eventType) ?? null,
      start_date: startDate,
      start_date_local: firstString(activity.startTimeLocal, activity.startTime) ?? null,
      timezone: firstString(activity.timeZoneUnit, activity.timeZoneId) ?? null,
      elapsed_time_seconds: firstNumber(activity.elapsedDuration, activity.duration) ?? null,
      moving_time_seconds: firstNumber(activity.movingDuration) ?? null,
      distance_meters: firstNumber(activity.distance, activity.distanceMeters) ?? null,
      elevation_gain_meters: firstNumber(activity.elevationGain, activity.totalElevationGain) ?? null,
      calories: firstNumber(activity.calories, activity.activeKilocalories) ?? null,
      average_speed_mps: firstNumber(activity.averageSpeed) ?? null,
      max_speed_mps: firstNumber(activity.maxSpeed) ?? null,
      average_pace_seconds_per_km: firstNumber(activity.averagePace) ?? null,
      max_pace_seconds_per_km: firstNumber(activity.maxPace, activity.bestPace) ?? null,
      average_heartrate: firstNumber(activity.averageHR, activity.averageHeartRate) ?? null,
      max_heartrate: firstNumber(activity.maxHR, activity.maxHeartRate) ?? null,
      average_watts: firstNumber(activity.avgPower, activity.averagePower) ?? null,
      max_watts: firstNumber(activity.maxPower) ?? null,
      normalized_power: firstNumber(activity.normPower, activity.normalizedPower) ?? null,
      average_cadence: firstNumber(activity.averageRunningCadenceInStepsPerMinute, activity.averageBikeCadenceInRevPerMinute, activity.averageCadence) ?? null,
      max_cadence: firstNumber(activity.maxRunningCadenceInStepsPerMinute, activity.maxBikeCadenceInRevPerMinute, activity.maxCadence) ?? null,
      training_load: firstNumber(activity.trainingLoad, activity.exerciseLoad) ?? null,
      temperature_celsius: firstNumber(activity.minTemperature, activity.averageTemperature) ?? null,
      device_name: firstString(activity.deviceName) ?? null,
      is_private: Boolean(nestedValue(activity.privacy, "typeKey") === "private"),
      is_commute: false,
      is_indoor: Boolean(nestedValue(activity.activityType, "typeKey") === "indoor_cardio"),
      is_manual: Boolean(activity.manualActivity),
      raw: { rawRecordId, providerPayload: activity }
    }, { onConflict: "user_id,source_provider,source_activity_id" });
  }
}

async function normalizeDailyHealth(userId: string, rawRecordId: string, record: GarminBridgeRecord) {
  const payload = asObject(record.payload);
  const date = record.recordDate ?? firstString(payload.calendarDate, payload.date) ?? toIsoDate(new Date());
  await createServiceRoleClient().from("daily_health_summaries").upsert({
    user_id: userId,
    date,
    steps: firstInteger(payload.totalSteps, payload.steps),
    distance_m: firstNumber(payload.totalDistanceMeters, payload.totalDistance),
    total_calories: firstNumber(payload.totalKilocalories, payload.totalCalories),
    active_calories: firstNumber(payload.activeKilocalories, payload.activeCalories),
    resting_calories: firstNumber(payload.bmrKilocalories, payload.restingCalories),
    floors: firstNumber(payload.floorsAscended, payload.floors),
    moderate_intensity_minutes: firstNumber(payload.moderateIntensityMinutes),
    vigorous_intensity_minutes: firstNumber(payload.vigorousIntensityMinutes),
    resting_heart_rate: firstNumber(payload.restingHeartRate),
    min_heart_rate: firstNumber(payload.minHeartRate),
    max_heart_rate: firstNumber(payload.maxHeartRate),
    average_stress: firstNumber(payload.averageStressLevel, payload.avgStressLevel),
    max_stress: firstNumber(payload.maxStressLevel),
    body_battery_start: firstNumber(payload.bodyBatteryStart),
    body_battery_end: firstNumber(payload.bodyBatteryEnd),
    body_battery_high: firstNumber(payload.bodyBatteryHigh),
    body_battery_low: firstNumber(payload.bodyBatteryLow),
    average_respiration: firstNumber(payload.avgWakingRespirationValue, payload.averageRespiration),
    spo2_average: firstNumber(payload.averageSpo2, payload.spo2Average),
    source: "garmin",
    source_record_id: createProviderRecordId(record),
    raw_record_id: rawRecordId
  }, { onConflict: "user_id,source,date" });
}

async function normalizeSleep(userId: string, rawRecordId: string, record: GarminBridgeRecord) {
  const payload = asObject(record.payload);
  const daily = asObject(payload.dailySleepDTO ?? payload.sleepDTO ?? payload);
  const sleepDate = record.recordDate ?? firstString(daily.calendarDate, payload.calendarDate) ?? toIsoDate(new Date());
  await createServiceRoleClient().from("sleep_summaries").upsert({
    user_id: userId,
    sleep_date: sleepDate,
    sleep_start: firstString(daily.sleepStartTimestampGMT, daily.sleepStartTimestampLocal),
    sleep_end: firstString(daily.sleepEndTimestampGMT, daily.sleepEndTimestampLocal),
    duration_seconds: millisecondsToSeconds(firstNumber(daily.sleepTimeSeconds, daily.sleepTimeInSeconds, daily.sleepTimeInMilliseconds)),
    deep_sleep_seconds: millisecondsToSeconds(firstNumber(daily.deepSleepSeconds, daily.deepSleepInSeconds, daily.deepSleepDuration)),
    light_sleep_seconds: millisecondsToSeconds(firstNumber(daily.lightSleepSeconds, daily.lightSleepInSeconds, daily.lightSleepDuration)),
    rem_sleep_seconds: millisecondsToSeconds(firstNumber(daily.remSleepSeconds, daily.remSleepInSeconds, daily.remSleepDuration)),
    awake_seconds: millisecondsToSeconds(firstNumber(daily.awakeSleepSeconds, daily.awakeTimeInSeconds, daily.awakeDuration)),
    sleep_score: firstNumber(nestedValue(nestedValue(daily.sleepScores, "overall"), "value"), daily.sleepScore),
    average_stress: firstNumber(daily.avgSleepStress, daily.averageStress),
    average_respiration: firstNumber(daily.averageRespiration),
    average_spo2: firstNumber(daily.averageSpO2, daily.averageSpo2),
    average_hrv: firstNumber(daily.avgOvernightHrv, daily.averageHrv),
    source: "garmin",
    source_record_id: createProviderRecordId(record),
    raw_record_id: rawRecordId
  }, { onConflict: "user_id,source,sleep_date" });
}

async function normalizeHrv(userId: string, rawRecordId: string, record: GarminBridgeRecord) {
  const payload = asObject(record.payload);
  const summary = asObject(payload.hrvSummary ?? payload);
  const date = record.recordDate ?? firstString(summary.calendarDate, payload.calendarDate) ?? toIsoDate(new Date());
  await createServiceRoleClient().from("hrv_summaries").upsert({
    user_id: userId,
    date,
    nightly_average: firstNumber(summary.lastNightAvg, summary.nightlyAverage),
    weekly_average: firstNumber(summary.weeklyAvg, summary.weeklyAverage),
    baseline_low: firstNumber(nestedValue(summary.baseline, "lowUpper"), summary.baselineLow),
    baseline_high: firstNumber(nestedValue(summary.baseline, "balancedLow"), summary.baselineHigh),
    status: firstString(summary.status, summary.hrvStatus),
    source: "garmin",
    source_record_id: createProviderRecordId(record),
    raw_record_id: rawRecordId
  }, { onConflict: "user_id,source,date" });
}

async function normalizeRecovery(userId: string, rawRecordId: string, record: GarminBridgeRecord) {
  const payload = asObject(record.payload);
  await createServiceRoleClient().from("recovery_training_states").upsert({
    user_id: userId,
    measured_at: firstString(payload.reportTimestamp, payload.timestamp, payload.calendarDate) ?? new Date().toISOString(),
    training_readiness: firstNumber(payload.trainingReadinessScore, payload.score),
    recovery_time_seconds: firstInteger(payload.recoveryTime, payload.recoveryTimeSeconds),
    training_status: firstString(payload.trainingStatus, payload.trainingStatusKey),
    acute_load: firstNumber(payload.acuteLoad, payload.load),
    load_ratio: firstNumber(payload.loadRatio),
    load_focus_json: payload.loadFocus ?? null,
    vo2max_running: firstNumber(payload.vo2MaxRunning, nestedValue(payload.generic, "vo2MaxRunning")),
    vo2max_cycling: firstNumber(payload.vo2MaxCycling),
    ftp: firstNumber(payload.ftp),
    race_predictions_json: payload.racePredictions ?? null,
    endurance_score: firstNumber(payload.enduranceScore),
    hill_score: firstNumber(payload.hillScore),
    heat_acclimation: firstNumber(payload.heatAcclimation),
    altitude_acclimation: firstNumber(payload.altitudeAcclimation),
    source: "garmin",
    source_record_id: createProviderRecordId(record),
    raw_record_id: rawRecordId
  }, { onConflict: "user_id,source,source_record_id" });
}

async function countRows(table: string, userId: string, eqColumn?: string, eqValue?: string): Promise<number> {
  const supabase = createServiceRoleClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (eqColumn && eqValue) query = query.eq(eqColumn, eqValue);
  const { count } = await query;
  return count ?? 0;
}

async function createAuthAttempt(userId: string, email: string, password: string, status: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const expiresAt = addMinutes(new Date(), Number.parseInt(process.env.GARMIN_AUTH_ATTEMPT_TTL_MINUTES ?? "10", 10));
  const { data, error } = await supabase.from("garmin_auth_attempts").insert({
    user_id: userId,
    provider: "garmin",
    status,
    encrypted_email: encryptGarminSecret(email),
    encrypted_password: encryptGarminSecret(password),
    expires_at: expiresAt.toISOString()
  }).select("id").single();

  if (error || !data) throw new Error("Garmin MFA-Vorgang konnte nicht angelegt werden.");
  return String(data.id);
}

async function preventConcurrentAuth(userId: string) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("garmin_auth_attempts")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["AUTHENTICATING", "MFA_REQUIRED"])
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (data) throw new Error("Es läuft bereits ein Garmin-Login. Bitte kurz warten oder MFA abschließen.");
}

async function upsertConnectionStatus(userId: string, status: GarminConnectionStatus, options: { lastAuthErrorCode?: string } = {}) {
  await createServiceRoleClient().from("garmin_connections").upsert({
    user_id: userId,
    provider: "garmin",
    connection_status: status,
    last_auth_error_code: options.lastAuthErrorCode ?? null,
    reauth_required_at: status === "REAUTH_REQUIRED" ? new Date().toISOString() : null
  }, { onConflict: "user_id,provider" });
}

async function loadConnectedConnection(userId: string): Promise<GarminConnectionRow> {
  const { data, error } = await createServiceRoleClient()
    .from("garmin_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "garmin")
    .maybeSingle();
  const connection = data as GarminConnectionRow | null;
  if (error || !connection || !connection.encrypted_token_payload || connection.connection_status !== "CONNECTED") {
    throw new Error("Garmin ist nicht verbunden oder eine erneute Anmeldung ist erforderlich.");
  }
  return connection;
}

async function findRunningSync(userId: string, connectionId: string) {
  const { data } = await createServiceRoleClient()
    .from("garmin_sync_runs")
    .select("id")
    .eq("user_id", userId)
    .eq("connection_id", connectionId)
    .eq("status", "RUNNING")
    .gte("started_at", addMinutes(new Date(), -45).toISOString())
    .limit(1)
    .maybeSingle();
  return data as { id: string } | null;
}

async function createSyncRun(userId: string, connectionId: string, syncType: string, trigger: string, startDate: string, endDate: string) {
  const startedAt = new Date().toISOString();
  const { data, error } = await createServiceRoleClient().from("garmin_sync_runs").insert({
    user_id: userId,
    connection_id: connectionId,
    sync_type: syncType,
    status: "RUNNING",
    trigger,
    started_at: startedAt,
    heartbeat_at: startedAt,
    window_start: startDate,
    window_end: endDate
  }).select("id,started_at").single();
  if (error || !data) throw new Error("Garmin Sync-Run konnte nicht gestartet werden.");
  return { id: String(data.id), startedAt: String(data.started_at) };
}

async function finishSyncRun(syncRunId: string, status: string, result: Partial<{
  successfulRequests: number;
  failedRequests: number;
  createdRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
  processedDomains: string[];
  errorCode: string;
  errorMessage: string;
}>) {
  await createServiceRoleClient().from("garmin_sync_runs").update({
    status,
    finished_at: new Date().toISOString(),
    heartbeat_at: new Date().toISOString(),
    successful_requests: result.successfulRequests ?? 0,
    failed_requests: result.failedRequests ?? 0,
    created_records: result.createdRecords ?? 0,
    updated_records: result.updatedRecords ?? 0,
    unchanged_records: result.unchangedRecords ?? 0,
    processed_domains: result.processedDomains ?? [],
    error_code: result.errorCode ?? null,
    sanitized_error_message: result.errorMessage ? sanitizeError(result.errorMessage) : null
  }).eq("id", syncRunId);
}

function assertGarminCanRun() {
  if (!isGarminFeatureEnabled()) throw new Error("Garmin-Integration ist per Feature Flag deaktiviert.");
  const missing = getMissingGarminEnvVars();
  if (missing.length > 0) throw new Error(`Garmin ist nicht vollständig konfiguriert. Fehlend: ${missing.join(", ")}.`);
}

function safeDecryptMaskedEmail(value: string): string {
  try {
    return maskGarminEmail(decryptGarminSecret<string>(value));
  } catch {
    return "Garmin-Account";
  }
}

function sanitizeProfile(profile?: Record<string, unknown>) {
  return profile ? { displayName: profile.displayName ?? null, unitSystem: profile.unitSystem ?? null } : {};
}

function createProviderRecordId(record: GarminBridgeRecord): string {
  const payload = asObject(record.payload);
  return firstString(payload.activityId, payload.id, payload.uuid, payload.calendarDate, payload.date)
    ?? [record.endpointKey, record.recordDate, record.rangeStart, record.rangeEnd].filter(Boolean).join(":")
    ?? randomUUID();
}

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function nestedValue(value: unknown, key: string): unknown {
  return asObject(value)[key];
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function firstInteger(...values: unknown[]): number | null {
  const value = firstNumber(...values);
  return value == null ? null : Math.round(value);
}

function millisecondsToSeconds(value: number | undefined): number | null {
  if (value == null) return null;
  return value > 100000 ? Math.round(value / 1000) : Math.round(value);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function sanitizeError(message: string): string {
  return message.replace(/\s+/g, " ").slice(0, 500);
}
