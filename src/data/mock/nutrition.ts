import type { MealTemplate } from "@/domain/nutrition/types";

export const demoMealTemplates: MealTemplate[] = [
  {
    id: "standard-breakfast",
    name: "Standardfrühstück",
    description: "Skyr, Haferflocken, Beeren, Nüsse",
    estimatedCalories: { min: 480, max: 560, unit: "kcal" },
    estimatedProteinGrams: { min: 38, max: 46, unit: "g" },
    tags: ["standard", "protein", "breakfast"]
  },
  {
    id: "chicken-bowl",
    name: "Chicken Bowl",
    description: "Reis, Huhn, Gemüse, Joghurt-Dressing",
    estimatedCalories: { min: 680, max: 780, unit: "kcal" },
    estimatedProteinGrams: { min: 50, max: 60, unit: "g" },
    tags: ["lunch", "protein", "carbs"]
  },
  {
    id: "pre-run-snack",
    name: "Pre-Run Snack",
    description: "Banane oder Toast mit Honig",
    estimatedCalories: { min: 120, max: 220, unit: "kcal" },
    estimatedProteinGrams: { min: 0, max: 6, unit: "g" },
    tags: ["pre-workout", "carbs"]
  },
  {
    id: "recovery-dinner",
    name: "Recovery Dinner",
    description: "Pasta oder Kartoffeln, Proteinquelle, Gemüse",
    estimatedCalories: { min: 700, max: 900, unit: "kcal" },
    estimatedProteinGrams: { min: 40, max: 60, unit: "g" },
    tags: ["dinner", "recovery", "carbs"]
  },
  {
    id: "recovery-shake",
    name: "Recovery Shake",
    description: "Whey, Banane, Milch oder Wasser",
    estimatedCalories: { min: 260, max: 340, unit: "kcal" },
    estimatedProteinGrams: { min: 28, max: 36, unit: "g" },
    tags: ["post-workout", "protein"]
  },
  {
    id: "restaurant-rough",
    name: "Restaurant grob",
    description: "Proteinquelle, Beilage, Gemüse, Sauce separat",
    estimatedCalories: { min: 800, max: 1000, unit: "kcal" },
    estimatedProteinGrams: { min: 35, max: 55, unit: "g" },
    tags: ["restaurant", "rough"]
  }
];

export const standardMeals = demoMealTemplates.map((meal) => ({
  name: meal.name,
  detail: meal.description,
  estimate: `ca. ${meal.estimatedCalories.min}-${meal.estimatedCalories.max} kcal · ${meal.estimatedProteinGrams.min}-${meal.estimatedProteinGrams.max} g Protein`
}));
