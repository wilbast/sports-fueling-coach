import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

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
  moving_time_seconds: number | null;
  elapsed_time_seconds: number | null;
  average_heartrate: number | null;
  relative_effort: number | null;
  training_load: number | null;
  average_pace_seconds_per_km: number | null;
};

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ activities: [] });
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
    return NextResponse.json({ activities: [] });
  }

  const endExclusive = new Date(`${end}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const { data, error } = await supabase
    .from("activities")
    .select("id,source_provider,source_activity_id,name,sport_type,start_date,start_date_local,distance_meters,moving_time_seconds,elapsed_time_seconds,average_heartrate,relative_effort,training_load,average_pace_seconds_per_km")
    .eq("user_id", user.id)
    .gte("start_date", `${start}T00:00:00.000Z`)
    .lt("start_date", endExclusive.toISOString())
    .order("start_date", { ascending: true });

  if (error) {
    console.error("[activities] failed to load external activities", { message: error.message });

    return NextResponse.json({ activities: [] });
  }

  return NextResponse.json({
    activities: (data as ActivityRow[] | null ?? []).map(mapActivity)
  });
}

function mapActivity(activity: ActivityRow) {
  return {
    id: activity.id,
    sourceProvider: activity.source_provider,
    sourceActivityId: activity.source_activity_id,
    name: activity.name,
    sportType: activity.sport_type,
    startDate: activity.start_date,
    startDateLocal: activity.start_date_local,
    distanceMeters: activity.distance_meters,
    movingTimeSeconds: activity.moving_time_seconds,
    elapsedTimeSeconds: activity.elapsed_time_seconds,
    averageHeartrate: activity.average_heartrate,
    relativeEffort: activity.relative_effort,
    trainingLoad: activity.training_load,
    averagePaceSecondsPerKm: activity.average_pace_seconds_per_km
  };
}

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
