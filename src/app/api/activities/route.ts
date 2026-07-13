import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { prioritizeGarminActivities } from "@/domain/integrations/activity-priority";
import type { DailyPerformanceSnapshot } from "@/domain/performance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActivityRow = {
  id: string;
  source_provider: string;
  source_activity_id: string;
  name: string;
  sport_type: string;
  start_date: string;
  start_date_local: string | null;
  distance_meters: number | null;
  calories: number | null;
  moving_time_seconds: number | null;
  elapsed_time_seconds: number | null;
  average_heartrate: number | null;
  relative_effort: number | null;
  training_load: number | null;
  average_pace_seconds_per_km: number | null;
};

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ activities: [], garminDailyEnergyByDate: {} });
  }

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!isIsoDate(start) || !isIsoDate(end)) {
    return NextResponse.json({ error: "Start- oder Enddatum fehlt." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ activities: [], garminDailyEnergyByDate: {} });
  }

  const startInclusive = new Date(`${start}T00:00:00.000Z`);
  startInclusive.setUTCDate(startInclusive.getUTCDate() - 1);
  const endExclusive = new Date(`${end}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const [activityResult, energyResult, sleepResult, hrvResult, recoveryResult] = await Promise.all([
    supabase
      .from("activities")
      .select("id,source_provider,source_activity_id,name,sport_type,start_date,start_date_local,distance_meters,calories,moving_time_seconds,elapsed_time_seconds,average_heartrate,relative_effort,training_load,average_pace_seconds_per_km")
      .eq("user_id", user.id)
      .gte("start_date", startInclusive.toISOString())
      .lt("start_date", endExclusive.toISOString())
      .order("start_date", { ascending: true }),
    supabase
      .from("daily_health_summaries")
      .select("date,total_calories,active_calories,resting_calories,steps,distance_m,moderate_intensity_minutes,vigorous_intensity_minutes,resting_heart_rate,average_stress,max_stress,body_battery_start,body_battery_end,body_battery_high,body_battery_low,updated_at")
      .eq("user_id", user.id)
      .eq("source", "garmin")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true }),
    supabase
      .from("sleep_summaries")
      .select("sleep_date,duration_seconds,sleep_score,average_hrv,average_stress,updated_at")
      .eq("user_id", user.id)
      .eq("source", "garmin")
      .gte("sleep_date", start)
      .lte("sleep_date", end),
    supabase
      .from("hrv_summaries")
      .select("date,nightly_average,weekly_average,baseline_low,baseline_high,status,updated_at")
      .eq("user_id", user.id)
      .eq("source", "garmin")
      .gte("date", start)
      .lte("date", end),
    supabase
      .from("recovery_training_states")
      .select("measured_at,training_readiness,recovery_time_seconds,training_status,acute_load,load_ratio,vo2max_running,lactate_threshold_heart_rate,lactate_threshold_pace,race_predictions_json,updated_at")
      .eq("user_id", user.id)
      .eq("source", "garmin")
      .gte("measured_at", `${start}T00:00:00.000Z`)
      .lt("measured_at", endExclusive.toISOString())
      .order("measured_at", { ascending: false })
  ]);
  const { data, error } = activityResult;

  if (error) {
    console.error("[activities] failed to load external activities", { message: error.message });

    return NextResponse.json({ activities: [], garminDailyEnergyByDate: {} });
  }

  const garminDailyEnergyByDate = Object.fromEntries((energyResult.data ?? []).map((row) => [String(row.date), {
      totalCalories: optionalNumber(row.total_calories),
      activeCalories: optionalNumber(row.active_calories),
      restingCalories: optionalNumber(row.resting_calories)
    }]));
  const performanceByDate = createPerformanceSnapshots(
    energyResult.data ?? [],
    sleepResult.data ?? [],
    hrvResult.data ?? [],
    recoveryResult.data ?? []
  );

  return NextResponse.json({
    activities: prioritizeGarminActivities(data as ActivityRow[] | null ?? []).map((activity) => mapActivity(activity, garminDailyEnergyByDate)),
    garminDailyEnergyByDate,
    performanceByDate
  });
}

function createPerformanceSnapshots(
  dailyRows: Array<Record<string, unknown>>,
  sleepRows: Array<Record<string, unknown>>,
  hrvRows: Array<Record<string, unknown>>,
  recoveryRows: Array<Record<string, unknown>>
): Record<string, DailyPerformanceSnapshot> {
  const dates = new Set<string>();
  for (const row of dailyRows) dates.add(String(row.date));
  for (const row of sleepRows) dates.add(String(row.sleep_date));
  for (const row of hrvRows) dates.add(String(row.date));
  for (const row of recoveryRows) dates.add(String(row.measured_at).slice(0, 10));

  return Object.fromEntries(Array.from(dates).map((date) => {
    const daily = dailyRows.find((row) => String(row.date) === date) ?? {};
    const sleep = sleepRows.find((row) => String(row.sleep_date) === date) ?? {};
    const hrv = hrvRows.find((row) => String(row.date) === date) ?? {};
    const recovery = recoveryRows.find((row) => String(row.measured_at).slice(0, 10) === date) ?? {};
    const updatedAt = [daily.updated_at, sleep.updated_at, hrv.updated_at, recovery.updated_at]
      .filter((value): value is string => typeof value === "string")
      .sort()
      .at(-1) ?? null;

    return [date, {
      date,
      source: "garmin",
      updatedAt,
      energy: {
        totalCalories: optionalNumber(daily.total_calories),
        activeCalories: optionalNumber(daily.active_calories),
        restingCalories: optionalNumber(daily.resting_calories)
      },
      movement: {
        steps: optionalNumber(daily.steps),
        distanceMeters: optionalNumber(daily.distance_m),
        moderateIntensityMinutes: optionalNumber(daily.moderate_intensity_minutes),
        vigorousIntensityMinutes: optionalNumber(daily.vigorous_intensity_minutes)
      },
      recovery: {
        readiness: optionalNumber(recovery.training_readiness),
        recoveryTimeSeconds: optionalNumber(recovery.recovery_time_seconds),
        trainingStatus: optionalString(recovery.training_status),
        acuteLoad: optionalNumber(recovery.acute_load),
        loadRatio: optionalNumber(recovery.load_ratio),
        vo2maxRunning: optionalNumber(recovery.vo2max_running),
        lactateThresholdHeartRate: optionalNumber(recovery.lactate_threshold_heart_rate),
        lactateThresholdPace: optionalString(recovery.lactate_threshold_pace),
        racePredictions: optionalObject(recovery.race_predictions_json)
      },
      sleep: {
        durationSeconds: optionalNumber(sleep.duration_seconds),
        score: optionalNumber(sleep.sleep_score),
        averageHrv: optionalNumber(sleep.average_hrv),
        averageStress: optionalNumber(sleep.average_stress)
      },
      vitals: {
        restingHeartRate: optionalNumber(daily.resting_heart_rate),
        averageStress: optionalNumber(daily.average_stress),
        maxStress: optionalNumber(daily.max_stress),
        bodyBatteryStart: optionalNumber(daily.body_battery_start),
        bodyBatteryEnd: optionalNumber(daily.body_battery_end),
        bodyBatteryHigh: optionalNumber(daily.body_battery_high),
        bodyBatteryLow: optionalNumber(daily.body_battery_low),
        hrvNightlyAverage: optionalNumber(hrv.nightly_average),
        hrvWeeklyAverage: optionalNumber(hrv.weekly_average),
        hrvBaselineLow: optionalNumber(hrv.baseline_low),
        hrvBaselineHigh: optionalNumber(hrv.baseline_high),
        hrvStatus: optionalString(hrv.status)
      }
    } satisfies DailyPerformanceSnapshot];
  }));
}

function mapActivity(
  activity: ActivityRow & { merged_source_providers?: string[]; source_priority?: string },
  energyByDate: Record<string, { totalCalories: number | null; activeCalories: number | null; restingCalories: number | null }>
) {
  const activityDate = (activity.start_date_local ?? activity.start_date).slice(0, 10);
  const dailyEnergy = energyByDate[activityDate];

  return {
    id: activity.id,
    sourceProvider: activity.source_provider,
    sourceActivityId: activity.source_activity_id,
    name: activity.name,
    sportType: activity.sport_type,
    startDate: activity.start_date,
    startDateLocal: activity.start_date_local,
    distanceMeters: activity.distance_meters,
    calories: activity.calories,
    garminDailyTotalCalories: dailyEnergy?.totalCalories ?? null,
    garminDailyActiveCalories: dailyEnergy?.activeCalories ?? null,
    movingTimeSeconds: activity.moving_time_seconds,
    elapsedTimeSeconds: activity.elapsed_time_seconds,
    averageHeartrate: activity.average_heartrate,
    relativeEffort: activity.relative_effort,
    trainingLoad: activity.training_load,
    averagePaceSecondsPerKm: activity.average_pace_seconds_per_km,
    mergedSourceProviders: activity.merged_source_providers ?? [activity.source_provider],
    sourcePriority: activity.source_priority ?? "single_source"
  };
}

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
