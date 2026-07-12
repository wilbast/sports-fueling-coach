export type DashboardRange = "today" | "7d" | "30d" | "90d" | "year";

export type DashboardTone = "green" | "blue" | "amber" | "cyan" | "red";

export type ScoreMetric = {
  id: "recovery" | "fitness" | "fueling" | "consistency";
  label: string;
  score: number;
  change: number;
  tone: DashboardTone;
  trend: number[];
  href: string;
};

export type HealthPoint = {
  label: string;
  recovery: number;
  bodyBattery: number;
  readiness: number;
  sleepHours: number;
  sleepScore: number;
  hrv: number;
  restingHr: number;
};

export type TrainingPoint = {
  label: string;
  acuteLoad: number;
  chronicLoad: number;
  distanceKm: number;
};

export type NutritionPoint = {
  label: string;
  eatenKcal: number;
  burnedKcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DashboardData = {
  generatedAt: string;
  source: "mock";
  range: DashboardRange;
  hero: {
    greeting: string;
    status: string;
    recoveryScore: number;
    readiness: number;
    calorieCurrent: number;
    calorieTarget: number;
    proteinCurrent: number;
    proteinTarget: number;
    recommendedTraining: string;
  };
  scores: ScoreMetric[];
  coach: {
    title: string;
    message: string;
    reasons: string[];
    trainingAction: string;
    fuelingAction: string;
  };
  health: HealthPoint[];
  stressByHour: number[];
  training: TrainingPoint[];
  trainingMix: Array<{ name: string; value: number; color: string }>;
  pace: Array<{ label: string; easy: number; tenK: number; halfMarathon: number }>;
  nutrition: NutritionPoint[];
  garmin: Array<{ label: string; value: string; change: number; tone: DashboardTone; trend: number[] }>;
  goals: Array<{ label: string; value: string; progress: number; tone: DashboardTone; href: string }>;
  calendar: Array<{ date: string; load: number; intensity: "rest" | "easy" | "moderate" | "hard" }>;
};
