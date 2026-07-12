export type PrioritizableActivity = {
  source_provider?: string | null;
  source_activity_id?: string | null;
  sport_type?: string | null;
  start_date?: string | null;
  distance_meters?: number | null;
  moving_time_seconds?: number | null;
  elapsed_time_seconds?: number | null;
  zone_summaries?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type PrioritizedActivity<T> = T & {
  merged_source_providers?: string[];
  duplicate_source_activity_ids?: string[];
  source_priority?: "garmin_primary" | "single_source";
};

export function prioritizeGarminActivities<T extends PrioritizableActivity>(activities: T[]): Array<PrioritizedActivity<T>> {
  const ordered = [...activities].sort((left, right) => providerRank(left.source_provider) - providerRank(right.source_provider));
  const canonical: Array<PrioritizedActivity<T>> = [];

  for (const activity of ordered) {
    const duplicateIndex = canonical.findIndex((candidate) => sameRecordedActivity(candidate, activity));
    if (duplicateIndex < 0) {
      canonical.push({
        ...activity,
        merged_source_providers: activity.source_provider ? [activity.source_provider] : [],
        duplicate_source_activity_ids: activity.source_activity_id ? [activity.source_activity_id] : [],
        source_priority: "single_source"
      });
      continue;
    }

    const existing = canonical[duplicateIndex];
    const primary = activity.source_provider === "garmin" ? activity : existing;
    const supplement = activity.source_provider === "garmin" ? existing : activity;
    canonical[duplicateIndex] = {
      ...mergeMissingValues(primary, supplement),
      zone_summaries: mergeZoneSummaries(primary.zone_summaries, supplement.zone_summaries),
      merged_source_providers: uniqueStrings([
        ...(existing.merged_source_providers ?? []),
        existing.source_provider,
        activity.source_provider
      ]),
      duplicate_source_activity_ids: uniqueStrings([
        ...(existing.duplicate_source_activity_ids ?? []),
        existing.source_activity_id,
        activity.source_activity_id
      ]),
      source_priority: primary.source_provider === "garmin" ? "garmin_primary" : "single_source"
    } as PrioritizedActivity<T>;
  }

  return canonical.sort((left, right) => String(right.start_date ?? "").localeCompare(String(left.start_date ?? "")));
}

function sameRecordedActivity(left: PrioritizableActivity, right: PrioritizableActivity): boolean {
  if (left.source_provider === right.source_provider) return false;
  if (normalizeSport(left.sport_type) !== normalizeSport(right.sport_type)) return false;
  const leftStart = Date.parse(String(left.start_date ?? ""));
  const rightStart = Date.parse(String(right.start_date ?? ""));
  if (!Number.isFinite(leftStart) || !Number.isFinite(rightStart) || Math.abs(leftStart - rightStart) > 10 * 60 * 1000) return false;

  const leftDuration = activityDuration(left);
  const rightDuration = activityDuration(right);
  const durationMatches = leftDuration && rightDuration
    ? Math.abs(leftDuration - rightDuration) <= Math.max(300, Math.max(leftDuration, rightDuration) * 0.15)
    : false;
  const leftDistance = positiveNumber(left.distance_meters);
  const rightDistance = positiveNumber(right.distance_meters);
  const distanceMatches = leftDistance && rightDistance
    ? Math.abs(leftDistance - rightDistance) <= Math.max(500, Math.max(leftDistance, rightDistance) * 0.075)
    : false;

  if (leftDistance && rightDistance) return Boolean(distanceMatches && (!leftDuration || !rightDuration || durationMatches));
  if (leftDuration && rightDuration) return Boolean(durationMatches);
  return Math.abs(leftStart - rightStart) <= 2 * 60 * 1000;
}

function mergeMissingValues<T extends PrioritizableActivity>(primary: T | PrioritizedActivity<T>, supplement: T | PrioritizedActivity<T>) {
  const merged = { ...primary } as Record<string, unknown>;
  for (const [key, value] of Object.entries(supplement)) {
    if (isMissing(merged[key]) && !isMissing(value)) merged[key] = value;
  }
  return merged;
}

function mergeZoneSummaries(primary: Array<Record<string, unknown>> | undefined, supplement: Array<Record<string, unknown>> | undefined) {
  const result = [...(primary ?? [])];
  for (const zone of supplement ?? []) {
    const key = String(zone.zoneType ?? zone.zone_type ?? "unknown");
    if (!result.some((candidate) => String(candidate.zoneType ?? candidate.zone_type ?? "unknown") === key)) result.push(zone);
  }
  return result;
}

function normalizeSport(value: string | null | undefined): string {
  const sport = String(value ?? "unknown").toLowerCase();
  if (sport.includes("run")) return "running";
  if (sport.includes("cycl") || sport.includes("bike")) return "cycling";
  if (sport.includes("swim")) return "swimming";
  if (sport.includes("strength") || sport.includes("weight")) return "strength";
  return sport.replace(/[^a-z0-9]/g, "");
}

function activityDuration(activity: PrioritizableActivity): number | null {
  return positiveNumber(activity.moving_time_seconds) ?? positiveNumber(activity.elapsed_time_seconds);
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function isMissing(value: unknown): boolean {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0);
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)));
}

function providerRank(provider: string | null | undefined): number {
  if (provider === "garmin") return 0;
  if (provider === "strava") return 1;
  return 2;
}

