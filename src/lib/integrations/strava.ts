import type { ExternalActivity, ExternalActivityStream } from "@/domain/integrations/types";

const STRAVA_API_BASE_URL = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export type StravaConfig = {
  clientId: string;
  clientSecret: string;
};

type StravaTokenResponse = {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete?: {
    id?: number;
    username?: string;
    firstname?: string;
    lastname?: string;
  };
  scope?: string;
};

type StravaActivity = Record<string, unknown> & {
  id: number;
  name?: string;
  description?: string;
  type?: string;
  sport_type?: string;
  start_date?: string;
  start_date_local?: string;
  timezone?: string;
  utc_offset?: number;
  elapsed_time?: number;
  moving_time?: number;
  distance?: number;
  total_elevation_gain?: number;
  calories?: number;
  average_speed?: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  average_cadence?: number;
  max_cadence?: number;
  average_temp?: number;
  suffer_score?: number;
  suffer_score_private?: number;
  suffer_score_public?: number;
  device_name?: string;
  gear_id?: string;
  gear?: {
    id?: string;
    name?: string;
    brand_name?: string;
    model_name?: string;
    distance?: number;
  };
  private?: boolean;
  commute?: boolean;
  trainer?: boolean;
  manual?: boolean;
  workout_type?: number | string;
};

type StravaStream = {
  data?: unknown[];
  original_size?: number;
  resolution?: string;
};

export function getStravaConfig(): StravaConfig | null {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  return { clientId, clientSecret };
}

export function getMissingStravaEnvVars(): string[] {
  const missing: string[] = [];

  if (!process.env.STRAVA_CLIENT_ID) missing.push("STRAVA_CLIENT_ID");
  if (!process.env.STRAVA_CLIENT_SECRET) missing.push("STRAVA_CLIENT_SECRET");

  return missing;
}

export function createStravaAuthorizeUrl(input: {
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const config = requireStravaConfig();
  const url = new URL(STRAVA_AUTH_URL);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", input.scope ?? "read,profile:read_all,activity:read_all");
  url.searchParams.set("state", input.state);

  return url.toString();
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const config = requireStravaConfig();

  return postStravaToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code"
  });
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const config = requireStravaConfig();

  return postStravaToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
}

export async function listStravaActivities(input: {
  accessToken: string;
  page: number;
  perPage?: number;
  after?: number;
}): Promise<StravaActivity[]> {
  const url = new URL(`${STRAVA_API_BASE_URL}/athlete/activities`);

  url.searchParams.set("page", String(input.page));
  url.searchParams.set("per_page", String(input.perPage ?? 200));
  if (input.after) url.searchParams.set("after", String(input.after));

  return stravaGet<StravaActivity[]>(url, input.accessToken);
}

export async function getStravaActivity(input: {
  accessToken: string;
  activityId: number | string;
}): Promise<StravaActivity> {
  const url = new URL(`${STRAVA_API_BASE_URL}/activities/${input.activityId}`);

  url.searchParams.set("include_all_efforts", "false");

  return stravaGet<StravaActivity>(url, input.accessToken);
}

export async function getStravaActivityStreams(input: {
  accessToken: string;
  activityId: number | string;
}): Promise<ExternalActivityStream[]> {
  const url = new URL(`${STRAVA_API_BASE_URL}/activities/${input.activityId}/streams`);

  url.searchParams.set("keys", "time,distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp,moving,grade_smooth");
  url.searchParams.set("key_by_type", "true");

  const streams = await stravaGet<Record<string, StravaStream>>(url, input.accessToken);

  return Object.entries(streams)
    .filter(([, stream]) => Array.isArray(stream.data))
    .map(([type, stream]) => ({
      type: type as ExternalActivityStream["type"],
      series: stream.data ?? [],
      originalSize: stream.original_size,
      resolution: stream.resolution
    }));
}

export function mapStravaActivity(activity: StravaActivity, userId: string): ExternalActivity {
  const averageSpeed = optionalNumber(activity.average_speed);
  const maxSpeed = optionalNumber(activity.max_speed);

  return {
    id: "",
    userId,
    sourceProvider: "strava",
    sourceActivityId: String(activity.id),
    name: activity.name ?? "Strava-Aktivität",
    description: optionalString(activity.description),
    sportType: activity.sport_type ?? activity.type ?? "unknown",
    workoutType: activity.workout_type !== undefined ? String(activity.workout_type) : undefined,
    startDate: activity.start_date ?? new Date().toISOString(),
    startDateLocal: activity.start_date_local,
    timezone: activity.timezone,
    utcOffset: optionalNumber(activity.utc_offset),
    elapsedTimeSeconds: optionalNumber(activity.elapsed_time),
    movingTimeSeconds: optionalNumber(activity.moving_time),
    distanceMeters: optionalNumber(activity.distance),
    elevationGainMeters: optionalNumber(activity.total_elevation_gain),
    calories: optionalNumber(activity.calories),
    averageSpeedMps: averageSpeed,
    maxSpeedMps: maxSpeed,
    averagePaceSecondsPerKm: speedToPace(averageSpeed),
    maxPaceSecondsPerKm: speedToPace(maxSpeed),
    averageHeartrate: optionalNumber(activity.average_heartrate),
    maxHeartrate: optionalNumber(activity.max_heartrate),
    averageWatts: optionalNumber(activity.average_watts),
    maxWatts: optionalNumber(activity.max_watts),
    weightedAverageWatts: optionalNumber(activity.weighted_average_watts),
    normalizedPower: optionalNumber(activity.weighted_average_watts),
    averageCadence: optionalNumber(activity.average_cadence),
    maxCadence: optionalNumber(activity.max_cadence),
    relativeEffort: optionalNumber(activity.suffer_score ?? activity.suffer_score_private ?? activity.suffer_score_public),
    trainingLoad: calculateTrainingLoad(activity),
    temperatureCelsius: optionalNumber(activity.average_temp),
    deviceName: optionalString(activity.device_name),
    gearId: optionalString(activity.gear_id ?? activity.gear?.id),
    gearName: optionalString(activity.gear?.name),
    isPrivate: Boolean(activity.private),
    isCommute: Boolean(activity.commute),
    isIndoor: Boolean(activity.trainer),
    isManual: Boolean(activity.manual)
  };
}

export function mapStravaEquipment(activity: StravaActivity) {
  if (!activity.gear?.id) return null;

  return {
    source_provider: "strava",
    source_equipment_id: activity.gear.id,
    name: activity.gear.name ?? null,
    brand_name: activity.gear.brand_name ?? null,
    model_name: activity.gear.model_name ?? null,
    distance_meters: optionalNumber(activity.gear.distance) ?? null,
    raw: activity.gear
  };
}

async function postStravaToken(body: Record<string, string>): Promise<StravaTokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });

  if (!response.ok) {
    throw new Error(`Strava Token-Request fehlgeschlagen (${response.status}).`);
  }

  return response.json() as Promise<StravaTokenResponse>;
}

async function stravaGet<T>(url: URL, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Strava API-Request fehlgeschlagen (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

function requireStravaConfig(): StravaConfig {
  const config = getStravaConfig();
  if (!config) throw new Error("Strava ist nicht konfiguriert.");

  return config;
}

function speedToPace(speedMps?: number): number | undefined {
  if (!speedMps || speedMps <= 0) return undefined;

  return 1000 / speedMps;
}

function calculateTrainingLoad(activity: StravaActivity): number | undefined {
  const relativeEffort = optionalNumber(activity.suffer_score ?? activity.suffer_score_private ?? activity.suffer_score_public);
  if (relativeEffort !== undefined) return relativeEffort;

  const movingMinutes = optionalNumber(activity.moving_time);
  const averageHeartrate = optionalNumber(activity.average_heartrate);
  if (!movingMinutes || !averageHeartrate) return undefined;

  return Math.round((movingMinutes / 60) * (averageHeartrate / 140));
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
