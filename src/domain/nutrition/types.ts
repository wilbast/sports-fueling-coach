import type { DisplayTone, Range } from "@/domain/shared";

export type MacroTarget = Range;

export type NutritionTarget = {
  energyDemand: "niedrig" | "mittel" | "hoch";
  calories: MacroTarget;
  protein: MacroTarget;
  carbohydrates: MacroTarget;
  energyExpenditure: {
    baselineCalories: number;
    activityCalories: number;
    totalCalories: number;
    source: "garmin" | "actual" | "manual_forecast" | "planned" | "none";
  };
  rationale: string[];
};

export type EnergySettings = {
  baselineCaloriesWithoutActivity: number;
  manualDailyBurnForecastCaloriesByDate: Record<string, number>;
  manualActivityForecastCaloriesByDate?: Record<string, number>;
};

export type NutritionMetric = {
  label: string;
  value: string;
  unit: string;
  note: string;
  tone: Extract<DisplayTone, "green" | "blue" | "amber">;
};

export type MealTemplate = {
  id: string;
  name: string;
  description: string;
  category?: "breakfast" | "main" | "snack" | "dinner";
  estimatedCalories: Range;
  estimatedProteinGrams: Range;
  estimatedCarbohydratesGrams?: Range;
  estimatedFatGrams?: Range;
  nutritionSource?: "standard" | "recipe" | "free_text" | "ai_estimate" | "manual";
  nutritionConfidence?: "low" | "medium" | "high" | "manual";
  nutritionRationale?: string;
  tags: string[];
  isStandard?: boolean;
};

export type MealPlanSlot = {
  time: string;
  mealTemplateId: string;
  role: "breakfast" | "lunch" | "pre_workout" | "post_workout" | "dinner";
};

export type MealRecommendation = {
  time: string;
  name: string;
  detail: string;
  macroHint: string;
  reason: string;
};
