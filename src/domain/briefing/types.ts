import type { DisplayTone } from "@/domain/shared";
import type { UserGoals } from "@/domain/goals/types";
import type { EnergySettings, MealRecommendation, MealTemplate, NutritionMetric, NutritionTarget } from "@/domain/nutrition/types";
import type { DayPlan } from "@/domain/planning/types";
import type { UserProfile } from "@/domain/profile/types";
import type { WorkoutPlan } from "@/domain/training/types";

export type DailyBriefingInput = {
  profile: UserProfile;
  goals: UserGoals;
  dayPlan: DayPlan;
  mealTemplates: MealTemplate[];
  actualActivities?: ActualActivityForBriefing[];
  energySettings?: EnergySettings;
};

export type ActualActivityForBriefing = {
  name: string;
  sportType: string;
  startDate: string;
  startDateLocal?: string | null;
  distanceMeters?: number | null;
  movingTimeSeconds?: number | null;
  elapsedTimeSeconds?: number | null;
  calories?: number | null;
  averageHeartrate?: number | null;
  relativeEffort?: number | null;
  trainingLoad?: number | null;
};

export type BriefingWorkout = {
  sport: string;
  title: string;
  time: string;
  detail: string;
  intensity: string;
  fueling: string;
};

export type BriefingCoachCard = {
  title: string;
  body: string;
  tone: DisplayTone;
};

export type DailyBriefing = {
  dateLabel: string;
  greeting: string;
  focus: string;
  heroTitle: string;
  lead: string;
  readiness: string;
  raceContext?: string;
  nutritionTarget: NutritionTarget;
  metrics: NutritionMetric[];
  workouts: BriefingWorkout[];
  meals: MealRecommendation[];
  priorities: string[];
  coachHint: string;
  coachCards: BriefingCoachCard[];
  source: "rule_based";
};
