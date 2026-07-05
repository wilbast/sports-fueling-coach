import type { DailyBriefing, DailyBriefingInput } from "@/domain/briefing/types";
import type { MealPlanSlot, MealTemplate, NutritionMetric, NutritionTarget } from "@/domain/nutrition/types";
import { describeWorkoutType, intensityLabels } from "@/domain/training/catalog";
import type { WorkoutPlan } from "@/domain/training/types";

export function createDailyBriefing(input: DailyBriefingInput): DailyBriefing {
  const { profile, goals, dayPlan, mealTemplates } = input;
  const plannedWorkouts = dayPlan.workouts.filter((workout) => workout.status !== "cancelled");
  const primaryWorkout = plannedWorkouts.find((workout) => workout.status === "planned") ?? plannedWorkouts[0];
  const runningDistanceKm = plannedWorkouts
    .filter((workout) => workout.sport === "running" && workout.status !== "optional")
    .reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0);
  const optionalWorkouts = plannedWorkouts.filter((workout) => workout.status === "optional");
  const target = createNutritionTarget(profile.bodyMetrics.weightKg, runningDistanceKm, plannedWorkouts.length, goals.weightStrategy);
  const raceContext = createRaceContext(profile.raceGoal ?? goals.raceGoal, dayPlan.date);

  return {
    dateLabel: formatDate(dayPlan.date, profile.locale),
    greeting: `Guten Morgen, ${profile.firstName}`,
    focus: createFocusLabel(goals.weightStrategy, primaryWorkout),
    heroTitle: createHeroTitle(primaryWorkout),
    lead: createLead(primaryWorkout, runningDistanceKm, optionalWorkouts.length),
    readiness: runningDistanceKm >= 14 ? "Belastung bewusst steuern" : "Normal belastbar",
    raceContext,
    nutritionTarget: target,
    metrics: createNutritionMetrics(target),
    workouts: plannedWorkouts.map((workout) => createWorkoutBriefing(workout, runningDistanceKm)),
    meals: dayPlan.mealPlan.map((slot) => createMealRecommendation(slot, mealTemplates, runningDistanceKm)),
    priorities: createPriorities(runningDistanceKm, optionalWorkouts.length),
    coachHint: createCoachHint(runningDistanceKm, goals.weightStrategy, profile.coachingStyle, raceContext),
    coachCards: createCoachCards(runningDistanceKm),
    source: "rule_based"
  };
}

function createNutritionTarget(
  weightKg: number,
  runningDistanceKm: number,
  workoutCount: number,
  weightStrategy: string
): NutritionTarget {
  const baseCalories = weightStrategy === "reduce" ? { min: 2300, max: 2500 } : { min: 2500, max: 2750 };
  const trainingDelta = runningDistanceKm >= 14 ? 300 : runningDistanceKm >= 8 ? 150 : workoutCount > 0 ? 100 : 0;
  const calories = {
    min: baseCalories.min + trainingDelta,
    max: baseCalories.max + trainingDelta,
    unit: "kcal"
  };
  const protein = {
    min: roundTo(weightKg * 1.9, 5),
    max: roundTo(weightKg * 2.15, 5),
    unit: "g"
  };
  const carbohydrates = runningDistanceKm >= 14
    ? { min: 300, max: 380, unit: "g" }
    : runningDistanceKm >= 8
      ? { min: 250, max: 310, unit: "g" }
      : { min: 180, max: 240, unit: "g" };

  return {
    energyDemand: runningDistanceKm >= 14 ? "hoch" : runningDistanceKm >= 8 || workoutCount > 0 ? "mittel" : "niedrig",
    calories,
    protein,
    carbohydrates,
    rationale: [
      "Gewicht reduzieren bleibt aktiv, aber nicht auf Kosten der Trainingsqualität.",
      "Protein bleibt hoch für Sättigung und Muskelerhalt.",
      runningDistanceKm >= 8
        ? "Kohlenhydrate werden rund um den Lauf priorisiert."
        : "Kohlenhydrate bleiben moderat, solange keine längere Ausdauereinheit geplant ist."
    ]
  };
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

function createMealRecommendation(slot: MealPlanSlot, mealTemplates: MealTemplate[], runningDistanceKm: number) {
  const template = mealTemplates.find((meal) => meal.id === slot.mealTemplateId);
  const name = template?.name ?? "Flexible Mahlzeit";
  const detail = template?.description ?? "Grob planen, nicht grammgenau tracken.";

  return {
    time: slot.time,
    name,
    detail,
    macroHint: createMacroHint(slot.role, runningDistanceKm),
    reason: createMealReason(slot.role)
  };
}

function createMacroHint(role: MealPlanSlot["role"], runningDistanceKm: number): string {
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

function createPriorities(runningDistanceKm: number, optionalWorkoutCount: number): string[] {
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
  raceContext?: string
): string {
  if (coachingStyle === "active" && runningDistanceKm >= 8 && weightStrategy === "reduce") {
    return `${raceContext ? `${raceContext}. ` : ""}Heute ist kein Tag für ein aggressives Defizit. Fueling rund um den Lauf schützt die Qualität der nächsten Trainingstage.`;
  }

  if (runningDistanceKm === 0) {
    return "Heute ist noch wenig geplant. Lege zuerst Training, Alltag und ein bis zwei Mahlzeiten grob fest, dann wird das Briefing hilfreicher.";
  }

  return "Heute ruhig planen: Training, Essen und Erholung sollen zusammenpassen.";
}

function createCoachCards(runningDistanceKm: number) {
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

function createFocusLabel(weightStrategy: string, primaryWorkout?: WorkoutPlan): string {
  const goal = weightStrategy === "reduce" ? "Leichtes Defizit" : "Energie stabil halten";
  const training = primaryWorkout?.sport === "running" ? "Lauf sauber fuelen" : "Training passend unterstützen";

  return `${goal}, ${training}`;
}

function createHeroTitle(primaryWorkout?: WorkoutPlan): string {
  if (!primaryWorkout) return "Ruhiger Tag, Ernährung sauber halten.";
  return `${primaryWorkout.title}, Fueling sauber halten.`;
}

function createLead(primaryWorkout: WorkoutPlan | undefined, runningDistanceKm: number, optionalWorkoutCount: number): string {
  if (!primaryWorkout) {
    return "Heute steht kein hartes Training im Mittelpunkt. Nutze den Tag für stabile Ernährung und Erholung.";
  }

  const optionalHint = optionalWorkoutCount > 0 ? " Optionale Einheiten bleiben wirklich optional." : "";
  if (primaryWorkout.sport === "running" && runningDistanceKm >= 8) {
    return `Heute steht ${primaryWorkout.title} im Mittelpunkt. Iss tagsüber stabil und spare nicht an Kohlenhydraten rund um den Lauf.${optionalHint}`;
  }

  return `Heute steht ${primaryWorkout.title} im Plan. Ernährung und Erholung sollen die Einheit unterstützen.${optionalHint}`;
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
