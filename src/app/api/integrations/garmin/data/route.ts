import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 503 });
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const end = validDate(request.nextUrl.searchParams.get("end")) ?? isoDate(new Date());
  const start = validDate(request.nextUrl.searchParams.get("start")) ?? isoDate(addDays(new Date(`${end}T00:00:00.000Z`), -13));
  if (start > end) return NextResponse.json({ error: "Das Startdatum liegt nach dem Enddatum." }, { status: 400 });
  const userId = auth.user.id;
  const startTimestamp = `${start}T00:00:00.000Z`;
  const endExclusive = addDays(new Date(`${end}T00:00:00.000Z`), 1).toISOString();

  const [activities, dailyHealth, sleep, hrv, recovery, connection, latestJob] = await Promise.all([
    supabase.from("activities")
      .select("id,source_activity_id,name,sport_type,start_date,start_date_local,distance_meters,moving_time_seconds,elapsed_time_seconds,elevation_gain_meters,calories,average_speed_mps,max_speed_mps,average_pace_seconds_per_km,max_pace_seconds_per_km,average_heartrate,max_heartrate,average_watts,max_watts,normalized_power,average_cadence,max_cadence,training_load,temperature_celsius,device_name,is_indoor,is_manual")
      .eq("user_id", userId).eq("source_provider", "garmin").gte("start_date", startTimestamp).lt("start_date", endExclusive).order("start_date", { ascending: false }),
    supabase.from("daily_health_summaries")
      .select("date,steps,distance_m,total_calories,active_calories,resting_calories,moderate_intensity_minutes,vigorous_intensity_minutes,resting_heart_rate,min_heart_rate,max_heart_rate,average_stress,max_stress,body_battery_start,body_battery_end,body_battery_high,body_battery_low,average_respiration,spo2_average,updated_at")
      .eq("user_id", userId).eq("source", "garmin").gte("date", start).lte("date", end).order("date", { ascending: false }),
    supabase.from("sleep_summaries")
      .select("sleep_date,sleep_start,sleep_end,duration_seconds,deep_sleep_seconds,light_sleep_seconds,rem_sleep_seconds,awake_seconds,sleep_score,average_stress,average_respiration,average_spo2,average_hrv,updated_at")
      .eq("user_id", userId).eq("source", "garmin").gte("sleep_date", start).lte("sleep_date", end).order("sleep_date", { ascending: false }),
    supabase.from("hrv_summaries")
      .select("date,nightly_average,weekly_average,baseline_low,baseline_high,status,updated_at")
      .eq("user_id", userId).eq("source", "garmin").gte("date", start).lte("date", end).order("date", { ascending: false }),
    supabase.from("recovery_training_states")
      .select("measured_at,training_readiness,recovery_time_seconds,training_status,acute_load,load_ratio,load_focus_json,vo2max_running,vo2max_cycling,lactate_threshold_heart_rate,lactate_threshold_pace,ftp,endurance_score,hill_score,heat_acclimation,altitude_acclimation,updated_at")
      .eq("user_id", userId).eq("source", "garmin").gte("measured_at", startTimestamp).lt("measured_at", endExclusive).order("measured_at", { ascending: false }),
    supabase.from("garmin_connections")
      .select("connection_status,last_successful_sync_at,earliest_imported_date")
      .eq("user_id", userId).eq("provider", "garmin").maybeSingle(),
    supabase.from("garmin_sync_jobs")
      .select("status,window_start,window_end,last_error_code,sanitized_error_message,created_at,finished_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const errors = [activities, dailyHealth, sleep, hrv, recovery, connection, latestJob]
    .map((result) => result.error?.message)
    .filter((message): message is string => Boolean(message));

  return NextResponse.json({
    range: { start, end },
    activities: activities.data ?? [],
    health: {
      daily: dailyHealth.data ?? [],
      sleep: sleep.data ?? [],
      hrv: hrv.data ?? [],
      recovery: recovery.data ?? []
    },
    sync: {
      connection: connection.data ?? null,
      latestJob: latestJob.data ?? null
    },
    warnings: errors
  });
}

function validDate(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; }
