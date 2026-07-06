import type { NutritionTarget } from "@/domain/nutrition/types";

export type NutritionEstimateSource = "standard" | "recipe" | "free_text" | "ai_estimate" | "manual";

export type NutritionConfidence = "low" | "medium" | "high" | "manual";

export type MealLogCategory = "breakfast" | "lunch" | "dinner" | "snack" | "drink";

export type NutritionValues = {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams?: number;
};

export type MealLog = {
  id: string;
  date: string;
  time?: string | null;
  name: string;
  description?: string | null;
  source: NutritionEstimateSource;
  confidence: NutritionConfidence;
  values: NutritionValues;
  rationale?: string | null;
  manuallyConfirmed: boolean;
  category: MealLogCategory;
  isMainMeal: boolean;
  createdAt?: string;
};

export type DailyNutritionSummary = {
  intake: Required<NutritionValues>;
  targets: {
    caloriesMin: number;
    caloriesMax: number;
    proteinMin: number;
    proteinMax: number;
    carbsMin: number;
    carbsMax: number;
    fatMin?: number;
    fatMax?: number;
  };
  expenditureCalories: number;
  deltas: {
    caloriesVsTargetMin: number;
    caloriesVsTargetMax: number;
    caloriesVsExpenditure: number;
    proteinRemaining: number;
    carbsRemaining: number;
    fatRemaining?: number;
  };
  progress: {
    calories: number;
    protein: number;
    carbs: number;
    fat?: number;
  };
};

export function createDailyNutritionSummary(logs: MealLog[], target: NutritionTarget): DailyNutritionSummary {
  const intake = logs.reduce<Required<NutritionValues>>((sum, log) => ({
    calories: sum.calories + log.values.calories,
    proteinGrams: sum.proteinGrams + log.values.proteinGrams,
    carbohydrateGrams: sum.carbohydrateGrams + log.values.carbohydrateGrams,
    fatGrams: sum.fatGrams + (log.values.fatGrams ?? 0)
  }), {
    calories: 0,
    proteinGrams: 0,
    carbohydrateGrams: 0,
    fatGrams: 0
  });

  const targets = {
    caloriesMin: target.calories.min,
    caloriesMax: target.calories.max,
    proteinMin: target.protein.min,
    proteinMax: target.protein.max,
    carbsMin: target.carbohydrates.min,
    carbsMax: target.carbohydrates.max,
    fatMin: undefined,
    fatMax: undefined
  };

  return {
    intake,
    targets,
    expenditureCalories: target.energyExpenditure.totalCalories,
    deltas: {
      caloriesVsTargetMin: intake.calories - targets.caloriesMin,
      caloriesVsTargetMax: intake.calories - targets.caloriesMax,
      caloriesVsExpenditure: intake.calories - target.energyExpenditure.totalCalories,
      proteinRemaining: Math.max(0, targets.proteinMin - intake.proteinGrams),
      carbsRemaining: Math.max(0, targets.carbsMin - intake.carbohydrateGrams),
      fatRemaining: undefined
    },
    progress: {
      calories: percent(intake.calories, targets.caloriesMax),
      protein: percent(intake.proteinGrams, targets.proteinMin),
      carbs: percent(intake.carbohydrateGrams, targets.carbsMin),
      fat: undefined
    }
  };
}

export function sourceLabel(source: NutritionEstimateSource, manuallyConfirmed: boolean): string {
  if (manuallyConfirmed || source === "manual") return "manuell bestätigt";
  if (source === "standard") return "Standard";
  if (source === "recipe") return "Rezept";
  if (source === "free_text") return "Freitext";
  return "KI-Schätzung";
}

function percent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(160, Math.round((value / target) * 100)));
}
