import type { IsoDate } from "@/domain/shared";

export type SportType =
  | "running"
  | "padel"
  | "swimming"
  | "squash"
  | "hiit"
  | "strength"
  | "cycling";

export type RunningWorkoutType =
  | "easy_run"
  | "tempo_run"
  | "fartlek"
  | "intervals";

export type RunningFocus =
  | "base"
  | "recovery"
  | "threshold"
  | "vo2max";

export type WorkoutStatus = "planned" | "optional" | "completed" | "cancelled";

export type WorkoutIntensity = "easy" | "moderate" | "hard" | "optional";

export type WorkoutPlan = {
  id: string;
  date: IsoDate;
  sport: SportType;
  title: string;
  startTime?: string;
  durationMinutes?: number;
  distanceKm?: number;
  status: WorkoutStatus;
  intensity: WorkoutIntensity;
  runningType?: RunningWorkoutType;
  runningFocus?: RunningFocus;
  description: string;
};
