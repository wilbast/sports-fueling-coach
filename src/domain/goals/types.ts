import type { IsoDate } from "@/domain/shared";

export type WeightStrategy = "reduce" | "maintain" | "gain";

export type PerformanceStrategy = "maintain_and_improve" | "prepare_race" | "recover";

export type RaceGoal = {
  name: string;
  date: IsoDate;
  distanceKm: number;
  targetTime: string;
  priority: "A" | "B" | "C";
};

export type UserGoals = {
  weightStrategy: WeightStrategy;
  performanceStrategy: PerformanceStrategy;
  fuelingPriority: "support_training" | "maximize_deficit" | "maintain_energy";
  raceGoal?: RaceGoal;
};
