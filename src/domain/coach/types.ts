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
  mode?: CoachMode;
  outcomes?: CoachOutcome[];
  changes?: CoachPlanChange[];
  suggestions?: CoachSuggestion[];
  questions?: string[];
};

export type CoachMode = "coach" | "planning" | "change";

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
  carbohydrateGrams?: number;
  fatGrams?: number;
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
    type: "move_workout";
    fromDate: IsoDate;
    toDate: IsoDate;
    workoutId?: string;
    sport?: SportType;
    reason?: string;
  }
  | {
    type: "add_meal";
    date: IsoDate;
    meal: CoachMealDraft;
    reason?: string;
  };

export type CoachOutcome = {
  type: "recommendation" | "clarification_question" | "plan_change" | "no_change_note";
  domain: "training" | "fueling" | "nutrition" | "planning" | "recovery" | "general";
  day?: string;
  summary: string;
  planChange: CoachPlanChange | null;
};

export type CoachSuggestion = {
  id: string;
  title: string;
  kind: "training" | "fueling" | "recipe" | "recovery" | "planning";
  summary: string;
  rationale: string;
  tips: string[];
  changes: CoachPlanChange[];
};

export type CoachAiDebugInfo = {
  httpStatus: number | null;
  errorCode: string | null;
  message: string;
  model: string | null;
  hasApiKey: boolean;
};

export type CoachPlanResponse = {
  mode: CoachMode;
  assistantMessage: string;
  outcomes: CoachOutcome[];
  questions: string[];
  changes: CoachPlanChange[];
  suggestions: CoachSuggestion[];
  confidence: "low" | "medium" | "high";
  ai?: {
    status: "configured" | "fallback";
    message?: string;
    debug?: CoachAiDebugInfo;
  };
};
