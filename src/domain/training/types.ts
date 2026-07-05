import type { IsoDate } from "@/domain/shared";

export type SportType =
  | "running"
  | "strength"
  | "freeletics"
  | "padel"
  | "cycling"
  | "swimming"
  | "hiking"
  | "other";

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
  description: string;
};
