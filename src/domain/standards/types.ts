import type { MealPlanSlot } from "@/domain/nutrition/types";
import type { DayBlockType, DayContext } from "@/domain/planning/types";
import type { RunningFocus, RunningWorkoutType, SportType, WorkoutIntensity } from "@/domain/training/types";

export type PlanningContext = Extract<DayContext, "homeoffice" | "office" | "travel">;

export type PlanningExtraInfo = {
  id: string;
  label: string;
  impact: string;
  type: DayBlockType;
  context?: DayContext;
};

export type PlanningStandard = {
  id: string;
  name: string;
  context: PlanningContext;
  extraInfos: PlanningExtraInfo[];
  note?: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  sport: SportType;
  title: string;
  startTime?: string;
  durationMinutes?: number;
  distanceKm?: number;
  intensity: WorkoutIntensity;
  runningType?: RunningWorkoutType;
  runningFocus?: RunningFocus;
  description: string;
};

export type StandardWeekDay = {
  label: string;
  context: PlanningContext;
  extraInfos: PlanningExtraInfo[];
  workouts: WorkoutTemplate[];
  mealPlan: MealPlanSlot[];
  note?: string;
};

export type StandardWeekTemplate = {
  id: string;
  name: string;
  description: string;
  days: StandardWeekDay[];
};

export type AppStandards = {
  planning: PlanningStandard[];
  workouts: WorkoutTemplate[];
  weeks: StandardWeekTemplate[];
};
