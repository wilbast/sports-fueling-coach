import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { prioritizeGarminActivities } from "@/domain/integrations/activity-priority";

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

  const [activityResult, energyResult] = await Promise.all([
    supabase
      .from("activities")
      .select("id,source_provider,source_activity_id,name,sport_type,start_date,start_date_local,distance_meters,calories,moving_time_seconds,elapsed_time_seconds,average_heartrate,relative_effort,training_load,average_pace_seconds_per_km")
      .eq("user_id", user.id)
      .gte("start_date", startInclusive.toISOString())
      .lt("start_date", endExclusive.toISOString())
      .order("start_date", { ascending: true }),
    supabase
      .from("daily_health_summaries")
      .select("date,total_calories,active_calories,resting_calories")
      .eq("user_id", user.id)
      .eq("source", "garmin")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true })
  ]);
  const { data, error } = activityResult;

  if (error) {
    console.error("[activities] failed to load external activities", { message: error.message });

    return NextResponse.json({ activities: [], garminDailyEnergyByDate: {} });
  }

  return NextResponse.json({
    activities: prioritizeGarminActivities(data as ActivityRow[] | null ?? []).map(mapActivity),
    garminDailyEnergyByDate: Object.fromEntries((energyResult.data ?? []).map((row) => [String(row.date), {
      totalCalories: optionalNumber(row.total_calories),
      activeCalories: optionalNumber(row.active_calories),
      restingCalories: optionalNumber(row.resting_calories)
    }]))
  });
}

function mapActivity(activity: ActivityRow & { merged_source_providers?: string[]; source_priority?: string }) {
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
