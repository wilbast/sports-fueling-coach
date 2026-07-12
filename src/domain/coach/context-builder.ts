import type { UserGoals } from "@/domain/goals/types";
import type { MealLog } from "@/domain/nutrition/logs";
import type { MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import type { DayPlan, WeekPlan } from "@/domain/planning/types";
import type { UserProfile } from "@/domain/profile/types";
import type { AppStandards } from "@/domain/standards/types";
import { describeWorkoutType } from "@/domain/training/catalog";
import type { WorkoutPlan } from "@/domain/training/types";

export type CoachExternalActivitySummary = {
  id?: string;
  source_provider?: string;
  source_activity_id?: string;
  name?: string;
  description?: string | null;
  sport_type?: string;
  workout_type?: string | null;
  start_date?: string;
  start_date_local?: string | null;
  timezone?: string | null;
  utc_offset?: number | null;
  distance_meters?: number | null;
  moving_time_seconds?: number | null;
  elapsed_time_seconds?: number | null;
  elevation_gain_meters?: number | null;
  calories?: number | null;
  average_speed_mps?: number | null;
  max_speed_mps?: number | null;
  average_pace_seconds_per_km?: number | null;
  max_pace_seconds_per_km?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  average_watts?: number | null;
  max_watts?: number | null;
  weighted_average_watts?: number | null;
  normalized_power?: number | null;
  average_cadence?: number | null;
  max_cadence?: number | null;
  relative_effort?: number | null;
  training_load?: number | null;
  temperature_celsius?: number | null;
  device_name?: string | null;
  gear_id?: string | null;
  is_indoor?: boolean | null;
  is_commute?: boolean | null;
  is_private?: boolean | null;
  is_manual?: boolean | null;
  gear_name?: string | null;
  zone_summaries?: CoachActivityZoneSummary[];
  merged_source_providers?: string[];
  duplicate_source_activity_ids?: string[];
  source_priority?: "garmin_primary" | "single_source";
};

export type CoachActivityZoneSummary = {
  zoneType: string;
  score: number | null;
  sensorBased: boolean | null;
  customZones: boolean | null;
  points: number | null;
  distribution: CoachZoneDistributionBucket[];
  importedAt: string | null;
};

export type CoachTrainingZoneSummary = {
  sourceProvider: string;
  zoneType: string;
  sportType: string | null;
  customZones: boolean | null;
  zones: CoachZoneRange[];
  importedAt: string | null;
};

type CoachZoneRange = {
  zone?: number | null;
  min?: number | null;
  max?: number | null;
};

type CoachZoneDistributionBucket = CoachZoneRange & {
  timeSeconds?: number | null;
};

export type CoachContextSource = {
  selectedDate: string;
  profile: UserProfile;
  goals: UserGoals;
  weekPlan: WeekPlan;
  weekPlans?: WeekPlan[];
  mealTemplates?: MealTemplate[];
  standards?: AppStandards;
  externalActivities?: CoachExternalActivitySummary[];
  trainingZones?: CoachTrainingZoneSummary[];
  garminWellness?: unknown;
  nutritionLogsToday?: MealLog[];
};

export type CoachPageContext = "today" | "fueling" | "training" | "planning" | "insights" | "settings" | "coach";

type CoachIntent = {
  mode: "coach" | "planning" | "change";
  type: "info" | "recommendation" | "advice";
  domain: "training" | "fueling" | "nutrition" | "planning" | "recovery" | "general";
  needsTomorrow: boolean;
  needsDeepContext: boolean;
};

export function buildCoachContext(message: string, source: CoachContextSource, pageContext: CoachPageContext = "coach") {
  const intent = applyPageContextToIntent(inferCoachContextIntent(message), pageContext);
  const coachNow = createCoachNow();
  const weekPlans = normalizeWeekPlans(source);
  const allDays = flattenDays(weekPlans);
  const selectedDay = findDay(allDays, source.selectedDate) ?? source.weekPlan.days[0];
  const tomorrow = selectedDay ? getRelativeDay(allDays, selectedDay.date, 1) : undefined;
  const last14Days = getLookbackDays(allDays, source.selectedDate, 14);
  const last7Days = last14Days.slice(-7);
  const mealTemplates = source.mealTemplates ?? [];
  const externalActivities = source.externalActivities ?? [];
  const actualActivitiesForSelectedDay = selectedDay
    ? getActivitiesOnDate(externalActivities, selectedDay.date)
    : [];
  const acuteTrainingLoad = createAcuteTrainingLoad(allDays, externalActivities, source.selectedDate);
  const todayMeals = selectedDay ? hydrateMeals(selectedDay.mealPlan, mealTemplates) : [];
  const nutritionLogsToday = source.nutritionLogsToday ?? [];
  const timedNutritionLogsToday = categorizeNutritionLogsByCurrentTime(nutritionLogsToday, source.selectedDate, coachNow);
  const todayMacroTarget = selectedDay
    ? createMacroTarget(source.profile, source.goals, selectedDay)
    : null;
  const todayMacroBalance = todayMacroTarget
    ? createMacroBalance(todayMacroTarget, todayMeals)
    : null;
  const loggedNutritionBalance = todayMacroTarget
    ? createLoggedNutritionBalance(todayMacroTarget, timedNutritionLogsToday.eatenMeals, "Bilanz nur aus Meals, deren Uhrzeit vor oder gleich der aktuellen Uhrzeit liegt.")
    : null;
  const plannedLoggedNutritionBalance = todayMacroTarget
    ? createLoggedNutritionBalance(todayMacroTarget, timedNutritionLogsToday.plannedMeals, "Geplante/spätere Meals sind noch nicht gegessen und zählen nicht zur Ist-Bilanz.")
    : null;

  return {
    request: {
      message,
      selectedDate: source.selectedDate,
      pageContext,
      interpretedIntent: intent
    },
    contextPolicy: {
      builtServerSide: true,
      openAiReceivesRawDatabase: false,
      openAiCanAccessSupabase: false,
      strategy: "structured_relevant_summary",
      pageWeighting: describePageContextWeighting(pageContext),
      includedDeepContext: intent.needsDeepContext
    },
    userProfile: {
      firstName: source.profile.firstName,
      bodyMetrics: source.profile.bodyMetrics,
      primarySports: source.profile.primarySports,
      coachingStyle: source.profile.coachingStyle,
      family: source.profile.family,
      job: source.profile.job,
      raceGoal: source.profile.raceGoal
    },
    activeGoals: source.goals,
    today: selectedDay ? summarizeDay(selectedDay, mealTemplates, actualActivitiesForSelectedDay) : null,
    tomorrow: intent.needsTomorrow && tomorrow ? summarizeDay(tomorrow, mealTemplates, getActivitiesOnDate(externalActivities, tomorrow.date)) : null,
    acuteTrainingLoad,
    currentWeek: summarizeWeek(source.weekPlan, mealTemplates, externalActivities, source.selectedDate),
    trainingReality: summarizeWeeklyTrainingReality(source.weekPlan, externalActivities, source.selectedDate),
    raceReadiness: createRaceReadinessAssessment(source.weekPlan, source.profile, source.goals, externalActivities, source.selectedDate),
    plannedWorkouts: summarizeWorkouts(source.weekPlan.days.flatMap((day) => day.workouts)),
    loggedMealsToday: {
      status: nutritionLogsToday.length > 0 ? "available_from_supabase" : "empty",
      currentDate: coachNow.date,
      currentTime: coachNow.time,
      timeZone: coachNow.timeZone,
      rule: "Für den ausgewählten heutigen Tag gelten Meals mit Uhrzeit vor oder gleich aktueller Uhrzeit als bereits gegessen; spätere Uhrzeiten sind geplant. Vergangene Tage gelten als gegessen, zukünftige Tage als geplant.",
      eatenMeals: timedNutritionLogsToday.eatenMeals.map(summarizeMealLogForCoach),
      plannedMeals: timedNutritionLogsToday.plannedMeals.map(summarizeMealLogForCoach),
      meals: timedNutritionLogsToday.allMeals.map((log) => ({
        time: log.time,
        name: log.name,
        consumptionStatus: log.consumptionStatus,
        source: log.source,
        confidence: log.confidence,
        manuallyConfirmed: log.manuallyConfirmed,
        calories: log.values.calories,
        proteinGrams: log.values.proteinGrams,
        carbohydrateGrams: log.values.carbohydrateGrams,
        fatGrams: log.values.fatGrams
      }))
    },
    nutritionToday: {
      target: todayMacroTarget,
      plannedBalance: todayMacroBalance,
      loggedBalance: loggedNutritionBalance,
      plannedLoggedBalance: plannedLoggedNutritionBalance
    },
    recentTraining: summarizeTrainingWindow(last14Days),
    recentWeightTrend: summarizeWeightTrend(source.profile),
    recentNutrition: summarizeNutritionWindow(last14Days, mealTemplates),
    externalActivities: summarizeExternalActivities(externalActivities, intent),
    athleteTrainingZones: summarizeTrainingZones(source.trainingZones ?? []),
    strava: summarizeStravaStatus(externalActivities, source.trainingZones ?? []),
    garmin: summarizeGarminContext(source.garminWellness),
    relevantStandards: summarizeRelevantStandards(source.standards, source.mealTemplates, intent),
    deepContext: intent.needsDeepContext
      ? createDeepContext(weekPlans, source.profile, mealTemplates)
      : null
  };
}

function summarizeGarminContext(garminWellness: unknown) {
  if (!garminWellness || typeof garminWellness !== "object") {
    return {
      status: "empty",
      note: "Keine normalisierten Garmin-Daten im Coach-Kontext."
    };
  }

  const normalized = garminWellness as Record<string, unknown>;
  const dailyHealth = asRecordArray(normalized.dailyHealth);
  const sleep = asRecordArray(normalized.sleep);
  const hrv = asRecordArray(normalized.hrv);
  const recovery = asRecordArray(normalized.recovery);
  const bodyMeasurements = asRecordArray(normalized.bodyMeasurements);

  return {
    ...normalized,
    recoverySnapshot: {
      latestDailyHealth: dailyHealth[0] ?? null,
      latestSleep: sleep[0] ?? null,
      latestHrv: hrv[0] ?? null,
      latestTrainingState: recovery[0] ?? null,
      latestBodyMeasurement: bodyMeasurements[0] ?? null,
      sevenDayTrends: {
        averageSleepHours: averageOf(sleep.slice(0, 7), "duration_seconds", 1 / 3600),
        averageSleepScore: averageOf(sleep.slice(0, 7), "sleep_score"),
        averageNightlyHrv: averageOf(hrv.slice(0, 7), "nightly_average"),
        averageRestingHeartRate: averageOf(dailyHealth.slice(0, 7), "resting_heart_rate"),
        averageStress: averageOf(dailyHealth.slice(0, 7), "average_stress"),
        averageBodyBatteryEnd: averageOf(dailyHealth.slice(0, 7), "body_battery_end")
      },
      availableSignals: [
        sleep.length > 0 ? "sleep" : null,
        hrv.length > 0 ? "hrv" : null,
        dailyHealth.length > 0 ? "daily_health_stress_body_battery_resting_hr" : null,
        recovery.length > 0 ? "training_readiness_recovery_training_load_status" : null,
        bodyMeasurements.length > 0 ? "weight_body_composition" : null
      ].filter(Boolean)
    },
    rule: "Garmin-Daten stammen aus normalisierten Supabase-Tabellen. Raw Garmin JSON wird dem Coach nicht direkt gegeben.",
    coachingUse: [
      "Nutze alle verfügbaren Signale: Schlafdauer/-phasen/-score, HRV inkl. Baseline/Status, Ruhepuls, Stress, Body Battery, SpO2, Atmung, Training Readiness, Recovery Time, Trainingsstatus, akute Last, Load Ratio/Focus, VO2max, Schwelle, FTP und Akklimatisierung.",
      "Bewerte Trends und mehrere Signale gemeinsam. Ein einzelner schlechter Wert reicht nicht für eine harte Trainingsabsage.",
      "Fehlende Garmin-Werte als unknown behandeln, nicht als 0.",
      "Wenn Garmin-Daten veraltet oder leer sind, Empfehlungen transparent als Schätzung formulieren."
    ]
  };
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function averageOf(rows: Record<string, unknown>[], key: string, multiplier = 1): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return null;
  return roundTo((values.reduce((sum, value) => sum + value, 0) / values.length) * multiplier, 0.1);
}

function summarizeExternalActivities(activities: CoachExternalActivitySummary[], intent: CoachIntent) {
  const relevant = activities
    .filter((activity) => intent.domain === "general" || mapsToIntentDomain(activity, intent.domain))
    .slice(0, intent.needsDeepContext ? 40 : 14);

  return {
    status: activities.length > 0 ? "available" : "empty",
    providers: Array.from(new Set(activities.map((activity) => activity.source_provider).filter(Boolean))),
    totalInContextWindow: activities.length,
    relevantActivities: relevant.map((activity) => ({
      provider: activity.source_provider,
      sourcePriority: activity.source_priority ?? "single_source",
      mergedSourceProviders: activity.merged_source_providers ?? [activity.source_provider].filter(Boolean),
      id: activity.source_activity_id,
      name: activity.name,
      sportType: activity.sport_type,
      startDate: activity.start_date,
      startDateLocal: activity.start_date_local,
      timezone: activity.timezone,
      distanceMeters: activity.distance_meters,
      movingTimeSeconds: activity.moving_time_seconds,
      elapsedTimeSeconds: activity.elapsed_time_seconds,
      elevationGainMeters: activity.elevation_gain_meters,
      calories: activity.calories,
      averageSpeedMps: activity.average_speed_mps,
      maxSpeedMps: activity.max_speed_mps,
      averagePaceSecondsPerKm: activity.average_pace_seconds_per_km,
      maxPaceSecondsPerKm: activity.max_pace_seconds_per_km,
      averageHeartrate: activity.average_heartrate,
      maxHeartrate: activity.max_heartrate,
      averageWatts: activity.average_watts,
      maxWatts: activity.max_watts,
      weightedAverageWatts: activity.weighted_average_watts,
      normalizedPower: activity.normalized_power,
      averageCadence: activity.average_cadence,
      maxCadence: activity.max_cadence,
      relativeEffort: activity.relative_effort,
      trainingLoad: activity.training_load,
      temperatureCelsius: activity.temperature_celsius,
      isIndoor: activity.is_indoor,
      isCommute: activity.is_commute,
      isPrivate: activity.is_private,
      isManual: activity.is_manual,
      deviceName: activity.device_name,
      gearName: activity.gear_name,
      zoneSummaries: summarizeActivityZoneSummaries(activity.zone_summaries ?? [])
    }))
  };
}

function summarizeTrainingZones(trainingZones: CoachTrainingZoneSummary[]) {
  return {
    status: trainingZones.length > 0 ? "available_from_supabase" : "empty",
    source: "server_side_context_builder",
    rule: "Persönliche Zonen sind Referenzen für geplante Intensitäten. Aktivitäts-Zonenverteilungen zeigen die tatsächliche Belastung erledigter Einheiten.",
    guidance: [
      "Nutze Herzfrequenz- oder Power-Zonen für die Einschätzung von locker, Grundlage, Schwelle und VO2max.",
      "Wenn Zonen fehlen, transparent als Schätzung anhand Pace, Puls, Relative Effort und Trainingsziel formulieren.",
      "Geplante Einheiten nicht als erledigt zählen; Zonen dienen bei geplanten Einheiten nur als Intensitätsziel."
    ],
    zones: trainingZones.map((zone) => ({
      provider: zone.sourceProvider,
      zoneType: zone.zoneType,
      sportType: zone.sportType,
      customZones: zone.customZones,
      importedAt: zone.importedAt,
      ranges: zone.zones.map((range, index) => ({
        zone: range.zone ?? index + 1,
        min: range.min ?? null,
        max: range.max ?? null
      }))
    }))
  };
}

function summarizeActivityZoneSummaries(zones: CoachActivityZoneSummary[]) {
  return zones.map((zone) => {
    const totalSeconds = zone.distribution.reduce((sum, bucket) => sum + (bucket.timeSeconds ?? 0), 0);
    const peakBucket = zone.distribution.reduce<CoachZoneDistributionBucket | null>((peak, bucket) => {
      if (!peak || (bucket.timeSeconds ?? 0) > (peak.timeSeconds ?? 0)) return bucket;
      return peak;
    }, null);

    return {
      zoneType: zone.zoneType,
      score: zone.score,
      sensorBased: zone.sensorBased,
      customZones: zone.customZones,
      points: zone.points,
      totalMinutesWithZoneData: Math.round(totalSeconds / 60),
      dominantZone: peakBucket ? {
        zone: peakBucket.zone ?? null,
        minutes: Math.round((peakBucket.timeSeconds ?? 0) / 60),
        min: peakBucket.min ?? null,
        max: peakBucket.max ?? null
      } : null,
      distribution: zone.distribution.map((bucket, index) => ({
        zone: bucket.zone ?? index + 1,
        minutes: Math.round((bucket.timeSeconds ?? 0) / 60),
        min: bucket.min ?? null,
        max: bucket.max ?? null
      }))
    };
  });
}

function summarizeStravaStatus(activities: CoachExternalActivitySummary[], trainingZones: CoachTrainingZoneSummary[]) {
  const stravaActivities = activities.filter((activity) => activity.source_provider === "strava");
  const stravaTrainingZones = trainingZones.filter((zone) => zone.sourceProvider === "strava");

  return {
    status: stravaActivities.length > 0 ? "available_from_supabase" : "not_available_in_context_window",
    trainingZonesStatus: stravaTrainingZones.length > 0 ? "available_from_supabase" : "empty_or_not_synced",
    activityZoneSummaryStatus: stravaActivities.some((activity) => (activity.zone_summaries?.length ?? 0) > 0) ? "available_from_supabase" : "empty_or_not_available",
    relevantActivities: stravaActivities.slice(0, 14),
    note: "Der Coach greift nicht auf Strava zu; Aktivitäten und Zonen wurden vorher in Supabase importiert und serverseitig zusammengefasst."
  };
}

function mapsToIntentDomain(activity: CoachExternalActivitySummary, domain: CoachIntent["domain"]): boolean {
  const sport = activity.sport_type?.toLowerCase() ?? "";

  if (domain === "training" || domain === "recovery") return true;
  if (domain === "fueling" || domain === "nutrition") return ["run", "ride", "swim", "workout", "hike"].some((part) => sport.includes(part));
  if (domain === "planning") return Boolean(activity.is_commute);

  return true;
}

function inferCoachContextIntent(message: string): CoachIntent {
  const lower = message.toLowerCase();
  const domain = inferDomain(lower);
  const mode = inferCoachContextMode(lower);
  const isRecommendation = lower.includes("empfehl") ||
    lower.includes("gib mir") ||
    lower.includes("tipps") ||
    lower.includes("was soll") ||
    lower.includes("was mache") ||
    lower.includes("wie soll") ||
    lower.includes("fueling");
  const isAdvice = lower.includes("soll ich") || lower.includes("?") || lower.includes("unsicher");
  const mentionsAlcohol = lower.includes("bier") || lower.includes("wein") || lower.includes("alkohol") || lower.includes("drink");
  const needsDeepContext = lower.includes("trend") ||
    lower.includes("muster") ||
    lower.includes("historie") ||
    lower.includes("letzte wochen") ||
    lower.includes("wettkampf") ||
    lower.includes("entwicklung") ||
    (domain === "training" && (isRecommendation || isAdvice)) ||
    (domain === "planning" && (isRecommendation || isAdvice));

  return {
    mode,
    type: isRecommendation ? "recommendation" : isAdvice ? "advice" : "info",
    domain,
    needsTomorrow: mentionsAlcohol || domain === "fueling" || domain === "nutrition",
    needsDeepContext,
  };
}

function applyPageContextToIntent(intent: CoachIntent, pageContext: CoachPageContext): CoachIntent {
  if (intent.domain !== "general") {
    return {
      ...intent,
      needsTomorrow: intent.needsTomorrow || pageContext === "today" || pageContext === "fueling",
      needsDeepContext: intent.needsDeepContext || pageContext === "insights"
    };
  }

  const domainByPage: Partial<Record<CoachPageContext, CoachIntent["domain"]>> = {
    today: "general",
    fueling: "fueling",
    training: "training",
    planning: "planning",
    insights: "general",
    settings: "general",
    coach: "general"
  };

  return {
    ...intent,
    domain: domainByPage[pageContext] ?? intent.domain,
    needsTomorrow: intent.needsTomorrow || pageContext === "today" || pageContext === "fueling",
    needsDeepContext: intent.needsDeepContext || pageContext === "insights"
  };
}

function describePageContextWeighting(pageContext: CoachPageContext): string {
  const descriptions: Record<CoachPageContext, string> = {
    today: "Tagescoach: wichtigste Entscheidung, heutiger Plan, Fueling-Lücke, Aktivitäten und Morgenblick priorisieren.",
    fueling: "Ernährungscoach: geloggte Mahlzeiten, Makros, Timing, Standards, Rezepte und alltagstaugliche Schätzungen priorisieren.",
    training: "Lauf-/Trainingscoach: Wettkampfziel, Belastung, Intensität, Regeneration und Strava-Aktivitäten priorisieren.",
    planning: "Planungscoach: Wochenstruktur, Alltag, Familie, Arbeit, Reise, Regeneration und Verschiebungsoptionen priorisieren.",
    insights: "Analyst: Plan-vs-Ist, wiederkehrende Muster, Abweichungen und nächste Lernpunkte priorisieren.",
    settings: "Datenqualitätscoach: fehlende Profil-, Ziel-, Familien-, Job- und Gesundheitsdaten priorisieren.",
    coach: "Gesamtcoach: ausgewogene Beratung über Training, Fueling, Alltag, Ziele und Regeneration."
  };

  return descriptions[pageContext];
}

function inferCoachContextMode(lower: string): CoachIntent["mode"] {
  const confirmationPattern = /^(ja|jep|yes|ok|okay|passt|genau|klingt gut|übernehmen|uebernehmen|speichern|eintragen|mach das|so machen|nimm variante [abc])[\s.!]*$/;
  const asksForAdvice = lower.includes("was empfiehlst du") ||
    lower.includes("was würdest du") ||
    lower.includes("was wuerdest du") ||
    lower.includes("soll ich") ||
    lower.includes("macht es sinn") ||
    lower.includes("alternativen") ||
    (lower.includes("variante") && lower.includes("?"));
  const explicitPlanning = lower.includes("erstelle mir") ||
    lower.includes("erstell mir") ||
    lower.includes("plane meine woche") ||
    lower.includes("plan meine woche") ||
    lower.includes("mach daraus") ||
    lower.includes("trainingsplan erstellen") ||
    lower.includes("wochenplan erstellen") ||
    lower.includes("konkrete einheiten") ||
    lower.includes("konkreten plan") ||
    lower.includes("verschieb") ||
    lower.includes("verlege") ||
    lower.includes("füge") ||
    lower.includes("fuege") ||
    lower.includes("in den plan");

  if (confirmationPattern.test(lower) || lower.includes("übernimm den vorschlag") || lower.includes("uebernimm den vorschlag")) return "change";
  if (explicitPlanning && !asksForAdvice) return "planning";

  return "coach";
}

function inferDomain(lower: string): CoachIntent["domain"] {
  if (lower.includes("fuel") || lower.includes("banane") || lower.includes("snack") || lower.includes("trinken")) return "fueling";
  if (lower.includes("essen") || lower.includes("gegessen") || lower.includes("mahlzeit") || lower.includes("abend")) return "nutrition";
  if (lower.includes("lauf") || lower.includes("training") || lower.includes("freeletics") || lower.includes("hiit")) return "training";
  if (lower.includes("müde") || lower.includes("muede") || lower.includes("erholung") || lower.includes("schlaf")) return "recovery";
  if (lower.includes("büro") || lower.includes("office") || lower.includes("urlaub") || lower.includes("frei") || lower.includes("reise")) return "planning";

  return "general";
}

function normalizeWeekPlans(source: CoachContextSource): WeekPlan[] {
  const weekPlans = source.weekPlans?.length ? source.weekPlans : [source.weekPlan];
  const hasActiveWeek = weekPlans.some((week) => week.startsOn === source.weekPlan.startsOn);

  return (hasActiveWeek ? weekPlans : [...weekPlans, source.weekPlan])
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn));
}

function flattenDays(weekPlans: WeekPlan[]): DayPlan[] {
  return weekPlans
    .flatMap((week) => week.days)
    .sort((left, right) => left.date.localeCompare(right.date));
}

function findDay(days: DayPlan[], date: string): DayPlan | undefined {
  return days.find((day) => day.date === date);
}

function getRelativeDay(days: DayPlan[], date: string, offset: number): DayPlan | undefined {
  const index = days.findIndex((day) => day.date === date);

  return index >= 0 ? days[index + offset] : undefined;
}

function getLookbackDays(days: DayPlan[], selectedDate: string, count: number): DayPlan[] {
  const previousAndToday = days.filter((day) => day.date <= selectedDate);

  return previousAndToday.slice(-count);
}

function summarizeDay(day: DayPlan, mealTemplates: MealTemplate[], actualActivities: CoachExternalActivitySummary[] = []) {
  return {
    date: day.date,
    context: day.context,
    focus: day.focus,
    note: day.note,
    blocks: day.blocks.map((block) => ({
      type: block.type,
      label: block.label,
      impact: block.impact
    })),
    workouts: summarizeWorkouts(day.workouts),
    actualActivities: summarizeActualActivities(actualActivities),
    trainingEvaluationBasis: actualActivities.length > 0
      ? "Für diesen Tag zuerst erledigte externe Aktivitäten bewerten; geplante Workouts sind nur Referenz."
      : "Für diesen Tag liegen noch keine erledigten externen Aktivitäten im Kontext vor; geplante Workouts sind nur Planung.",
    meals: hydrateMeals(day.mealPlan, mealTemplates)
  };
}

function summarizeWeek(
  weekPlan: WeekPlan,
  mealTemplates: MealTemplate[],
  externalActivities: CoachExternalActivitySummary[] = [],
  selectedDate: string = weekPlan.days[0]?.date ?? weekPlan.startsOn
) {
  const workouts = weekPlan.days.flatMap((day) => day.workouts).filter((workout) => workout.status !== "cancelled");
  const trainingReality = summarizeWeeklyTrainingReality(weekPlan, externalActivities, selectedDate);

  return {
    label: weekPlan.label,
    startsOn: weekPlan.startsOn,
    templateName: weekPlan.templateName,
    days: weekPlan.days.map((day) => ({
      date: day.date,
      context: day.context,
      focus: day.focus,
      workoutCount: day.workouts.length,
      mealCount: day.mealPlan.length
    })),
    totals: {
      workoutCount: workouts.length,
      runningKm: sumRunningKm(workouts),
      hardSessions: workouts.filter((workout) => workout.intensity === "hard").length,
      plannedMeals: weekPlan.days.reduce((sum, day) => sum + day.mealPlan.length, 0),
      estimatedCalories: sumMeals(weekPlan.days.flatMap((day) => hydrateMeals(day.mealPlan, mealTemplates))).calories
    },
    trainingReality
  };
}

function summarizeWeeklyTrainingReality(
  weekPlan: WeekPlan,
  externalActivities: CoachExternalActivitySummary[],
  selectedDate: string
) {
  const weekDates = weekPlan.days.map((day) => day.date).sort();
  const weekStart = weekDates[0] ?? weekPlan.startsOn;
  const weekEnd = weekDates[weekDates.length - 1] ?? weekStart;
  const actualActivities = externalActivities
    .filter((activity) => {
      const date = getActivityDateKey(activity);
      return date >= weekStart && date <= weekEnd && date <= selectedDate;
    })
    .sort((left, right) => getActivityDateKey(left).localeCompare(getActivityDateKey(right)));
  const actualActivityDates = new Set(actualActivities.map(getActivityDateKey));
  const completedManualWorkouts = weekPlan.days
    .flatMap((day) => day.workouts)
    .filter((workout) => workout.status !== "cancelled")
    .filter((workout) => workout.status === "completed")
    .filter((workout) => workout.date <= selectedDate)
    .filter((workout) => !actualActivityDates.has(workout.date));
  const futurePlannedWorkouts = weekPlan.days
    .flatMap((day) => day.workouts)
    .filter((workout) => workout.status !== "cancelled")
    .filter((workout) => workout.status !== "completed")
    .filter((workout) => workout.date > selectedDate || (workout.date === selectedDate && !actualActivityDates.has(workout.date)));
  const pastPlannedWorkoutsNotCounted = weekPlan.days
    .flatMap((day) => day.workouts)
    .filter((workout) => workout.status !== "cancelled")
    .filter((workout) => workout.status !== "completed")
    .filter((workout) => workout.date < selectedDate || (workout.date === selectedDate && actualActivityDates.has(workout.date)));
  const actualRunningActivities = actualActivities.filter(isRunningActivity);
  const completedManualRunningWorkouts = completedManualWorkouts.filter((workout) => workout.sport === "running");
  const futureRunningWorkouts = futurePlannedWorkouts.filter((workout) => workout.sport === "running");
  const actualStrengthLikeActivities = actualActivities.filter(isStrengthLikeActivity);
  const completedManualStrengthLikeWorkouts = completedManualWorkouts.filter(isStrengthLikeWorkout);
  const futureStrengthLikeWorkouts = futurePlannedWorkouts.filter(isStrengthLikeWorkout);
  const actualRunningKm = roundTo(sumActivityDistanceKm(actualRunningActivities) + sumRunningKm(completedManualRunningWorkouts), 0.1);
  const futurePlannedRunningKm = sumRunningKm(futureRunningWorkouts);

  return {
    weekStart,
    weekEnd,
    selectedDate,
    rule: "Für vergangene und ausgewählte Tage zählen erledigte externe Aktivitäten aus Supabase. Für zukünftige Tage zählen geplante Workouts. Vergangene geplante Workouts werden nicht als erledigt gewertet.",
    actualCompletedThisWeek: {
      activityCount: actualActivities.length,
      manualWorkoutCount: completedManualWorkouts.length,
      runningActivityCount: actualRunningActivities.length,
      manualRunningWorkoutCount: completedManualRunningWorkouts.length,
      strengthLikeActivityCount: actualStrengthLikeActivities.length,
      manualStrengthLikeWorkoutCount: completedManualStrengthLikeWorkouts.length,
      runningKm: actualRunningKm,
      totalCalories: roundTo(actualActivities.reduce((sum, activity) => sum + (activity.calories ?? 0), 0), 1),
      bySport: countBy([
        ...actualActivities.map((activity) => normalizeActivitySport(activity)),
        ...completedManualWorkouts.map((workout) => workout.sport)
      ]),
      activities: summarizeActualActivities(actualActivities),
      manuallyCompletedWorkouts: summarizeWorkouts(completedManualWorkouts)
    },
    futurePlannedThisWeek: {
      rule: "Enthält zukünftige geplante Einheiten plus die offene geplante Einheit am ausgewählten Tag, solange an diesem Tag noch keine externe Aktivität als erledigt vorliegt.",
      workoutCount: futurePlannedWorkouts.length,
      runningWorkoutCount: futureRunningWorkouts.length,
      runningKm: futurePlannedRunningKm,
      hardRunCount: futureRunningWorkouts.filter(isHardRunningWorkout).length,
      strengthLikeWorkoutCount: futureStrengthLikeWorkouts.length,
      hiitWorkoutCount: futureStrengthLikeWorkouts.filter((workout) => workout.sport === "hiit").length,
      strengthLikeWorkouts: summarizeWorkouts(futureStrengthLikeWorkouts),
      workouts: summarizeWorkouts(futurePlannedWorkouts)
    },
    projectedWeek: {
      runningSessionCount: actualRunningActivities.length + completedManualRunningWorkouts.length + futureRunningWorkouts.length,
      runningKm: roundTo(actualRunningKm + futurePlannedRunningKm, 0.1),
      longestRunKm: roundTo(Math.max(
        0,
        ...actualRunningActivities.map(activityDistanceKm),
        ...completedManualRunningWorkouts.map((workout) => workout.distanceKm ?? 0),
        ...futureRunningWorkouts.map((workout) => workout.distanceKm ?? 0)
      ), 0.1),
      hardRunCount: actualRunningActivities.filter(isHardActualActivity).length + completedManualRunningWorkouts.filter(isHardRunningWorkout).length + futureRunningWorkouts.filter(isHardRunningWorkout).length,
      strengthLikeWorkoutCount: actualStrengthLikeActivities.length + completedManualStrengthLikeWorkouts.length + futureStrengthLikeWorkouts.length,
      hiitWorkoutCount: actualStrengthLikeActivities.filter(isHiitActivity).length + completedManualStrengthLikeWorkouts.filter((workout) => workout.sport === "hiit").length + futureStrengthLikeWorkouts.filter((workout) => workout.sport === "hiit").length,
      totalTrainingCount: actualActivities.length + completedManualWorkouts.length + futurePlannedWorkouts.length,
      bySport: countBy([
        ...actualActivities.map((activity) => normalizeActivitySport(activity)),
        ...completedManualWorkouts.map((workout) => workout.sport),
        ...futurePlannedWorkouts.map((workout) => workout.sport)
      ]),
      interpretationRule: "HIIT zählt als zusätzliche Kraft-/Metabolikbelastung und nicht als Laufintervall oder harte Laufeinheit."
    },
    plannedPastNotCountedAsDone: summarizeWorkouts(pastPlannedWorkoutsNotCounted)
  };
}

function createAcuteTrainingLoad(
  allDays: DayPlan[],
  externalActivities: CoachExternalActivitySummary[],
  selectedDate: string
) {
  const lookbackStart = addIsoDays(selectedDate, -6);
  const lookaheadEnd = addIsoDays(selectedDate, 6);
  const recentActivities = externalActivities
    .filter((activity) => {
      const date = getActivityDateKey(activity);
      return date >= lookbackStart && date <= selectedDate;
    })
    .sort((left, right) => getActivityDateKey(left).localeCompare(getActivityDateKey(right)));
  const recentRunningActivities = recentActivities.filter(isRunningActivity);
  const actualActivityDates = new Set(recentActivities.map(getActivityDateKey));
  const completedManualWorkouts = allDays
    .flatMap((day) => day.workouts)
    .filter((workout) => workout.status === "completed")
    .filter((workout) => workout.date >= lookbackStart && workout.date <= selectedDate)
    .filter((workout) => !actualActivityDates.has(workout.date));
  const completedManualRunningWorkouts = completedManualWorkouts.filter((workout) => workout.sport === "running");
  const completedManualStrengthLikeWorkouts = completedManualWorkouts.filter(isStrengthLikeWorkout);
  const upcomingPlannedWorkouts = allDays
    .flatMap((day) => day.workouts)
    .filter((workout) => workout.status !== "cancelled")
    .filter((workout) => workout.status !== "completed")
    .filter((workout) => workout.date >= selectedDate && workout.date <= lookaheadEnd)
    .filter((workout) => workout.date !== selectedDate || !actualActivityDates.has(workout.date));
  const upcomingRunningWorkouts = upcomingPlannedWorkouts.filter((workout) => workout.sport === "running");
  const upcomingStrengthLikeWorkouts = upcomingPlannedWorkouts.filter(isStrengthLikeWorkout);
  const recentStrengthLikeActivities = recentActivities.filter(isStrengthLikeActivity);
  const actualRunningKm = roundTo(sumActivityDistanceKm(recentRunningActivities) + sumRunningKm(completedManualRunningWorkouts), 0.1);
  const plannedRunningKm = sumRunningKm(upcomingRunningWorkouts);

  return {
    selectedDate,
    rule: "Primäre Coach-Bewertung für Trainingsfragen: akute Ist-Belastung der letzten 7 Tage plus offene geplante Einheiten ab ausgewähltem Tag und den nächsten 6 Tagen. Eine heute geplante Einheit zählt, solange sie nicht durch eine externe Aktivität am selben Tag ersetzt wurde.",
    last7DaysActual: {
      from: lookbackStart,
      to: selectedDate,
      activityCount: recentActivities.length,
      manualWorkoutCount: completedManualWorkouts.length,
      runningSessionCount: recentRunningActivities.length + completedManualRunningWorkouts.length,
      runningKm: actualRunningKm,
      strengthLikeWorkoutCount: recentStrengthLikeActivities.length + completedManualStrengthLikeWorkouts.length,
      hiitWorkoutCount: recentStrengthLikeActivities.filter(isHiitActivity).length + completedManualStrengthLikeWorkouts.filter((workout) => workout.sport === "hiit").length,
      totalCalories: roundTo(recentActivities.reduce((sum, activity) => sum + (activity.calories ?? 0), 0), 1),
      hardSignalCount: recentActivities.filter(isHardActualActivity).length + completedManualRunningWorkouts.filter(isHardRunningWorkout).length,
      hardRunningSignalCount: recentRunningActivities.filter(isHardActualActivity).length + completedManualRunningWorkouts.filter(isHardRunningWorkout).length,
      bySport: countBy([
        ...recentActivities.map((activity) => normalizeActivitySport(activity)),
        ...completedManualWorkouts.map((workout) => workout.sport)
      ]),
      activities: summarizeActualActivities(recentActivities),
      manuallyCompletedWorkouts: summarizeWorkouts(completedManualWorkouts)
    },
    upcomingPlan: {
      from: selectedDate,
      to: lookaheadEnd,
      workoutCount: upcomingPlannedWorkouts.length,
      runningWorkoutCount: upcomingRunningWorkouts.length,
      runningKm: plannedRunningKm,
      hardRunCount: upcomingRunningWorkouts.filter(isHardRunningWorkout).length,
      strengthLikeWorkoutCount: upcomingStrengthLikeWorkouts.length,
      hiitWorkoutCount: upcomingStrengthLikeWorkouts.filter((workout) => workout.sport === "hiit").length,
      strengthLikeWorkouts: summarizeWorkouts(upcomingStrengthLikeWorkouts),
      workouts: summarizeWorkouts(upcomingPlannedWorkouts)
    },
    combinedLoad: {
      runningSessionCount: recentRunningActivities.length + completedManualRunningWorkouts.length + upcomingRunningWorkouts.length,
      runningKm: roundTo(actualRunningKm + plannedRunningKm, 0.1),
      longestRunKm: roundTo(Math.max(
        0,
        ...recentRunningActivities.map(activityDistanceKm),
        ...completedManualRunningWorkouts.map((workout) => workout.distanceKm ?? 0),
        ...upcomingRunningWorkouts.map((workout) => workout.distanceKm ?? 0)
      ), 0.1),
      hardRunCount: recentRunningActivities.filter(isHardActualActivity).length + completedManualRunningWorkouts.filter(isHardRunningWorkout).length + upcomingRunningWorkouts.filter(isHardRunningWorkout).length,
      strengthLikeWorkoutCount: recentStrengthLikeActivities.length + completedManualStrengthLikeWorkouts.length + upcomingStrengthLikeWorkouts.length,
      hiitWorkoutCount: recentStrengthLikeActivities.filter(isHiitActivity).length + completedManualStrengthLikeWorkouts.filter((workout) => workout.sport === "hiit").length + upcomingStrengthLikeWorkouts.filter((workout) => workout.sport === "hiit").length,
      interpretationRule: "HIIT zählt als zusätzliche Kraft-/Metabolikbelastung und nicht als Laufintervall oder harte Laufeinheit.",
      totalTrainingCount: recentActivities.length + completedManualWorkouts.length + upcomingPlannedWorkouts.length
    },
    coachGuidance: [
      "Nutze combinedLoad für Aussagen wie 'zu viel', 'zu wenig' oder 'im Rahmen'.",
      "Bewerte nicht nur die einzelne heutige Einheit isoliert.",
      "Zähle HIIT als zusätzliche Kraft-/Metabolikbelastung mit Regenerationskosten, aber nicht als Intervalltraining fürs Laufen.",
      "Wenn combinedLoad.runningKm im empfohlenen Rahmen liegt, warne nicht pauschal vor dem Lauf; bewerte stattdessen Intensität, Erholung und Fueling."
    ]
  };
}

function summarizeActualActivities(activities: CoachExternalActivitySummary[]) {
  return activities.map((activity) => ({
    provider: activity.source_provider,
    sourcePriority: activity.source_priority ?? "single_source",
    mergedSourceProviders: activity.merged_source_providers ?? [activity.source_provider].filter(Boolean),
    id: activity.source_activity_id,
    name: activity.name,
    description: activity.description,
    sportType: activity.sport_type,
    workoutType: activity.workout_type,
    date: getActivityDateKey(activity),
    startDate: activity.start_date,
    startDateLocal: activity.start_date_local,
    timezone: activity.timezone,
    distanceKm: roundTo(activityDistanceKm(activity), 0.1),
    movingTimeMinutes: activity.moving_time_seconds ? Math.round(activity.moving_time_seconds / 60) : null,
    elapsedTimeMinutes: activity.elapsed_time_seconds ? Math.round(activity.elapsed_time_seconds / 60) : null,
    elevationGainMeters: activity.elevation_gain_meters,
    calories: activity.calories,
    averagePacePerKm: formatPace(activity.average_pace_seconds_per_km ?? null),
    maxPacePerKm: formatPace(activity.max_pace_seconds_per_km ?? null),
    averageSpeedKmh: activity.average_speed_mps ? roundTo(activity.average_speed_mps * 3.6, 0.1) : null,
    maxSpeedKmh: activity.max_speed_mps ? roundTo(activity.max_speed_mps * 3.6, 0.1) : null,
    averageHeartrate: activity.average_heartrate,
    maxHeartrate: activity.max_heartrate,
    averageWatts: activity.average_watts,
    maxWatts: activity.max_watts,
    weightedAverageWatts: activity.weighted_average_watts,
    normalizedPower: activity.normalized_power,
    averageCadence: activity.average_cadence,
    maxCadence: activity.max_cadence,
    relativeEffort: activity.relative_effort,
    trainingLoad: activity.training_load,
    temperatureCelsius: activity.temperature_celsius,
    deviceName: activity.device_name,
    gearId: activity.gear_id,
    gearName: activity.gear_name,
    flags: {
      indoor: activity.is_indoor,
      commute: activity.is_commute,
      private: activity.is_private,
      manual: activity.is_manual
    },
    zoneSummaries: summarizeActivityZoneSummaries(activity.zone_summaries ?? [])
  }));
}

function createRaceReadinessAssessment(
  weekPlan: WeekPlan,
  profile: UserProfile,
  goals: UserGoals,
  externalActivities: CoachExternalActivitySummary[],
  selectedDate: string
) {
  const raceGoal = profile.raceGoal ?? goals.raceGoal ?? null;
  const weeklyReality = summarizeWeeklyTrainingReality(weekPlan, externalActivities, selectedDate);
  const plannedWorkouts = weekPlan.days.flatMap((day) => day.workouts).filter((workout) => workout.status !== "cancelled");
  const plannedRunningWorkouts = plannedWorkouts.filter((workout) => workout.sport === "running");
  const plannedStrengthLikeWorkouts = plannedWorkouts.filter(isStrengthLikeWorkout);
  const plannedRunningKm = sumRunningKm(plannedRunningWorkouts);
  const plannedLongRunKm = roundTo(Math.max(0, ...plannedRunningWorkouts.map((workout) => workout.distanceKm ?? 0)), 0.1);
  const plannedHardRuns = plannedRunningWorkouts.filter(isHardRunningWorkout).length;
  const projectedRunningSessions = weeklyReality.projectedWeek.runningSessionCount;
  const projectedRunningKm = weeklyReality.projectedWeek.runningKm;
  const projectedLongRunKm = weeklyReality.projectedWeek.longestRunKm;
  const projectedHardRuns = weeklyReality.projectedWeek.hardRunCount;
  const last14Days = summarizeExternalRunningWindow(externalActivities, selectedDate, 14);
  const last28Days = summarizeExternalRunningWindow(externalActivities, selectedDate, 28);
  const last56Days = summarizeExternalRunningWindow(externalActivities, selectedDate, 56);
  const raceDemand = raceGoal ? createRaceDemand(raceGoal.distanceKm, daysBetween(selectedDate, raceGoal.date)) : null;
  const flags: string[] = [];

  if (raceDemand) {
    if (projectedRunningSessions < raceDemand.minWeeklyRuns) {
      flags.push(`Projizierte Laufanzahl ist niedrig: ${projectedRunningSessions} Läufe statt mindestens ${raceDemand.minWeeklyRuns}.`);
    }

    if (projectedRunningKm < raceDemand.recommendedWeeklyKm.min) {
      flags.push(`Projizierter Laufumfang ist wahrscheinlich zu gering: ${projectedRunningKm} km statt grob ${raceDemand.recommendedWeeklyKm.min}-${raceDemand.recommendedWeeklyKm.max} km.`);
    }

    if (projectedLongRunKm < raceDemand.minLongRunKm) {
      flags.push(`Langer Lauf fehlt oder ist kurz: längster Lauf ${projectedLongRunKm} km, sinnvoll wären aktuell mindestens ca. ${raceDemand.minLongRunKm} km.`);
    }

    if (projectedHardRuns > raceDemand.maxHardRuns) {
      flags.push(`Zu viele harte Laufeinheiten für eine stabile Woche: ${projectedHardRuns} hart statt maximal ${raceDemand.maxHardRuns}.`);
    }

    if (last28Days.runningKm > 0 && projectedRunningKm > last28Days.averageWeeklyRunningKm * 1.25) {
      flags.push("Der projizierte Umfang liegt deutlich über dem letzten 28-Tage-Schnitt. Progression vorsichtig dosieren.");
    }
  }

  return {
    status: raceGoal ? "available" : "no_race_goal",
    raceGoal: raceGoal ? {
      ...raceGoal,
      daysUntilRace: daysBetween(selectedDate, raceGoal.date),
      targetPacePerKm: formatPace(parseRaceTargetPaceSeconds(raceGoal.targetTime, raceGoal.distanceKm))
    } : null,
    currentPlanningWeek: {
      startsOn: weekPlan.startsOn,
      evaluationBasis: "Ist + Zukunft: erledigte externe Aktivitäten bis zum ausgewählten Tag plus zukünftige geplante Workouts.",
      runningWorkoutCount: plannedRunningWorkouts.length,
      runningKm: plannedRunningKm,
      longestRunKm: plannedLongRunKm,
      hardRunCount: plannedHardRuns,
      qualityRunCount: plannedRunningWorkouts.filter((workout) => workout.runningType === "tempo_run" || workout.runningType === "intervals" || workout.runningType === "fartlek").length,
      strengthLikeWorkoutCount: plannedStrengthLikeWorkouts.length,
      hiitWorkoutCount: plannedStrengthLikeWorkouts.filter((workout) => workout.sport === "hiit").length,
      nonRunningWorkoutCount: plannedWorkouts.length - plannedRunningWorkouts.length,
      runningSessions: summarizeWorkouts(plannedRunningWorkouts),
      additionalStrengthLoad: summarizeWorkouts(plannedStrengthLikeWorkouts),
      interpretationRule: "HIIT ist zusätzliche Kraft-/Metabolikbelastung. Es zählt nicht als Laufintervall, VO2max-Lauf oder harte Laufeinheit."
    },
    projectedTrainingWeek: weeklyReality,
    recentActualRunning: {
      last14Days,
      last28Days,
      last56Days,
      source: externalActivities.length > 0 ? "external_activities_from_supabase" : "no_external_activity_data"
    },
    recommendedFrame: raceDemand,
    riskLevel: raceDemand && flags.length >= 2 ? "high" : raceDemand && flags.length === 1 ? "medium" : raceDemand ? "low" : "unknown",
    flags,
    assessment: raceGoal
      ? flags.length > 0
        ? "Die aktuelle Laufwoche passt noch nicht sauber zum Wettkampfziel. Der Coach soll das in Empfehlungen aktiv und ehrlich ansprechen."
        : "Die aktuelle Laufwoche wirkt grob passend zum Wettkampfziel. Der Coach soll trotzdem Belastung, Regeneration und Progression prüfen."
      : "Kein Wettkampfziel vorhanden. Empfehlungen sollten allgemeiner bleiben.",
    coachGuidance: [
      "Bei Trainings- oder Wochenempfehlungen immer das Wettkampfziel, die aktuelle Planungswoche und die letzten echten Aktivitäten gemeinsam bewerten.",
      "Für vergangene Tage zählen erledigte externe Aktivitäten. Nur zukünftige geplante Workouts ergänzen den Wochenumfang.",
      "Wenn Laufanzahl, Wochenkilometer oder langer Lauf unter dem empfohlenen Rahmen liegen, sprich das explizit an und schlage eine realistische Verbesserung vor.",
      "HIIT darf den Laufumfang oder die Anzahl harter Laufeinheiten nicht ersetzen. Bewerte es als zusätzliche Kraft-/Metaboliklast mit Einfluss auf Regeneration.",
      "Nicht nur bestätigen, was geplant ist. Als Coach ehrlich bewerten, ob der Plan zum Ziel passt.",
      "Planänderungen nur als Vorschlag formulieren, nicht automatisch speichern."
    ]
  };
}

function summarizeWorkouts(workouts: WorkoutPlan[]) {
  return workouts.map((workout) => ({
    id: workout.id,
    date: workout.date,
    sport: workout.sport,
    label: describeWorkoutType(workout),
    title: workout.title,
    startTime: workout.startTime,
    durationMinutes: workout.durationMinutes,
    distanceKm: workout.distanceKm,
    status: workout.status,
    intensity: workout.intensity,
    runningType: workout.runningType,
    runningFocus: workout.runningFocus,
    description: workout.description
  }));
}

function hydrateMeals(slots: MealPlanSlot[], mealTemplates: MealTemplate[]) {
  return slots.map((slot) => {
    const meal = mealTemplates.find((template) => template.id === slot.mealTemplateId);

    return {
      time: slot.time,
      role: slot.role,
      mealTemplateId: slot.mealTemplateId,
      name: meal?.name ?? "Flexible Mahlzeit",
      description: meal?.description ?? "Keine Vorlage gefunden.",
      calories: meal?.estimatedCalories ?? null,
      protein: meal?.estimatedProteinGrams ?? null,
      tags: meal?.tags ?? []
    };
  });
}

type TimedMealLog = MealLog & {
  consumptionStatus: "eaten" | "planned";
};

function categorizeNutritionLogsByCurrentTime(
  logs: MealLog[],
  selectedDate: string,
  coachNow: ReturnType<typeof createCoachNow>
): {
  eatenMeals: TimedMealLog[];
  plannedMeals: TimedMealLog[];
  allMeals: TimedMealLog[];
} {
  const allMeals = logs
    .map((log) => ({
      ...log,
      consumptionStatus: getMealConsumptionStatus(log, selectedDate, coachNow)
    }))
    .sort((left, right) => (left.time ?? "99:99").localeCompare(right.time ?? "99:99"));

  return {
    eatenMeals: allMeals.filter((log) => log.consumptionStatus === "eaten"),
    plannedMeals: allMeals.filter((log) => log.consumptionStatus === "planned"),
    allMeals
  };
}

function summarizeExternalRunningWindow(activities: CoachExternalActivitySummary[], selectedDate: string, days: number) {
  const selected = parseDateAtNoon(selectedDate);
  const since = new Date(selected);
  since.setDate(since.getDate() - days + 1);
  const runningActivities = activities
    .filter((activity) => isRunningActivity(activity))
    .filter((activity) => {
      const date = parseDateAtNoon(getActivityDateKey(activity));
      return date >= since && date <= selected;
    });
  const totalDistanceKm = roundTo(runningActivities.reduce((sum, activity) => sum + ((activity.distance_meters ?? 0) / 1000), 0), 0.1);
  const totalMovingSeconds = runningActivities.reduce((sum, activity) => sum + (activity.moving_time_seconds ?? 0), 0);
  const longestRunKm = roundTo(Math.max(0, ...runningActivities.map((activity) => (activity.distance_meters ?? 0) / 1000)), 0.1);
  const averageWeeklyRunningKm = roundTo(totalDistanceKm / Math.max(1, days / 7), 0.1);

  return {
    days,
    activityCount: runningActivities.length,
    runningKm: totalDistanceKm,
    averageWeeklyRunningKm,
    longestRunKm,
    totalMovingHours: roundTo(totalMovingSeconds / 3600, 0.1),
    averagePacePerKm: formatPace(totalDistanceKm > 0 && totalMovingSeconds > 0 ? totalMovingSeconds / totalDistanceKm : null),
    hardSignalCount: runningActivities.filter((activity) => (activity.relative_effort ?? 0) >= 60 || (activity.training_load ?? 0) >= 60).length,
    recentRuns: runningActivities.slice(0, 8).map((activity) => ({
      name: activity.name,
      date: getActivityDateKey(activity),
      distanceKm: roundTo((activity.distance_meters ?? 0) / 1000, 0.1),
      movingTimeMinutes: activity.moving_time_seconds ? Math.round(activity.moving_time_seconds / 60) : null,
      averagePacePerKm: formatPace(activity.average_pace_seconds_per_km ?? null),
      averageHeartrate: activity.average_heartrate,
      relativeEffort: activity.relative_effort
    }))
  };
}

function getActivitiesOnDate(activities: CoachExternalActivitySummary[], date: string): CoachExternalActivitySummary[] {
  return activities
    .filter((activity) => getActivityDateKey(activity) === date)
    .sort((left, right) => String(left.start_date_local ?? left.start_date ?? "").localeCompare(String(right.start_date_local ?? right.start_date ?? "")));
}

function getActivityDateKey(activity: CoachExternalActivitySummary): string {
  return String(activity.start_date_local ?? activity.start_date ?? "").slice(0, 10);
}

function activityDistanceKm(activity: CoachExternalActivitySummary): number {
  return (activity.distance_meters ?? 0) / 1000;
}

function sumActivityDistanceKm(activities: CoachExternalActivitySummary[]): number {
  return roundTo(activities.reduce((sum, activity) => sum + activityDistanceKm(activity), 0), 0.1);
}

function normalizeActivitySport(activity: CoachExternalActivitySummary): string {
  const sport = activity.sport_type?.toLowerCase() ?? "unknown";
  if (sport.includes("run") || sport.includes("lauf")) return "running";
  if (sport.includes("ride") || sport.includes("cycling") || sport.includes("bike")) return "cycling";
  if (sport.includes("swim")) return "swimming";
  if (sport.includes("hiit") || sport.includes("freeletics") || sport.includes("crossfit")) return "hiit";
  if (sport.includes("weight") || sport.includes("strength")) return "strength";
  return sport;
}

function createRaceDemand(distanceKm: number, daysUntilRace: number | null) {
  if (distanceKm >= 35) {
    return {
      raceType: "marathon_or_longer",
      minWeeklyRuns: 4,
      recommendedWeeklyKm: { min: 45, max: 70, unit: "km" },
      minLongRunKm: daysUntilRace != null && daysUntilRace < 56 ? 26 : 22,
      maxHardRuns: 2,
      note: "Marathonvorbereitung braucht stabilen Umfang, langen Lauf und kontrollierte Intensitäten."
    };
  }

  if (distanceKm >= 18) {
    return {
      raceType: "half_marathon",
      minWeeklyRuns: 3,
      recommendedWeeklyKm: { min: 35, max: 50, unit: "km" },
      minLongRunKm: daysUntilRace != null && daysUntilRace < 56 ? 16 : 14,
      maxHardRuns: 2,
      note: "Halbmarathonziel: 3 Läufe pro Woche, ein langer Lauf und eine gezielte Qualitätseinheit sind meist die Unterkante."
    };
  }

  if (distanceKm >= 9) {
    return {
      raceType: "ten_k",
      minWeeklyRuns: 3,
      recommendedWeeklyKm: { min: 25, max: 40, unit: "km" },
      minLongRunKm: 10,
      maxHardRuns: 2,
      note: "10-km-Ziel: regelmäßiger Umfang plus Schwelle/VO2max, aber mit genug lockeren Kilometern."
    };
  }

  return {
    raceType: "short_race",
    minWeeklyRuns: 2,
    recommendedWeeklyKm: { min: 18, max: 30, unit: "km" },
    minLongRunKm: Math.max(6, Math.round(distanceKm * 1.5)),
    maxHardRuns: 2,
    note: "Kurzes Rennen: Konsistenz und Qualität zählen, Umfang bleibt moderat."
  };
}

function isRunningActivity(activity: CoachExternalActivitySummary): boolean {
  const sport = activity.sport_type?.toLowerCase() ?? "";
  return sport.includes("run") || sport.includes("lauf");
}

function isHardActualActivity(activity: CoachExternalActivitySummary): boolean {
  return (activity.relative_effort ?? 0) >= 60
    || (activity.training_load ?? 0) >= 60
    || (activity.average_heartrate ?? 0) >= 155
    || (activity.average_watts ?? 0) >= 250;
}

function isHardRunningWorkout(workout: WorkoutPlan): boolean {
  return workout.sport === "running"
    && (workout.intensity === "hard" || workout.runningFocus === "threshold" || workout.runningFocus === "vo2max");
}

function isStrengthLikeWorkout(workout: WorkoutPlan): boolean {
  return workout.sport === "strength" || workout.sport === "hiit";
}

function isStrengthLikeActivity(activity: CoachExternalActivitySummary): boolean {
  const sport = normalizeActivitySport(activity);
  return sport === "strength" || sport === "hiit";
}

function isHiitActivity(activity: CoachExternalActivitySummary): boolean {
  return normalizeActivitySport(activity) === "hiit";
}

function parseRaceTargetPaceSeconds(targetTime: string, distanceKm: number): number | null {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;

  const parts = targetTime.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => !Number.isFinite(part))) return null;

  const totalSeconds = parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts.length === 2
      ? parts[0] * 60 + parts[1]
      : null;

  return totalSeconds ? totalSeconds / distanceKm : null;
}

function formatPace(secondsPerKm: number | null): string | null {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return null;

  const rounded = Math.round(secondsPerKm);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
}

function daysBetween(fromDate: string, toDate: string): number | null {
  const from = parseDateAtNoon(fromDate);
  const to = parseDateAtNoon(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function parseDateAtNoon(value: string | undefined): Date {
  return new Date(`${String(value ?? "").slice(0, 10)}T12:00:00.000Z`);
}

function addIsoDays(value: string, days: number): string {
  const date = parseDateAtNoon(value);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getMealConsumptionStatus(
  log: MealLog,
  selectedDate: string,
  coachNow: ReturnType<typeof createCoachNow>
): TimedMealLog["consumptionStatus"] {
  if (selectedDate < coachNow.date) return "eaten";
  if (selectedDate > coachNow.date) return "planned";

  const time = normalizeTimeLabel(log.time);
  if (!time) return "eaten";

  return time <= coachNow.time ? "eaten" : "planned";
}

function summarizeMealLogForCoach(log: TimedMealLog) {
  return {
    time: log.time,
    name: log.name,
    consumptionStatus: log.consumptionStatus,
    source: log.source,
    confidence: log.confidence,
    manuallyConfirmed: log.manuallyConfirmed,
    calories: log.values.calories,
    proteinGrams: log.values.proteinGrams,
    carbohydrateGrams: log.values.carbohydrateGrams,
    fatGrams: log.values.fatGrams
  };
}

function createCoachNow() {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
    timeZone: "Europe/Berlin"
  };
}

function normalizeTimeLabel(value: string | null | undefined): string | null {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function createMacroTarget(profile: UserProfile, goals: UserGoals, day: DayPlan) {
  const plannedWorkouts = day.workouts.filter((workout) => workout.status !== "cancelled");
  const runningKm = sumRunningKm(plannedWorkouts);
  const baseCalories = goals.weightStrategy === "reduce" ? { min: 2300, max: 2500 } : { min: 2500, max: 2750 };
  const trainingDelta = runningKm >= 14 ? 300 : runningKm >= 8 ? 150 : plannedWorkouts.length > 0 ? 100 : 0;

  return {
    calories: {
      min: baseCalories.min + trainingDelta,
      max: baseCalories.max + trainingDelta,
      unit: "kcal"
    },
    protein: {
      min: roundTo(profile.bodyMetrics.weightKg * 1.9, 5),
      max: roundTo(profile.bodyMetrics.weightKg * 2.15, 5),
      unit: "g"
    },
    carbohydrates: runningKm >= 14
      ? { min: 300, max: 380, unit: "g" }
      : runningKm >= 8
        ? { min: 250, max: 310, unit: "g" }
        : { min: 180, max: 240, unit: "g" },
    rationale: runningKm >= 8 ? "Trainingstag: Kohlenhydrate schützen." : "Ruhigerer Tag: Protein hoch, Carbs flexibel."
  };
}

function createMacroBalance(
  target: NonNullable<ReturnType<typeof createMacroTarget>>,
  meals: ReturnType<typeof hydrateMeals>
) {
  const totals = sumMeals(meals);

  return {
    plannedCalories: totals.calories,
    plannedProtein: totals.protein,
    remainingCaloriesApprox: {
      min: target.calories.min - totals.calories.max,
      max: target.calories.max - totals.calories.min,
      unit: "kcal"
    },
    remainingProteinApprox: {
      min: target.protein.min - totals.protein.max,
      max: target.protein.max - totals.protein.min,
      unit: "g"
    },
    note: "Grobe Bilanz aus geplanten Mahlzeiten; kein grammgenaues Tracking."
  };
}

function createLoggedNutritionBalance(
  target: NonNullable<ReturnType<typeof createMacroTarget>>,
  logs: MealLog[],
  note?: string
) {
  const totals = logs.reduce((sum, log) => ({
    calories: sum.calories + log.values.calories,
    protein: sum.protein + log.values.proteinGrams,
    carbs: sum.carbs + log.values.carbohydrateGrams,
    fat: sum.fat + (log.values.fatGrams ?? 0)
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  return {
    loggedCalories: totals.calories,
    loggedProteinGrams: totals.protein,
    loggedCarbohydrateGrams: totals.carbs,
    loggedFatGrams: totals.fat,
    remainingProteinGrams: Math.max(0, target.protein.min - totals.protein),
    remainingCarbohydrateGrams: Math.max(0, target.carbohydrates.min - totals.carbs),
    caloriesVsTargetMin: totals.calories - target.calories.min,
    caloriesVsTargetMax: totals.calories - target.calories.max,
    note: note ?? (logs.length > 0
      ? "Bilanz aus persistenten Supabase Meal Logs."
      : "Noch keine geloggten Mahlzeiten vorhanden.")
  };
}

function summarizeTrainingWindow(days: DayPlan[]) {
  const workouts = days.flatMap((day) => day.workouts).filter((workout) => workout.status !== "cancelled");

  return {
    rangeDays: days.length,
    workoutCount: workouts.length,
    runningKm: sumRunningKm(workouts),
    hardSessions: workouts.filter((workout) => workout.intensity === "hard").length,
    bySport: countBy(workouts.map((workout) => workout.sport)),
    recentWorkouts: summarizeWorkouts(workouts).slice(-10)
  };
}

function summarizeWeightTrend(profile: UserProfile) {
  return {
    status: "limited_data",
    currentWeightKg: profile.bodyMetrics.weightKg,
    targetWeightKg: profile.bodyMetrics.targetWeightKg,
    trend: "Nicht berechenbar, weil noch keine Gewichtshistorie modelliert ist."
  };
}

function summarizeNutritionWindow(days: DayPlan[], mealTemplates: MealTemplate[]) {
  const daily = days.map((day) => {
    const meals = hydrateMeals(day.mealPlan, mealTemplates);
    const totals = sumMeals(meals);

    return {
      date: day.date,
      mealCount: meals.length,
      calories: totals.calories,
      protein: totals.protein
    };
  });

  return {
    rangeDays: days.length,
    daily,
    averagePlannedCalories: averageRange(daily.map((day) => day.calories)),
    averagePlannedProtein: averageRange(daily.map((day) => day.protein)),
    note: "Zusammenfassung basiert auf geplanten Standardmahlzeiten, nicht auf vollständigem Food-Logging."
  };
}

function summarizeRelevantStandards(
  standards: AppStandards | undefined,
  mealTemplates: MealTemplate[] | undefined,
  intent: CoachIntent
) {
  return {
    planning: intent.domain === "planning" || intent.domain === "general"
      ? standards?.planning.slice(0, 8).map((standard) => ({
        name: standard.name,
        context: standard.context,
        extraInfos: standard.extraInfos.map((info) => info.label)
      })) ?? []
      : [],
    workouts: intent.domain === "training" || intent.domain === "general"
      ? standards?.workouts.slice(0, 8).map((workout) => ({
        name: workout.name,
        sport: workout.sport,
        title: workout.title,
        durationMinutes: workout.durationMinutes,
        distanceKm: workout.distanceKm,
        intensity: workout.intensity,
        runningType: workout.runningType,
        runningFocus: workout.runningFocus
      })) ?? []
      : [],
    meals: intent.domain === "fueling" || intent.domain === "nutrition" || intent.domain === "general"
      ? mealTemplates?.filter((meal) => meal.isStandard !== false).slice(0, 10).map((meal) => ({
        name: meal.name,
        description: meal.description,
        calories: meal.estimatedCalories,
        protein: meal.estimatedProteinGrams,
        tags: meal.tags
      })) ?? []
      : [],
    weeks: intent.needsDeepContext ? standards?.weeks.slice(0, 4).map((week) => ({
      name: week.name,
      description: week.description,
      days: week.days.length
    })) ?? [] : []
  };
}

function createDeepContext(weekPlans: WeekPlan[], profile: UserProfile, mealTemplates: MealTemplate[]) {
  return {
    previousWeeks: weekPlans.slice(-8).map((week) => summarizeWeek(week, mealTemplates)),
    raceTrend: profile.raceGoal ? {
      raceGoal: profile.raceGoal,
      note: "Wettkampftrend ist aktuell aus Planhistorie ableitbar, aber noch ohne echte Leistungsdaten."
    } : null,
    recurringPatterns: inferRecurringPatterns(weekPlans)
  };
}

function inferRecurringPatterns(weekPlans: WeekPlan[]) {
  const days = flattenDays(weekPlans);
  const contextCounts = countBy(days.flatMap((day) => day.context));
  const workoutSports = countBy(days.flatMap((day) => day.workouts.map((workout) => workout.sport)));

  return {
    frequentContexts: contextCounts,
    frequentSports: workoutSports,
    note: "Muster sind einfache Häufigkeiten aus vorhandenen Wochenplänen."
  };
}

function sumRunningKm(workouts: WorkoutPlan[]): number {
  return roundTo(workouts
    .filter((workout) => workout.sport === "running")
    .reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0), 0.1);
}

function sumMeals(meals: ReturnType<typeof hydrateMeals>) {
  return meals.reduce((sum, meal) => ({
    calories: {
      min: sum.calories.min + (meal.calories?.min ?? 0),
      max: sum.calories.max + (meal.calories?.max ?? 0),
      unit: "kcal"
    },
    protein: {
      min: sum.protein.min + (meal.protein?.min ?? 0),
      max: sum.protein.max + (meal.protein?.max ?? 0),
      unit: "g"
    }
  }), {
    calories: { min: 0, max: 0, unit: "kcal" },
    protein: { min: 0, max: 0, unit: "g" }
  });
}

function averageRange(ranges: Array<{ min: number; max: number; unit: string }>) {
  if (ranges.length === 0) return { min: 0, max: 0, unit: "" };

  return {
    min: Math.round(ranges.reduce((sum, range) => sum + range.min, 0) / ranges.length),
    max: Math.round(ranges.reduce((sum, range) => sum + range.max, 0) / ranges.length),
    unit: ranges[0].unit
  };
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => ({
    ...counts,
    [value]: (counts[value] ?? 0) + 1
  }), {});
}

function roundTo(value: number, precision: number): number {
  return Math.round(value / precision) * precision;
}
