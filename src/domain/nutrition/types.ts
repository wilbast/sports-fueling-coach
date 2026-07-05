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
    source: "actual" | "manual_forecast" | "planned" | "none";
  };
  rationale: string[];
};

export type EnergySettings = {
  baselineCaloriesWithoutActivity: number;
  manualActivityForecastCaloriesByDate: Record<string, number>;
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
  estimatedCalories: Range;
  estimatedProteinGrams: Range;
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
