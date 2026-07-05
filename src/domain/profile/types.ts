import type { RaceGoal } from "@/domain/goals/types";

export type BodyMetrics = {
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
};

export type FamilyProfile = {
  situation: "single" | "partner" | "with_children" | "single_parent" | "shared_parenting";
  childrenCount: number;
  careResponsibility: "low" | "medium" | "high";
  notes?: string;
};

export type JobProfile = {
  title: string;
  workPattern: "homeoffice" | "office" | "hybrid" | "travel_heavy" | "shift" | "flexible";
  workload: "regular" | "high" | "variable";
  commuteMinutes?: number;
  notes?: string;
};

export type UserProfile = {
  id: string;
  firstName: string;
  locale: "de-DE";
  bodyMetrics: BodyMetrics;
  primarySports: string[];
  coachingStyle: "active" | "reserved";
  family?: FamilyProfile;
  job?: JobProfile;
  raceGoal?: RaceGoal;
};
