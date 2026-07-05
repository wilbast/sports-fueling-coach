import type { IsoDate } from "@/domain/shared";
import type { MealPlanSlot } from "@/domain/nutrition/types";
import type { WorkoutPlan } from "@/domain/training/types";

export type DayContext =
  | "homeoffice"
  | "office"
  | "free"
  | "vacation"
  | "restaurant"
  | "travel"
  | "family"
  | "race"
  | "recovery";

export type DayBlockType =
  | "work"
  | "training"
  | "nutrition"
  | "restaurant"
  | "family"
  | "free"
  | "recovery"
  | "travel"
  | "planning";

export type DayBlock = {
  id: string;
  type: DayBlockType;
  label: string;
  impact: string;
};

export type DayPlan = {
  date: IsoDate;
  context: DayContext[];
  focus: string;
  workouts: WorkoutPlan[];
  mealPlan: MealPlanSlot[];
  blocks: DayBlock[];
  note?: string;
};

export type WeekPlan = {
  id: string;
  label: string;
  startsOn: IsoDate;
  templateName: string;
  days: DayPlan[];
};
