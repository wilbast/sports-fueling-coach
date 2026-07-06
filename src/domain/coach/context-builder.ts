import type { UserGoals } from "@/domain/goals/types";
import type { MealLog } from "@/domain/nutrition/logs";
import type { MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import type { DayPlan, WeekPlan } from "@/domain/planning/types";
import type { UserProfile } from "@/domain/profile/types";
import type { AppStandards } from "@/domain/standards/types";
import { describeWorkoutType } from "@/domain/training/catalog";
import type { WorkoutPlan } from "@/domain/training/types";

export type CoachExternalActivitySummary = {
  source_provider?: string;
  source_activity_id?: string;
  name?: string;
  sport_type?: string;
  start_date?: string;
  distance_meters?: number | null;
  moving_time_seconds?: number | null;
  elapsed_time_seconds?: number | null;
  elevation_gain_meters?: number | null;
  calories?: number | null;
  average_speed_mps?: number | null;
  average_pace_seconds_per_km?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  average_watts?: number | null;
  weighted_average_watts?: number | null;
  relative_effort?: number | null;
  training_load?: number | null;
  is_indoor?: boolean | null;
  is_commute?: boolean | null;
  gear_name?: string | null;
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
    today: selectedDay ? summarizeDay(selectedDay, mealTemplates) : null,
    tomorrow: intent.needsTomorrow && tomorrow ? summarizeDay(tomorrow, mealTemplates) : null,
    currentWeek: summarizeWeek(source.weekPlan, mealTemplates),
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
    externalActivities: summarizeExternalActivities(source.externalActivities ?? [], intent),
    strava: summarizeStravaStatus(source.externalActivities ?? []),
    relevantStandards: summarizeRelevantStandards(source.standards, source.mealTemplates, intent),
    deepContext: intent.needsDeepContext
      ? createDeepContext(weekPlans, source.profile, mealTemplates)
      : null
  };
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
      id: activity.source_activity_id,
      name: activity.name,
      sportType: activity.sport_type,
      startDate: activity.start_date,
      distanceMeters: activity.distance_meters,
      movingTimeSeconds: activity.moving_time_seconds,
      calories: activity.calories,
      averagePaceSecondsPerKm: activity.average_pace_seconds_per_km,
      averageHeartrate: activity.average_heartrate,
      maxHeartrate: activity.max_heartrate,
      averageWatts: activity.average_watts,
      relativeEffort: activity.relative_effort,
      trainingLoad: activity.training_load,
      isIndoor: activity.is_indoor,
      isCommute: activity.is_commute,
      gearName: activity.gear_name
    }))
  };
}

function summarizeStravaStatus(activities: CoachExternalActivitySummary[]) {
  const stravaActivities = activities.filter((activity) => activity.source_provider === "strava");

  return {
    status: stravaActivities.length > 0 ? "available_from_supabase" : "not_available_in_context_window",
    relevantActivities: stravaActivities.slice(0, 14),
    note: "Der Coach greift nicht auf Strava zu; diese Aktivitäten wurden vorher in Supabase importiert und serverseitig zusammengefasst."
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
    lower.includes("entwicklung");

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

function summarizeDay(day: DayPlan, mealTemplates: MealTemplate[]) {
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
    meals: hydrateMeals(day.mealPlan, mealTemplates)
  };
}

function summarizeWeek(weekPlan: WeekPlan, mealTemplates: MealTemplate[]) {
  const workouts = weekPlan.days.flatMap((day) => day.workouts).filter((workout) => workout.status !== "cancelled");

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
    }
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
