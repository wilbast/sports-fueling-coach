import type { MealTemplate } from "@/domain/nutrition/types";
import type { DayPlan } from "@/domain/planning/types";

export type MealStandardCategory = NonNullable<MealTemplate["category"]>;

const mealCategoryLabels: Record<MealStandardCategory, string> = {
  breakfast: "Frühstück",
  main: "Hauptmahlzeit",
  snack: "Snack",
  dinner: "Abendessen"
};

export const mealCategoryOptions: Array<{ value: MealStandardCategory; label: string }> = [
  { value: "breakfast", label: mealCategoryLabels.breakfast },
  { value: "main", label: mealCategoryLabels.main },
  { value: "snack", label: mealCategoryLabels.snack },
  { value: "dinner", label: mealCategoryLabels.dinner }
];

export function mealCategoryLabel(category: MealStandardCategory | undefined): string {
  return mealCategoryLabels[category ?? "snack"];
}

export function inferMealCategory(meal: Pick<MealTemplate, "name" | "description" | "tags" | "category">): MealStandardCategory {
  if (meal.category) return meal.category;

  const text = `${meal.name} ${meal.description} ${meal.tags.join(" ")}`.toLowerCase();
  if (text.includes("frühstück") || text.includes("fruehstueck") || text.includes("breakfast")) return "breakfast";
  if (text.includes("abend") || text.includes("dinner")) return "dinner";
  if (text.includes("snack") || text.includes("banane") || text.includes("shake") || text.includes("riegel") || text.includes("pre") || text.includes("post")) return "snack";

  return "main";
}

export function estimateMealLogTime(
  meal: Pick<MealTemplate, "name" | "description" | "tags" | "category">,
  day: Pick<DayPlan, "workouts"> | undefined
): string {
  const text = `${meal.name} ${meal.description} ${meal.tags.join(" ")}`.toLowerCase();
  const workouts = (day?.workouts ?? [])
    .filter((workout) => workout.status !== "cancelled" && workout.startTime)
    .sort((left, right) => String(left.startTime).localeCompare(String(right.startTime)));
  const firstWorkout = workouts[0];
  const lastWorkout = workouts[workouts.length - 1];

  if (text.includes("banane") || text.includes("pre-workout") || text.includes("pre workout") || text.includes("vor dem sport") || text.includes("vor training")) {
    return shiftTime(firstWorkout?.startTime, -30) ?? defaultTimeForCategory(inferMealCategory(meal));
  }

  if (text.includes("proteinshake") || text.includes("protein shake") || text.includes("recovery") || text.includes("post-workout") || text.includes("post workout") || text.includes("whey")) {
    return shiftTime(lastWorkout?.startTime, (lastWorkout?.durationMinutes ?? 0) + 20) ?? "16:30";
  }

  return defaultTimeForCategory(inferMealCategory(meal));
}

export function mealCategoryToRole(category: MealStandardCategory): "breakfast" | "lunch" | "pre_workout" | "post_workout" | "dinner" {
  if (category === "breakfast") return "breakfast";
  if (category === "dinner") return "dinner";
  if (category === "snack") return "pre_workout";

  return "lunch";
}

function defaultTimeForCategory(category: MealStandardCategory): string {
  if (category === "breakfast") return "08:00";
  if (category === "main") return "12:30";
  if (category === "dinner") return "19:00";

  return "16:30";
}

function shiftTime(time: string | undefined, minutes: number): string | null {
  const match = String(time ?? "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const totalMinutes = Math.max(0, Math.min(23 * 60 + 59, Number(match[1]) * 60 + Number(match[2]) + minutes));
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
}
