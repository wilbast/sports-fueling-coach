import type { RaceGoal } from "@/domain/goals/types";

export type BodyMetrics = {
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
};

export type UserProfile = {
  id: string;
  firstName: string;
  locale: "de-DE";
  bodyMetrics: BodyMetrics;
  primarySports: string[];
  coachingStyle: "active" | "reserved";
  raceGoal?: RaceGoal;
};
