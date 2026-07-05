import type { DisplayTone } from "@/domain/shared";
import type { UserGoals } from "@/domain/goals/types";
import type { MealRecommendation, MealTemplate, NutritionMetric, NutritionTarget } from "@/domain/nutrition/types";
import type { DayPlan } from "@/domain/planning/types";
import type { UserProfile } from "@/domain/profile/types";
import type { WorkoutPlan } from "@/domain/training/types";

export type DailyBriefingInput = {
  profile: UserProfile;
  goals: UserGoals;
  dayPlan: DayPlan;
  mealTemplates: MealTemplate[];
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
