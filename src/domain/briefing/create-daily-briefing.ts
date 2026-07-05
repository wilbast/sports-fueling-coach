import type { ActualActivityForBriefing, DailyBriefing, DailyBriefingInput } from "@/domain/briefing/types";
import type { MealPlanSlot, MealTemplate, NutritionMetric, NutritionTarget } from "@/domain/nutrition/types";
import { describeWorkoutType, intensityLabels } from "@/domain/training/catalog";
import type { WorkoutPlan } from "@/domain/training/types";

export function createDailyBriefing(input: DailyBriefingInput): DailyBriefing {
  const { profile, goals, dayPlan, mealTemplates, actualActivities = [] } = input;
  const plannedWorkouts = dayPlan.workouts.filter((workout) => workout.status !== "cancelled");
  const primaryWorkout = plannedWorkouts.find((workout) => workout.status === "planned") ?? plannedWorkouts[0];
  const manualForecastCalories = input.energySettings?.manualActivityForecastCaloriesByDate?.[dayPlan.date] ?? 0;
  const activitySummary = summarizeActualActivities(actualActivities, manualForecastCalories);
  const runningDistanceKm = plannedWorkouts
    .filter((workout) => workout.sport === "running" && workout.status !== "optional")
    .reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0) || activitySummary.runningDistanceKm;
  const optionalWorkouts = plannedWorkouts.filter((workout) => workout.status === "optional");
  const target = createNutritionTarget(
    profile.bodyMetrics.weightKg,
    runningDistanceKm,
    plannedWorkouts.length,
    goals.weightStrategy,
    activitySummary,
    input.energySettings?.baselineCaloriesWithoutActivity
  );
  const raceContext = createRaceContext(profile.raceGoal ?? goals.raceGoal, dayPlan.date);
  const workouts = plannedWorkouts.map((workout) => createWorkoutBriefing(workout, runningDistanceKm));
  const meals = createMealRecommendations(dayPlan.mealPlan, mealTemplates, runningDistanceKm, activitySummary);

  return {
    dateLabel: formatDate(dayPlan.date, profile.locale),
    greeting: `Guten Morgen, ${profile.firstName}`,
    focus: createFocusLabel(goals.weightStrategy, primaryWorkout, activitySummary),
    heroTitle: createHeroTitle(primaryWorkout, activitySummary),
    lead: createLead(primaryWorkout, runningDistanceKm, optionalWorkouts.length, activitySummary),
    readiness: createReadiness(runningDistanceKm, activitySummary),
    raceContext,
    nutritionTarget: target,
    metrics: createNutritionMetrics(target),
    workouts,
    meals,
    priorities: createPriorities(runningDistanceKm, optionalWorkouts.length, activitySummary),
    coachHint: createCoachHint(runningDistanceKm, goals.weightStrategy, profile.coachingStyle, raceContext, activitySummary),
    coachCards: createCoachCards(runningDistanceKm, activitySummary),
    source: "rule_based"
  };
}

type ActualActivitySummary = {
  count: number;
  calories: number;
  actualCalories: number;
  forecastCalories: number;
  runningDistanceKm: number;
  movingMinutes: number;
  averageHeartRate?: number;
  highIntensity: boolean;
  labels: string[];
};

function summarizeActualActivities(activities: ActualActivityForBriefing[], forecastCalories: number): ActualActivitySummary {
  const actualCalories = activities.reduce((sum, activity) => sum + estimateActivityCalories(activity), 0);
  const normalizedForecastCalories = Math.max(0, Math.round(forecastCalories));
  const effectiveCalories = activities.length > 0 ? actualCalories : normalizedForecastCalories;
  const runningDistanceKm = activities
    .filter((activity) => isRunningActivity(activity.sportType))
    .reduce((sum, activity) => sum + ((activity.distanceMeters ?? 0) / 1000), 0);
  const movingMinutes = activities.reduce((sum, activity) => sum + ((activity.movingTimeSeconds ?? activity.elapsedTimeSeconds ?? 0) / 60), 0);
  const heartRates = activities
    .map((activity) => activity.averageHeartrate)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageHeartRate = heartRates.length
    ? heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length
    : undefined;
  const effort = activities.reduce((max, activity) => Math.max(max, activity.relativeEffort ?? activity.trainingLoad ?? 0), 0);
  const highIntensity = effort >= 60 || (averageHeartRate ?? 0) >= 155 || runningDistanceKm >= 12 || effectiveCalories >= 750;

  return {
    count: activities.length,
    calories: Math.round(effectiveCalories),
    actualCalories: Math.round(actualCalories),
    forecastCalories: activities.length > 0 ? 0 : normalizedForecastCalories,
    runningDistanceKm,
    movingMinutes,
    averageHeartRate,
    highIntensity,
    labels: activities.map((activity) => activity.name).slice(0, 3)
  };
}

function createNutritionTarget(
  weightKg: number,
  runningDistanceKm: number,
  workoutCount: number,
  weightStrategy: string,
  actual: ActualActivitySummary,
  baselineCaloriesWithoutActivity?: number
): NutritionTarget {
  const baseCalories = createBaseCalorieTarget(weightStrategy, baselineCaloriesWithoutActivity);
  const trainingDelta = runningDistanceKm >= 14 ? 300 : runningDistanceKm >= 8 ? 150 : workoutCount > 0 ? 100 : 0;
  const actualRefuelDelta = actual.calories > 0 ? Math.round(actual.calories * (weightStrategy === "reduce" ? 0.65 : 0.85)) : 0;
  const calories = {
    min: baseCalories.min + trainingDelta + Math.round(actualRefuelDelta * 0.75),
    max: baseCalories.max + trainingDelta + actualRefuelDelta,
    unit: "kcal"
  };
  const proteinBonus = actual.calories > 0 ? 10 : 0;
  const protein = {
    min: roundTo(weightKg * 1.9 + proteinBonus, 5),
    max: roundTo(weightKg * 2.15 + proteinBonus, 5),
    unit: "g"
  };
  const carbohydrateBonus = actual.calories > 0 ? Math.round(Math.min(140, Math.max(40, actual.calories * 0.18))) : 0;
  const baseCarbohydrates = runningDistanceKm >= 14
    ? { min: 300, max: 380, unit: "g" }
    : runningDistanceKm >= 8
      ? { min: 250, max: 310, unit: "g" }
      : { min: 180, max: 240, unit: "g" };
  const carbohydrates = {
    min: baseCarbohydrates.min + carbohydrateBonus,
    max: baseCarbohydrates.max + carbohydrateBonus,
    unit: "g"
  };

  return {
    energyDemand: actual.highIntensity || runningDistanceKm >= 14 ? "hoch" : runningDistanceKm >= 8 || workoutCount > 0 || actual.calories > 0 ? "mittel" : "niedrig",
    calories,
    protein,
    carbohydrates,
    rationale: [
      "Gewicht reduzieren bleibt aktiv, aber nicht auf Kosten der Trainingsqualität.",
      "Protein bleibt hoch für Sättigung und Muskelerhalt.",
      actual.count > 0
        ? `Durchgeführte Aktivität berücksichtigt: ca. ${formatNumber(actual.calories)} kcal Verbrauch fließen in Fueling und Regeneration ein.`
        : actual.forecastCalories > 0
          ? `Manueller Aktivitäts-Forecast berücksichtigt: ca. ${formatNumber(actual.forecastCalories)} kcal Verbrauch sind eingeplant.`
          : runningDistanceKm >= 8
          ? "Kohlenhydrate werden rund um den Lauf priorisiert."
          : "Kohlenhydrate bleiben moderat, solange keine längere Ausdauereinheit geplant ist."
    ]
  };
}

function createBaseCalorieTarget(weightStrategy: string, baselineCaloriesWithoutActivity?: number): { min: number; max: number } {
  const baseline = typeof baselineCaloriesWithoutActivity === "number" && Number.isFinite(baselineCaloriesWithoutActivity) && baselineCaloriesWithoutActivity > 0
    ? Math.round(baselineCaloriesWithoutActivity)
    : undefined;

  if (!baseline) {
    return weightStrategy === "reduce" ? { min: 2300, max: 2500 } : { min: 2500, max: 2750 };
  }

  if (weightStrategy === "reduce") {
    return { min: Math.max(1600, baseline - 450), max: Math.max(1750, baseline - 250) };
  }

  if (weightStrategy === "gain") {
    return { min: baseline + 150, max: baseline + 350 };
  }

  return { min: baseline - 100, max: baseline + 100 };
}

function createNutritionMetrics(target: NutritionTarget): NutritionMetric[] {
  return [
    {
      label: "Kalorien",
      value: formatRange(target.calories),
      unit: target.calories.unit,
      note: "moderates Defizit ohne Trainingsloch",
      tone: "green"
    },
    {
      label: "Protein",
      value: formatRange(target.protein),
      unit: target.protein.unit,
      note: "hoch halten für Sättigung und Muskelerhalt",
      tone: "blue"
    },
    {
      label: "Kohlenhydrate",
      value: formatRange(target.carbohydrates),
      unit: target.carbohydrates.unit,
      note: "mehr rund um den Lauf einplanen",
      tone: "amber"
    }
  ];
}

function createWorkoutBriefing(workout: WorkoutPlan, runningDistanceKm: number) {
  return {
    sport: describeWorkoutType(workout),
    title: workout.title,
    time: workout.startTime ?? "nach Bedarf",
    detail: workout.description,
    intensity: intensityLabels[workout.intensity] ?? "Geplant",
    fueling: createWorkoutFueling(workout, runningDistanceKm)
  };
}

function createWorkoutFueling(workout: WorkoutPlan, runningDistanceKm: number): string {
  if (workout.status === "optional") {
    return "Nur machen, wenn Energie, Schlaf und Beine passen.";
  }

  if (workout.sport === "running" && runningDistanceKm >= 8) {
    return "Banane oder Toast 45 Minuten vorher, danach Protein und Kohlenhydrate sichern.";
  }

  if (workout.sport === "strength" || workout.sport === "hiit") {
    return "Protein in der nächsten Mahlzeit einplanen.";
  }

  return "Normal essen, Durst und Hunger ernst nehmen.";
}

function createMealRecommendations(
  slots: MealPlanSlot[],
  mealTemplates: MealTemplate[],
  runningDistanceKm: number,
  actual: ActualActivitySummary
) {
  const plannedMeals = slots.map((slot) => createMealRecommendation(slot, mealTemplates, runningDistanceKm, actual));

  if (actual.count === 0 && actual.forecastCalories === 0) return plannedMeals;

  const isForecast = actual.count === 0 && actual.forecastCalories > 0;

  const recoveryMeal = {
    time: isForecast ? "rund um die Belastung" : "innerhalb 90 min",
    name: isForecast ? "Fueling für geplante Belastung" : "Recovery-Mahlzeit nach Aktivität",
    detail: actual.highIntensity
      ? "Bowl aus Reis/Kartoffeln, Hähnchen/Tofu oder Ei, Gemüse und etwas Salz. Bei wenig Zeit: Skyr + Banane + Müsli."
      : "Proteinbasis plus moderate Carbs: z. B. Skyr mit Banane oder Omelett mit Brot.",
    macroHint: actual.highIntensity
      ? "30-45 g Protein, 70-110 g Kohlenhydrate, Flüssigkeit aktiv auffüllen"
      : "25-35 g Protein, 40-70 g Kohlenhydrate",
    reason: isForecast
      ? `Forecast ca. ${formatNumber(actual.forecastCalories)} kcal Aktivitätsverbrauch; Energie vorher und danach ruhiger verteilen.`
      : `Aktivität verbraucht ca. ${formatNumber(actual.calories)} kcal; Regeneration und nächste Einheit absichern.`
  };
  const dinner = {
    time: "Abend",
    name: actual.highIntensity ? "Regenerations-Abendessen" : "Leichtes Protein-Abendessen",
    detail: actual.highIntensity
      ? "Kartoffeln/Reis/Nudeln plus Protein und Gemüse. Fett eher moderat halten, damit Carbs und Protein im Vordergrund stehen."
      : "Gemüse, Proteinquelle und kleine Carb-Portion nach Hunger. Kein Crash-Defizit nach Training.",
    macroHint: actual.highIntensity ? "Carbs auffüllen, Protein sichern" : "Protein hoch, Carbs nach Hunger",
    reason: isForecast
      ? "Tagesabschluss an den erwarteten Aktivitätsverbrauch anpassen."
      : "Tagesabschluss an die tatsächlich absolvierte Einheit anpassen."
  };

  return [recoveryMeal, ...plannedMeals, dinner];
}

function createMealRecommendation(slot: MealPlanSlot, mealTemplates: MealTemplate[], runningDistanceKm: number, actual: ActualActivitySummary) {
  const template = mealTemplates.find((meal) => meal.id === slot.mealTemplateId);
  const name = template?.name ?? "Flexible Mahlzeit";
  const detail = template?.description ?? "Grob planen, nicht grammgenau tracken.";

  return {
    time: slot.time,
    name,
    detail,
    macroHint: createMacroHint(slot.role, runningDistanceKm, actual),
    reason: createMealReason(slot.role)
  };
}

function createMacroHint(role: MealPlanSlot["role"], runningDistanceKm: number, actual: ActualActivitySummary): string {
  if (actual.calories > 0 && (role === "post_workout" || role === "dinner")) {
    return actual.highIntensity ? "Protein sichern, Kohlenhydrate aktiv auffüllen" : "Protein sichern, Carbs moderat auffüllen";
  }

  if (role === "pre_workout") return "leicht verdauliche Kohlenhydrate";
  if (role === "post_workout" || role === "dinner") return "Kohlenhydrate auffüllen, Protein sichern";
  if (role === "lunch" && runningDistanceKm >= 8) return "solide Basis für den Lauf";
  return "Protein hoch, Kohlenhydrate moderat";
}

function createMealReason(role: MealPlanSlot["role"]): string {
  const reasons: Record<MealPlanSlot["role"], string> = {
    breakfast: "stabiler Start ohne komplizierte Entscheidung",
    lunch: "Energie für den Nachmittag sichern",
    pre_workout: "Training nicht nüchtern erzwingen",
    post_workout: "Regeneration aktiv unterstützen",
    dinner: "Tagesziel ruhig abschließen"
  };

  return reasons[role];
}

function createPriorities(runningDistanceKm: number, optionalWorkoutCount: number, actual: ActualActivitySummary): string[] {
  if (actual.count > 0) {
    return [
      `Verbrauchte Energie berücksichtigen: ca. ${formatNumber(actual.calories)} kcal aus Aktivität`,
      actual.highIntensity ? "Heute kein hartes Restdefizit erzwingen" : "Defizit ruhig halten, aber Recovery nicht wegkürzen",
      "Protein und Flüssigkeit in den nächsten Mahlzeiten aktiv sichern"
    ];
  }

  if (actual.forecastCalories > 0) {
    return [
      `Manueller Forecast: ca. ${formatNumber(actual.forecastCalories)} kcal Aktivitätsverbrauch einplanen`,
      actual.highIntensity ? "Heute nicht zu hart ins Defizit gehen" : "Defizit möglich halten, aber Fueling nicht wegkürzen",
      "Protein, Flüssigkeit und Carbs rund um die Belastung absichern"
    ];
  }

  const priorities = runningDistanceKm > 0
    ? [
      "Wasserflasche bis Mittag zweimal füllen",
      "Pre-Workout-Fueling passend zur Startzeit einplanen",
      "Proteinreiches Abendessen nach dem Lauf einplanen"
    ]
    : [
      "Training oder Ruhetag bewusst festlegen",
      "Eine einfache Proteinbasis für den Tag planen",
      "Alltagstermin eintragen, falls er Essen oder Training beeinflusst"
    ];

  if (optionalWorkoutCount > 0) {
    priorities.push("Optionale Einheit nur machen, wenn sie sich wirklich leicht anfühlt");
  }

  if (runningDistanceKm >= 10) {
    priorities.push("Lauf bewusst locker halten, nicht in Tempoarbeit kippen");
  }

  return priorities;
}

function createCoachHint(
  runningDistanceKm: number,
  weightStrategy: string,
  coachingStyle: string,
  raceContext: string | undefined,
  actual: ActualActivitySummary
): string {
  if (actual.count > 0) {
    const intro = actual.labels.length ? `${actual.labels.join(" + ")} ist erledigt.` : "Die Aktivität ist erledigt.";
    const heartRate = actual.averageHeartRate ? ` Ø Puls ${Math.round(actual.averageHeartRate)} bpm.` : "";
    const deficitHint = weightStrategy === "reduce"
      ? "Das Defizit bleibt möglich, aber heute nicht über das Weglassen der Recovery-Mahlzeit."
      : "Heute darf die Energie stärker Richtung Regeneration gehen.";

    return `${intro} Ca. ${formatNumber(actual.calories)} kcal Verbrauch, ${Math.round(actual.movingMinutes)} Minuten Belastung.${heartRate} ${deficitHint} Priorität: trinken, Protein sichern und Kohlenhydrate passend nachziehen.`;
  }

  if (actual.forecastCalories > 0) {
    const deficitHint = weightStrategy === "reduce"
      ? "Das Defizit bleibt möglich, aber bitte nicht über fehlendes Training-Fueling erzwingen."
      : "Heute darf die Energie stärker Richtung Belastung und Regeneration gehen.";

    return `Für heute sind ca. ${formatNumber(actual.forecastCalories)} kcal Aktivitätsverbrauch manuell eingeplant. ${deficitHint} Plane eine klare Proteinbasis, genug Flüssigkeit und Carbs passend vor oder nach der Belastung.`;
  }

  if (coachingStyle === "active" && runningDistanceKm >= 8 && weightStrategy === "reduce") {
    return `${raceContext ? `${raceContext}. ` : ""}Heute ist kein Tag für ein aggressives Defizit. Fueling rund um den Lauf schützt die Qualität der nächsten Trainingstage.`;
  }

  if (runningDistanceKm === 0) {
    return "Heute ist noch wenig geplant. Lege zuerst Training, Alltag und ein bis zwei Mahlzeiten grob fest, dann wird das Briefing hilfreicher.";
  }

  return "Heute ruhig planen: Training, Essen und Erholung sollen zusammenpassen.";
}

function createCoachCards(runningDistanceKm: number, actual: ActualActivitySummary) {
  if (actual.count > 0) {
    return [
      {
        title: "Aktivität verbucht",
        body: `${formatNumber(actual.calories)} kcal Verbrauch im Tagesrahmen berücksichtigt.`,
        tone: "amber" as const
      },
      {
        title: "Carbs nachziehen",
        body: actual.highIntensity ? "Nach intensiver oder längerer Einheit Carbs nicht wegkürzen." : "Carbs moderat auffüllen reicht.",
        tone: "neutral" as const
      },
      {
        title: "Protein sichern",
        body: "Recovery-Mahlzeit mit 25-45 g Protein einplanen.",
        tone: "green" as const
      }
    ];
  }

  if (actual.forecastCalories > 0) {
    return [
      {
        title: "Forecast aktiv",
        body: `${formatNumber(actual.forecastCalories)} kcal erwarteter Aktivitätsverbrauch sind im Tagesrahmen berücksichtigt.`,
        tone: "amber" as const
      },
      {
        title: "Fueling vorbereiten",
        body: actual.highIntensity ? "Carbs vor und nach der Belastung einplanen." : "Snack oder Carb-Portion nach Hunger reicht oft.",
        tone: "neutral" as const
      },
      {
        title: "Protein sichern",
        body: "25-45 g Protein in der nächsten Hauptmahlzeit einplanen.",
        tone: "green" as const
      }
    ];
  }

  if (runningDistanceKm === 0) {
    return [
      {
        title: "Tag strukturieren",
        body: "Plane zuerst Kontext, Training oder bewusst Erholung.",
        tone: "green" as const
      },
      {
        title: "Fueling grob halten",
        body: "Ein bis zwei Standardmahlzeiten reichen als Startpunkt.",
        tone: "neutral" as const
      },
      {
        title: "Coach wird besser",
        body: "Je mehr echte Planung drin ist, desto konkreter wird das Briefing.",
        tone: "blue" as const
      }
    ];
  }

  return [
    {
      title: "Kalorien bewusst",
      body: runningDistanceKm >= 8 ? "Defizit ja, aber nicht um den Lauf herum." : "Heute reicht ein ruhiger Rahmen.",
      tone: "amber" as const
    },
    {
      title: "Carbs platzieren",
      body: runningDistanceKm >= 8 ? "Vor und nach dem Training priorisieren." : "Über den Tag moderat verteilen.",
      tone: "neutral" as const
    },
    {
      title: "Leistung schützen",
      body: "Der lockere Lauf soll sich locker anfühlen.",
      tone: "green" as const
    }
  ];
}

function createFocusLabel(weightStrategy: string, primaryWorkout: WorkoutPlan | undefined, actual: ActualActivitySummary): string {
  if (actual.count > 0) {
    return "Aktivität erledigt, Recovery fuelen";
  }

  if (actual.forecastCalories > 0) {
    return "Forecast aktiv, Fueling vorbereiten";
  }

  const goal = weightStrategy === "reduce" ? "Leichtes Defizit" : "Energie stabil halten";
  const training = primaryWorkout?.sport === "running" ? "Lauf sauber fuelen" : "Training passend unterstützen";

  return `${goal}, ${training}`;
}

function createHeroTitle(primaryWorkout: WorkoutPlan | undefined, actual: ActualActivitySummary): string {
  if (actual.count > 0) {
    return "Einheit erledigt. Jetzt Fueling und Regeneration sauber nachziehen.";
  }

  if (actual.forecastCalories > 0) {
    return "Aktivitäts-Forecast gesetzt. Heute Fueling bewusst planen.";
  }

  if (!primaryWorkout) return "Ruhiger Tag, Ernährung sauber halten.";
  return `${primaryWorkout.title}, Fueling sauber halten.`;
}

function createLead(primaryWorkout: WorkoutPlan | undefined, runningDistanceKm: number, optionalWorkoutCount: number, actual: ActualActivitySummary): string {
  if (actual.count > 0) {
    return `Heute wurden ${actual.count} Aktivität${actual.count === 1 ? "" : "en"} importiert. Die Empfehlungen wurden an Verbrauch, Dauer und Intensität angepasst.`;
  }

  if (actual.forecastCalories > 0) {
    return `Für heute sind ca. ${formatNumber(actual.forecastCalories)} kcal Aktivitätsverbrauch eingeplant. Kalorien, Protein, Kohlenhydrate und Mahlzeiten wurden daran angepasst.`;
  }

  if (!primaryWorkout) {
    return "Heute steht kein hartes Training im Mittelpunkt. Nutze den Tag für stabile Ernährung und Erholung.";
  }

  const optionalHint = optionalWorkoutCount > 0 ? " Optionale Einheiten bleiben wirklich optional." : "";
  if (primaryWorkout.sport === "running" && runningDistanceKm >= 8) {
    return `Heute steht ${primaryWorkout.title} im Mittelpunkt. Iss tagsüber stabil und spare nicht an Kohlenhydraten rund um den Lauf.${optionalHint}`;
  }

  return `Heute steht ${primaryWorkout.title} im Plan. Ernährung und Erholung sollen die Einheit unterstützen.${optionalHint}`;
}

function createReadiness(runningDistanceKm: number, actual: ActualActivitySummary): string {
  if (actual.forecastCalories > 0) return "Fueling vorbereiten";
  if (actual.highIntensity) return "Recovery priorisieren";
  if (actual.count > 0) return "Belastung verarbeitet";

  return runningDistanceKm >= 14 ? "Belastung bewusst steuern" : "Normal belastbar";
}

function createRaceContext(raceGoal: DailyBriefingInput["profile"]["raceGoal"], date: string): string | undefined {
  if (!raceGoal) return undefined;

  const days = daysBetween(date, raceGoal.date);
  const roundedDistance = raceGoal.distanceKm.toLocaleString("de-DE", { maximumFractionDigits: 1 });

  if (days < 0) {
    return `${raceGoal.name} liegt hinter dir`;
  }

  return `${raceGoal.name} in ${days} Tagen: ${roundedDistance} km in ${raceGoal.targetTime}`;
}

function formatDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(`${date}T12:00:00`));
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function formatRange(range: { min: number; max: number }): string {
  return `${formatNumber(range.min)}-${formatNumber(range.max)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

function estimateActivityCalories(activity: ActualActivityForBriefing): number {
  if (typeof activity.calories === "number" && Number.isFinite(activity.calories) && activity.calories > 0) {
    return activity.calories;
  }

  const distanceKm = (activity.distanceMeters ?? 0) / 1000;
  if (isRunningActivity(activity.sportType) && distanceKm > 0) {
    return distanceKm * 75;
  }

  const minutes = (activity.movingTimeSeconds ?? activity.elapsedTimeSeconds ?? 0) / 60;
  if (minutes > 0) {
    return minutes * 8;
  }

  return 0;
}

function isRunningActivity(sportType: string): boolean {
  return sportType.toLowerCase().includes("run");
}
