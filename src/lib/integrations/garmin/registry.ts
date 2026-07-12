export type GarminSyncFrequency = "initial" | "hourly" | "manual" | "backfill";

export type GarminReadDefinition = {
  endpointKey: string;
  dataDomain: GarminDataDomain;
  methodName: string;
  parameterStrategy: "date" | "date_range" | "none";
  frequency: GarminSyncFrequency[];
  historicalStrategy: "rolling_window" | "backfill_by_day" | "latest_only";
  normalizeTo: Array<"activities" | "daily_health" | "sleep" | "hrv" | "recovery">;
  optional: boolean;
};

export type GarminDataDomain =
  | "profile"
  | "devices"
  | "daily_health"
  | "sleep"
  | "hrv"
  | "stress"
  | "body_battery"
  | "activities"
  | "training_readiness"
  | "training_status"
  | "performance"
  | "weight";

export const GARMIN_DANGEROUS_METHOD_PREFIXES = [
  "create",
  "add",
  "set",
  "update",
  "edit",
  "delete",
  "remove",
  "upload",
  "import",
  "schedule",
  "unschedule",
  "accept",
  "decline",
  "join",
  "leave"
];

export const GARMIN_READ_REGISTRY: GarminReadDefinition[] = [
  {
    endpointKey: "profile_full_name",
    dataDomain: "profile",
    methodName: "get_full_name",
    parameterStrategy: "none",
    frequency: ["initial", "manual"],
    historicalStrategy: "latest_only",
    normalizeTo: [],
    optional: true
  },
  {
    endpointKey: "devices",
    dataDomain: "devices",
    methodName: "get_devices",
    parameterStrategy: "none",
    frequency: ["initial", "manual", "hourly"],
    historicalStrategy: "latest_only",
    normalizeTo: [],
    optional: true
  },
  {
    endpointKey: "daily_stats",
    dataDomain: "daily_health",
    methodName: "get_stats",
    parameterStrategy: "date",
    frequency: ["initial", "manual", "hourly", "backfill"],
    historicalStrategy: "backfill_by_day",
    normalizeTo: ["daily_health"],
    optional: false
  },
  {
    endpointKey: "sleep",
    dataDomain: "sleep",
    methodName: "get_sleep_data",
    parameterStrategy: "date",
    frequency: ["initial", "manual", "hourly", "backfill"],
    historicalStrategy: "backfill_by_day",
    normalizeTo: ["sleep"],
    optional: true
  },
  {
    endpointKey: "hrv",
    dataDomain: "hrv",
    methodName: "get_hrv_data",
    parameterStrategy: "date",
    frequency: ["initial", "manual", "hourly", "backfill"],
    historicalStrategy: "backfill_by_day",
    normalizeTo: ["hrv"],
    optional: true
  },
  {
    endpointKey: "stress",
    dataDomain: "stress",
    methodName: "get_stress_data",
    parameterStrategy: "date",
    frequency: ["initial", "manual", "hourly", "backfill"],
    historicalStrategy: "backfill_by_day",
    normalizeTo: ["daily_health"],
    optional: true
  },
  {
    endpointKey: "body_battery",
    dataDomain: "body_battery",
    methodName: "get_body_battery",
    parameterStrategy: "date",
    frequency: ["initial", "manual", "hourly", "backfill"],
    historicalStrategy: "backfill_by_day",
    normalizeTo: ["daily_health"],
    optional: true
  },
  {
    endpointKey: "activities_by_date",
    dataDomain: "activities",
    methodName: "get_activities_by_date",
    parameterStrategy: "date_range",
    frequency: ["initial", "manual", "hourly", "backfill"],
    historicalStrategy: "rolling_window",
    normalizeTo: ["activities"],
    optional: false
  },
  {
    endpointKey: "training_readiness",
    dataDomain: "training_readiness",
    methodName: "get_training_readiness",
    parameterStrategy: "date",
    frequency: ["initial", "manual", "hourly", "backfill"],
    historicalStrategy: "backfill_by_day",
    normalizeTo: ["recovery"],
    optional: true
  },
  {
    endpointKey: "training_status",
    dataDomain: "training_status",
    methodName: "get_training_status",
    parameterStrategy: "date",
    frequency: ["initial", "manual", "hourly", "backfill"],
    historicalStrategy: "backfill_by_day",
    normalizeTo: ["recovery"],
    optional: true
  },
  {
    endpointKey: "weigh_ins",
    dataDomain: "weight",
    methodName: "get_weigh_ins",
    parameterStrategy: "date_range",
    frequency: ["initial", "manual", "backfill"],
    historicalStrategy: "rolling_window",
    normalizeTo: [],
    optional: true
  }
];

export function getGarminReadRegistry() {
  return GARMIN_READ_REGISTRY;
}

export function isDangerousGarminMethod(methodName: string): boolean {
  const lower = methodName.toLowerCase();
  return GARMIN_DANGEROUS_METHOD_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function assertGarminReadRegistryIsSafe() {
  const dangerous = GARMIN_READ_REGISTRY.filter((item) => isDangerousGarminMethod(item.methodName));
  if (dangerous.length > 0) {
    throw new Error(`Unsichere Garmin-Methoden in Allowlist: ${dangerous.map((item) => item.methodName).join(", ")}`);
  }
}
