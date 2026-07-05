import type { UserGoals } from "@/domain/goals/types";
import type { UserProfile } from "@/domain/profile/types";

export const demoUserProfile: UserProfile = {
  id: "bastian-demo",
  firstName: "Bastian",
  locale: "de-DE",
  bodyMetrics: {
    heightCm: 184,
    weightKg: 86,
    targetWeightKg: 82
  },
  primarySports: ["Laufen", "Krafttraining", "Padel"],
  coachingStyle: "active",
  raceGoal: {
    name: "Herbst-Halbmarathon",
    date: "2026-10-04",
    distanceKm: 21.1,
    targetTime: "1:45:00",
    priority: "A"
  }
};

export const demoUserGoals: UserGoals = {
  weightStrategy: "reduce",
  performanceStrategy: "prepare_race",
  fuelingPriority: "support_training",
  raceGoal: demoUserProfile.raceGoal
};
