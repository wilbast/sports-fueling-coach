import type { MealPlanSlot } from "@/domain/nutrition/types";
import type { DayBlockType, DayContext } from "@/domain/planning/types";
import type { IsoDate } from "@/domain/shared";
import type { PlanningContext } from "@/domain/standards/types";
import type {
  RunningFocus,
  RunningWorkoutType,
  SportType,
  WorkoutIntensity,
  WorkoutStatus
} from "@/domain/training/types";

export type CoachChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  changes?: CoachPlanChange[];
  questions?: string[];
};

export type CoachWorkoutDraft = {
  sport: SportType;
  title: string;
  startTime?: string;
  durationMinutes?: number;
  distanceKm?: number;
  status?: WorkoutStatus;
  intensity?: WorkoutIntensity;
  runningType?: RunningWorkoutType;
  runningFocus?: RunningFocus;
  description?: string;
};

export type CoachMealDraft = {
  time: string;
  role: MealPlanSlot["role"];
  name: string;
  description: string;
  caloriesMin?: number;
  caloriesMax?: number;
  proteinMin?: number;
  proteinMax?: number;
  tags?: string[];
  saveAsStandard?: boolean;
};

export type CoachPlanChange =
  | {
    type: "set_day_context";
    date: IsoDate;
    context: PlanningContext;
    reason?: string;
  }
  | {
    type: "add_extra_info";
    date: IsoDate;
    label: string;
    impact?: string;
    blockType?: DayBlockType;
    context?: DayContext;
    reason?: string;
  }
  | {
    type: "add_workout";
    date: IsoDate;
    workout: CoachWorkoutDraft;
    saveAsStandard?: boolean;
    reason?: string;
  }
  | {
    type: "add_meal";
    date: IsoDate;
    meal: CoachMealDraft;
    reason?: string;
  };

export type CoachPlanResponse = {
  assistantMessage: string;
  questions: string[];
  changes: CoachPlanChange[];
  confidence: "low" | "medium" | "high";
};
