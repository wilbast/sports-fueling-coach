import type { DayPlan, WeekPlan } from "@/domain/planning/types";

export function getDayPlanByDate(weekPlan: WeekPlan, date?: string): DayPlan {
  if (!date) return weekPlan.days[0];

  return weekPlan.days.find((day) => day.date === date) ?? weekPlan.days[0];
}

export function getWorkoutSummary(day: DayPlan): string {
  if (day.workouts.length === 0) return "Ruhetag";

  return day.workouts.map((workout) => workout.title).join(" + ");
}

export function getWeekTrainingLoad(weekPlan: WeekPlan): "niedrig" | "mittel" | "hoch" {
  const runningKm = weekPlan.days
    .flatMap((day) => day.workouts)
    .filter((workout) => workout.sport === "running" && workout.status !== "optional")
    .reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0);
  const hardSessions = weekPlan.days
    .flatMap((day) => day.workouts)
    .filter((workout) => workout.intensity === "hard").length;

  if (runningKm >= 38 || hardSessions >= 2) return "hoch";
  if (runningKm >= 20 || hardSessions === 1) return "mittel";

  return "niedrig";
}
