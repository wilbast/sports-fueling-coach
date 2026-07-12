import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/service-role";
import { prioritizeGarminActivities } from "@/domain/integrations/activity-priority";
import {
  getStravaActivity,
  getStravaActivityStreams,
  getStravaActivityZones,
  getStravaAthleteZones,
  listStravaActivities,
  mapStravaActivity,
  mapStravaEquipment,
  refreshStravaToken,
  type StravaActivityZone,
  type StravaAthleteZoneSet
} from "@/lib/integrations/strava";

type ExternalConnectionRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string | null;
  provider_username: string | null;
  scopes: string[];
  status: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  metadata: Record<string, unknown>;
};

type TokenRow = {
  connection_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: string;
  scopes: string[];
};

export type IntegrationStatus = {
  configured: boolean;
  connected: boolean;
  provider: "strava";
  status?: string;
  athlete?: {
    id?: string;
    name?: string;
  };
  scopes?: string[];
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  activityCount: number;
  trainingZoneCount: number;
  activityZoneCount: number;
  latestZoneSyncAt?: string;
  latestActivityAt?: string;
  latestSyncJob?: {
    status: string;
    syncType: string;
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
    errorMessage?: string;
    startedAt: string;
    completedAt?: string;
  };
};

export type SyncResult = {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  activityCount: number;
  trainingZoneCount: number;
  activityZoneCount: number;
  lastSyncAt: string;
};

export type StravaCronSyncResult = {
  shouldRun: boolean;
  cadence: "daily_nightly";
  localTime: string;
  minMinutesBetweenSyncs: number;
  checkedConnections: number;
  processedConnections: number;
  syncedConnections: number;
  skippedConnections: number;
  errorConnections: number;
  results: Array<{
    userId: string;
    connectionId: string;
    status: "synced" | "skipped" | "error";
    reason?: string;
    importedCount?: number;
    updatedCount?: number;
    skippedCount?: number;
    activityCount?: number;
    lastSyncAt?: string;
    errorMessage?: string;
  }>;
};

export async function getStravaIntegrationStatus(userId: string): Promise<IntegrationStatus> {
  if (!isServiceRoleConfigured()) {
    return {
      configured: false,
      connected: false,
      provider: "strava",
      activityCount: 0,
      trainingZoneCount: 0,
      activityZoneCount: 0
    };
  }

  const supabase = createServiceRoleClient();
  const { data: connection } = await supabase
    .from("external_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .maybeSingle();
  const { count } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source_provider", "strava");
  const { data: latestActivity } = await supabase
    .from("activities")
    .select("start_date")
    .eq("user_id", userId)
    .eq("source_provider", "strava")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: latestSyncJob } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count: trainingZoneCount } = await supabase
    .from("training_zones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source_provider", "strava");
  const { count: activityZoneCount } = await supabase
    .from("activity_zones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source_provider", "strava");
  const { data: latestZone } = await supabase
    .from("training_zones")
    .select("imported_at")
    .eq("user_id", userId)
    .eq("source_provider", "strava")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const typedConnection = connection as ExternalConnectionRow | null;
  const typedLatestActivity = latestActivity as { start_date?: string } | null;
  const typedLatestSyncJob = latestSyncJob as Record<string, unknown> | null;
  const typedLatestZone = latestZone as { imported_at?: string } | null;

  return {
    configured: true,
    connected: Boolean(typedConnection),
    provider: "strava",
    status: typedConnection?.status,
    athlete: typedConnection ? {
      id: typedConnection.provider_user_id ?? undefined,
      name: typedConnection.provider_username ?? undefined
    } : undefined,
    scopes: typedConnection?.scopes,
    lastSyncAt: typedConnection?.last_sync_at ?? undefined,
    lastSyncStatus: typedConnection?.last_sync_status ?? undefined,
    lastSyncError: typedConnection?.last_sync_error ?? undefined,
    activityCount: count ?? 0,
    trainingZoneCount: trainingZoneCount ?? 0,
    activityZoneCount: activityZoneCount ?? 0,
    latestZoneSyncAt: typedLatestZone?.imported_at,
    latestActivityAt: typedLatestActivity?.start_date,
    latestSyncJob: typedLatestSyncJob ? {
      status: String(typedLatestSyncJob.status),
      syncType: String(typedLatestSyncJob.sync_type),
      importedCount: Number(typedLatestSyncJob.imported_count ?? 0),
      updatedCount: Number(typedLatestSyncJob.updated_count ?? 0),
      skippedCount: Number(typedLatestSyncJob.skipped_count ?? 0),
      errorMessage: typeof typedLatestSyncJob.error_message === "string" ? typedLatestSyncJob.error_message : undefined,
      startedAt: String(typedLatestSyncJob.started_at),
      completedAt: typeof typedLatestSyncJob.completed_at === "string" ? typedLatestSyncJob.completed_at : undefined
    } : undefined
  };
}

export async function syncStravaActivities(userId: string, syncType: "initial" | "manual" | "incremental"): Promise<SyncResult> {
  const supabase = createServiceRoleClient();
  const connection = await getConnection(userId);
  const job = await createSyncJob(userId, connection.id, syncType);

  try {
    const accessToken = await getFreshAccessToken(connection.id);
    const after = syncType === "initial" ? undefined : await getIncrementalAfterTimestamp(userId);
    const maxPages = Number.parseInt(process.env.STRAVA_SYNC_MAX_PAGES ?? "50", 10);
    const streamLimit = Number.parseInt(process.env.STRAVA_STREAM_SYNC_LIMIT ?? "50", 10);
    const activityZoneLimit = Number.parseInt(process.env.STRAVA_ACTIVITY_ZONE_SYNC_LIMIT ?? "50", 10);
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let streamCount = 0;
    let activityZoneCount = 0;
    let activityZoneRequestCount = 0;
    let activityZonesUnavailable = false;

    const trainingZoneCount = await syncAthleteZones(connection.id, userId, accessToken);

    for (let page = 1; page <= maxPages; page += 1) {
      const activities = await listStravaActivities({
        accessToken,
        page,
        perPage: 200,
        after
      });

      if (activities.length === 0) break;

      for (const summary of activities) {
        const detailed = await getStravaActivity({ accessToken, activityId: summary.id });
        const mapped = mapStravaActivity(detailed, userId);
        const wasExisting = await activityExists(userId, mapped.sourceActivityId);
        const activityId = await upsertActivity(connection.id, userId, mapped, detailed);
        const equipment = mapStravaEquipment(detailed);

        if (equipment) {
          await supabase.from("equipment").upsert({
            user_id: userId,
            ...equipment
          }, { onConflict: "user_id,source_provider,source_equipment_id" });
        }

        if (streamCount < streamLimit) {
          await syncStreams(activityId, userId, mapped.sourceActivityId, accessToken);
          streamCount += 1;
        }

        if (!activityZonesUnavailable && activityZoneRequestCount < activityZoneLimit) {
          const zoneSyncResult = await syncActivityZones(activityId, userId, mapped.sourceActivityId, accessToken);
          activityZoneRequestCount += 1;
          if (zoneSyncResult === null) activityZonesUnavailable = true;
          else activityZoneCount += zoneSyncResult;
        }

        if (wasExisting) updatedCount += 1;
        else importedCount += 1;
      }
    }

    const lastSyncAt = new Date().toISOString();
    const { count } = await supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source_provider", "strava");

    await supabase
      .from("external_connections")
      .update({
        last_sync_at: lastSyncAt,
        last_sync_status: "success",
        last_sync_error: null
      })
      .eq("id", connection.id);
    await finishSyncJob(job.id, {
      status: "success",
      importedCount,
      updatedCount,
      skippedCount
    });

    return {
      importedCount,
      updatedCount,
      skippedCount,
      activityCount: count ?? importedCount + updatedCount,
      trainingZoneCount,
      activityZoneCount,
      lastSyncAt
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strava-Synchronisation fehlgeschlagen.";

    await supabase
      .from("external_connections")
      .update({
        last_sync_status: "error",
        last_sync_error: message
      })
      .eq("id", connection.id);
    await finishSyncJob(job.id, {
      status: "error",
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorMessage: message
    });

    throw error;
  }
}

export async function syncConnectedStravaActivitiesForCron(options: { force?: boolean; now?: Date } = {}): Promise<StravaCronSyncResult> {
  if (!isServiceRoleConfigured()) {
    throw new Error("Supabase Service Role ist nicht konfiguriert.");
  }

  const now = options.now ?? new Date();
  const schedule = createStravaCronSchedule(now);
  const supabase = createServiceRoleClient();

  if (!schedule.shouldRun && !options.force) {
    return {
      ...schedule,
      checkedConnections: 0,
      processedConnections: 0,
      syncedConnections: 0,
      skippedConnections: 0,
      errorConnections: 0,
      results: []
    };
  }

  const { data, error } = await supabase
    .from("external_connections")
    .select("id,user_id,last_sync_at,status")
    .eq("provider", "strava")
    .eq("status", "connected");

  if (error) {
    throw new Error(`Strava-Verbindungen konnten nicht geladen werden: ${error.message}`);
  }

  const maxConnections = Number.parseInt(process.env.STRAVA_CRON_MAX_CONNECTIONS ?? "10", 10);
  const connections = ((data ?? []) as Array<Pick<ExternalConnectionRow, "id" | "user_id" | "last_sync_at" | "status">>)
    .sort((left, right) => String(left.last_sync_at ?? "").localeCompare(String(right.last_sync_at ?? "")))
    .slice(0, Number.isFinite(maxConnections) && maxConnections > 0 ? maxConnections : 10);
  const results: StravaCronSyncResult["results"] = [];

  for (const connection of connections) {
    const skipReason = options.force
      ? null
      : await getCronSkipReason(connection, schedule.minMinutesBetweenSyncs, now);

    if (skipReason) {
      results.push({
        userId: connection.user_id,
        connectionId: connection.id,
        status: "skipped",
        reason: skipReason
      });
      continue;
    }

    try {
      const syncResult = await syncStravaActivities(connection.user_id, "incremental");
      results.push({
        userId: connection.user_id,
        connectionId: connection.id,
        status: "synced",
        importedCount: syncResult.importedCount,
        updatedCount: syncResult.updatedCount,
        skippedCount: syncResult.skippedCount,
        activityCount: syncResult.activityCount,
        lastSyncAt: syncResult.lastSyncAt
      });
    } catch (syncError) {
      results.push({
        userId: connection.user_id,
        connectionId: connection.id,
        status: "error",
        errorMessage: syncError instanceof Error ? syncError.message : "Strava-Sync fehlgeschlagen."
      });
    }
  }

  return {
    ...schedule,
    checkedConnections: data?.length ?? 0,
    processedConnections: connections.length,
    syncedConnections: results.filter((result) => result.status === "synced").length,
    skippedConnections: results.filter((result) => result.status === "skipped").length,
    errorConnections: results.filter((result) => result.status === "error").length,
    results
  };
}

export async function loadRecentExternalActivitiesForCoach(userId: string) {
  if (!isServiceRoleConfigured()) return [];

  const supabase = createServiceRoleClient();
  const since = new Date();
  since.setDate(since.getDate() - 56);

  const { data } = await supabase
    .from("activities")
    .select("id,source_provider,source_activity_id,name,description,sport_type,workout_type,start_date,start_date_local,timezone,utc_offset,distance_meters,moving_time_seconds,elapsed_time_seconds,elevation_gain_meters,calories,average_speed_mps,max_speed_mps,average_pace_seconds_per_km,max_pace_seconds_per_km,average_heartrate,max_heartrate,average_watts,max_watts,weighted_average_watts,normalized_power,average_cadence,max_cadence,relative_effort,training_load,temperature_celsius,device_name,gear_id,gear_name,is_private,is_commute,is_indoor,is_manual")
    .eq("user_id", userId)
    .gte("start_date", since.toISOString())
    .order("start_date", { ascending: false })
    .limit(120);

  const activities = (data ?? []) as Array<Record<string, unknown> & { id: string }>;
  const activityIds = activities.map((activity) => activity.id).filter(Boolean);

  if (activityIds.length === 0) return activities;

  const { data: zoneRows } = await supabase
    .from("activity_zones")
    .select("activity_id,zone_type,score,sensor_based,custom_zones,points,distribution_buckets,imported_at")
    .eq("user_id", userId)
    .in("activity_id", activityIds);
  const zonesByActivityId = ((zoneRows ?? []) as Array<Record<string, unknown> & { activity_id: string }>).reduce<Record<string, Record<string, unknown>[]>>((groups, zone) => {
    groups[zone.activity_id] = [...(groups[zone.activity_id] ?? []), zone];
    return groups;
  }, {});

  return prioritizeGarminActivities(activities.map((activity) => ({
    ...activity,
    zone_summaries: summarizeActivityZonesForCoach(zonesByActivityId[activity.id] ?? [])
  })));
}

export async function loadTrainingZonesForCoach(userId: string) {
  if (!isServiceRoleConfigured()) return [];

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("training_zones")
    .select("source_provider,zone_type,sport_type,custom_zones,zones,imported_at")
    .eq("user_id", userId)
    .order("imported_at", { ascending: false })
    .limit(12);

  return (data ?? []).map((zone) => ({
    sourceProvider: String(zone.source_provider ?? "unknown"),
    zoneType: String(zone.zone_type ?? "unknown"),
    sportType: typeof zone.sport_type === "string" ? zone.sport_type : null,
    customZones: typeof zone.custom_zones === "boolean" ? zone.custom_zones : null,
    zones: Array.isArray(zone.zones) ? zone.zones : [],
    importedAt: typeof zone.imported_at === "string" ? zone.imported_at : null
  }));
}

function summarizeActivityZonesForCoach(zones: Array<Record<string, unknown>>) {
  return zones.map((zone) => ({
    zoneType: String(zone.zone_type ?? "unknown"),
    score: optionalNumber(zone.score) ?? null,
    sensorBased: typeof zone.sensor_based === "boolean" ? zone.sensor_based : null,
    customZones: typeof zone.custom_zones === "boolean" ? zone.custom_zones : null,
    points: optionalNumber(zone.points) ?? null,
    distribution: summarizeZoneDistribution(zone.distribution_buckets),
    importedAt: typeof zone.imported_at === "string" ? zone.imported_at : null
  }));
}

function summarizeZoneDistribution(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((bucket, index) => {
    const item = bucket && typeof bucket === "object" ? bucket as Record<string, unknown> : {};

    return {
      zone: optionalNumber(item.zone) ?? index + 1,
      min: optionalNumber(item.min) ?? null,
      max: optionalNumber(item.max) ?? null,
      timeSeconds: optionalNumber(item.timeSeconds ?? item.time) ?? 0
    };
  });
}

function createStravaCronSchedule(now: Date) {
  const local = getBerlinTimeParts(now);

  return {
    shouldRun: true,
    cadence: "daily_nightly" as const,
    localTime: `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`,
    minMinutesBetweenSyncs: 23 * 60
  };
}

function getBerlinTimeParts(now: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);
  const part = (type: string) => Number.parseInt(parts.find((item) => item.type === type)?.value ?? "0", 10);

  return {
    hour: part("hour"),
    minute: part("minute")
  };
}

async function getCronSkipReason(
  connection: Pick<ExternalConnectionRow, "id" | "user_id" | "last_sync_at">,
  minMinutesBetweenSyncs: number,
  now: Date
): Promise<string | null> {
  if (connection.last_sync_at) {
    const lastSyncAgeMs = now.getTime() - new Date(connection.last_sync_at).getTime();
    if (lastSyncAgeMs >= 0 && lastSyncAgeMs < minMinutesBetweenSyncs * 60 * 1000) {
      return `last_sync_at ist jünger als ${minMinutesBetweenSyncs} Minuten`;
    }
  }

  if (await hasRecentRunningSyncJob(connection.user_id, connection.id, now)) {
    return "Sync-Job läuft bereits oder ist noch zu frisch";
  }

  return null;
}

async function hasRecentRunningSyncJob(userId: string, connectionId: string, now: Date): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const since = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("sync_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .eq("connection_id", connectionId)
    .eq("status", "running")
    .gte("started_at", since)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

async function getConnection(userId: string): Promise<ExternalConnectionRow> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("external_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .maybeSingle();

  if (error || !data) throw new Error("Strava ist noch nicht verbunden.");

  return data as ExternalConnectionRow;
}

async function getFreshAccessToken(connectionId: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("external_source_tokens")
    .select("*")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (error || !data) throw new Error("Strava-Tokens konnten nicht geladen werden.");

  const token = data as TokenRow;
  const expiresAt = new Date(token.expires_at).getTime();
  const refreshAt = Date.now() + 5 * 60 * 1000;
  if (expiresAt > refreshAt) return token.access_token;

  const refreshed = await refreshStravaToken(token.refresh_token);

  await supabase
    .from("external_source_tokens")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
      token_type: refreshed.token_type ?? "Bearer"
    })
    .eq("connection_id", connectionId);

  return refreshed.access_token;
}

async function getIncrementalAfterTimestamp(userId: string): Promise<number | undefined> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("activities")
    .select("start_date")
    .eq("user_id", userId)
    .eq("source_provider", "strava")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestActivity = data as { start_date?: string } | null;
  if (!latestActivity?.start_date) return undefined;

  return Math.max(0, Math.floor(new Date(latestActivity.start_date).getTime() / 1000) - 24 * 60 * 60);
}

async function activityExists(userId: string, sourceActivityId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("activities")
    .select("id")
    .eq("user_id", userId)
    .eq("source_provider", "strava")
    .eq("source_activity_id", sourceActivityId)
    .maybeSingle();

  return Boolean(data);
}

async function upsertActivity(connectionId: string, userId: string, activity: ReturnType<typeof mapStravaActivity>, raw: unknown): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("activities")
    .upsert({
      user_id: userId,
      source_provider: "strava",
      source_connection_id: connectionId,
      source_activity_id: activity.sourceActivityId,
      name: activity.name,
      description: activity.description ?? null,
      sport_type: activity.sportType,
      workout_type: activity.workoutType ?? null,
      start_date: activity.startDate,
      start_date_local: activity.startDateLocal ?? null,
      timezone: activity.timezone ?? null,
      utc_offset: activity.utcOffset ?? null,
      elapsed_time_seconds: activity.elapsedTimeSeconds ?? null,
      moving_time_seconds: activity.movingTimeSeconds ?? null,
      distance_meters: activity.distanceMeters ?? null,
      elevation_gain_meters: activity.elevationGainMeters ?? null,
      calories: activity.calories ?? null,
      average_speed_mps: activity.averageSpeedMps ?? null,
      max_speed_mps: activity.maxSpeedMps ?? null,
      average_pace_seconds_per_km: activity.averagePaceSecondsPerKm ?? null,
      max_pace_seconds_per_km: activity.maxPaceSecondsPerKm ?? null,
      average_heartrate: activity.averageHeartrate ?? null,
      max_heartrate: activity.maxHeartrate ?? null,
      average_watts: activity.averageWatts ?? null,
      max_watts: activity.maxWatts ?? null,
      weighted_average_watts: activity.weightedAverageWatts ?? null,
      normalized_power: activity.normalizedPower ?? null,
      average_cadence: activity.averageCadence ?? null,
      max_cadence: activity.maxCadence ?? null,
      relative_effort: activity.relativeEffort ?? null,
      training_load: activity.trainingLoad ?? null,
      temperature_celsius: activity.temperatureCelsius ?? null,
      device_name: activity.deviceName ?? null,
      gear_id: activity.gearId ?? null,
      gear_name: activity.gearName ?? null,
      is_private: activity.isPrivate,
      is_commute: activity.isCommute,
      is_indoor: activity.isIndoor,
      is_manual: activity.isManual,
      raw
    }, { onConflict: "user_id,source_provider,source_activity_id" })
    .select("id")
    .single();

  if (error || !data) throw new Error("Aktivität konnte nicht gespeichert werden.");

  return (data as { id: string }).id;
}

async function syncStreams(activityId: string, userId: string, sourceActivityId: string, accessToken: string) {
  const supabase = createServiceRoleClient();
  const streams = await getStravaActivityStreams({ accessToken, activityId: sourceActivityId }).catch(() => []);

  if (streams.length === 0) return;

  await supabase.from("activity_streams").upsert(
    streams.map((stream) => ({
      activity_id: activityId,
      user_id: userId,
      source_provider: "strava",
      source_activity_id: sourceActivityId,
      stream_type: stream.type,
      series: stream.series,
      original_size: stream.originalSize ?? null,
      resolution: stream.resolution ?? null
    })),
    { onConflict: "activity_id,stream_type" }
  );
}

async function syncAthleteZones(connectionId: string, userId: string, accessToken: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const zones = await getStravaAthleteZones({ accessToken }).catch((error) => {
    console.warn("[strava-zones] athlete zones unavailable", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return null;
  });

  if (!zones) return 0;

  const rows = normalizeAthleteZoneRows(zones, connectionId, userId);
  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("training_zones")
    .upsert(rows, { onConflict: "user_id,source_provider,zone_type" });

  if (error) {
    console.warn("[strava-zones] athlete zones could not be stored", { message: error.message });
    return 0;
  }

  return rows.length;
}

async function syncActivityZones(activityId: string, userId: string, sourceActivityId: string, accessToken: string): Promise<number | null> {
  const supabase = createServiceRoleClient();
  const zones = await getStravaActivityZones({ accessToken, activityId: sourceActivityId }).catch((error) => {
    const message = error instanceof Error ? error.message : "unknown";
    console.warn("[strava-zones] activity zones unavailable", {
      sourceActivityId,
      message
    });
    return isPermanentZoneSyncFailure(message) ? null : [];
  });

  if (zones === null) return null;
  if (zones.length === 0) return 0;

  const rows = zones
    .map((zone) => normalizeActivityZoneRow(zone, activityId, userId, sourceActivityId))
    .filter((row): row is NonNullable<ReturnType<typeof normalizeActivityZoneRow>> => Boolean(row));

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("activity_zones")
    .upsert(rows, { onConflict: "activity_id,zone_type" });

  if (error) {
    console.warn("[strava-zones] activity zones could not be stored", {
      sourceActivityId,
      message: error.message
    });
    return 0;
  }

  return rows.length;
}

function isPermanentZoneSyncFailure(message: string): boolean {
  return message.includes("(401)") || message.includes("(403)") || message.includes("(429)");
}

function normalizeAthleteZoneRows(zones: Record<string, unknown>, connectionId: string, userId: string) {
  const importedAt = new Date().toISOString();
  const entries: Array<{ sourceKey: string; zoneType: string; value: StravaAthleteZoneSet }> = [];

  for (const sourceKey of Object.keys(zones)) {
    const value = zones[sourceKey];
    if (!isAthleteZoneSet(value)) continue;

    entries.push({
      sourceKey,
      zoneType: normalizeZoneType(sourceKey),
      value
    });
  }

  return entries
    .filter((entry) => entry.value.zones?.length)
    .map((entry) => ({
      user_id: userId,
      source_provider: "strava",
      source_connection_id: connectionId,
      zone_type: entry.zoneType,
      sport_type: null,
      custom_zones: typeof entry.value.custom_zones === "boolean" ? entry.value.custom_zones : null,
      zones: (entry.value.zones ?? []).map((zone, index) => ({
        zone: index + 1,
        min: optionalNumber(zone.min),
        max: optionalNumber(zone.max)
      })),
      raw: {
        sourceKey: entry.sourceKey,
        ...entry.value
      },
      imported_at: importedAt
    }));
}

function normalizeActivityZoneRow(zone: StravaActivityZone, activityId: string, userId: string, sourceActivityId: string) {
  const zoneType = normalizeZoneType(String(zone.type ?? ""));
  if (!zoneType || zoneType === "unknown") return null;

  return {
    activity_id: activityId,
    user_id: userId,
    source_provider: "strava",
    source_activity_id: sourceActivityId,
    zone_type: zoneType,
    score: optionalNumber(zone.score) ?? null,
    sensor_based: typeof zone.sensor_based === "boolean" ? zone.sensor_based : null,
    custom_zones: typeof zone.custom_zones === "boolean" ? zone.custom_zones : null,
    points: optionalNumber(zone.points) ?? null,
    distribution_buckets: Array.isArray(zone.distribution_buckets)
      ? zone.distribution_buckets.map((bucket, index) => ({
        zone: index + 1,
        min: optionalNumber(bucket.min),
        max: optionalNumber(bucket.max),
        timeSeconds: optionalNumber(bucket.time) ?? 0
      }))
      : [],
    raw: zone,
    imported_at: new Date().toISOString()
  };
}

function isAthleteZoneSet(value: unknown): value is StravaAthleteZoneSet {
  if (!value || typeof value !== "object") return false;

  return Array.isArray((value as StravaAthleteZoneSet).zones);
}

function normalizeZoneType(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  if (normalized === "heart_rate" || normalized === "heartrate" || normalized === "hr") return "heartrate";
  if (normalized.includes("power") || normalized === "watts") return "power";
  if (normalized.includes("pace")) return "pace";

  return normalized || "unknown";
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

async function createSyncJob(userId: string, connectionId: string, syncType: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sync_jobs")
    .insert({
      user_id: userId,
      provider: "strava",
      connection_id: connectionId,
      sync_type: syncType,
      status: "running"
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Sync-Job konnte nicht gestartet werden.");

  return data as { id: string };
}

async function finishSyncJob(jobId: string, result: {
  status: "success" | "error";
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorMessage?: string;
}) {
  const supabase = createServiceRoleClient();

  await supabase
    .from("sync_jobs")
    .update({
      status: result.status,
      imported_count: result.importedCount,
      updated_count: result.updatedCount,
      skipped_count: result.skippedCount,
      error_message: result.errorMessage ?? null,
      completed_at: new Date().toISOString()
    })
    .eq("id", jobId);
}
