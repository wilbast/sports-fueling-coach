import type { UserGoals } from "@/domain/goals/types";
import type { MealTemplate } from "@/domain/nutrition/types";
import type { DayBlock, DayPlan, WeekPlan } from "@/domain/planning/types";
import type { UserProfile } from "@/domain/profile/types";
import type { IsoDate } from "@/domain/shared";
import type { AppStandards, PlanningContext } from "@/domain/standards/types";

const APP_STATE_SCHEMA_VERSION = 4;

type CreateBetaAppStateInput = {
  userId?: string;
  email?: string;
  firstName?: string;
};

export type BetaAppState = {
  schemaVersion: number;
  appMode: "beta";
  profile: UserProfile;
  goals: UserGoals;
  weekPlan: WeekPlan;
  mealTemplates: MealTemplate[];
  standards: AppStandards;
  selectedDate: string;
};

export function createBetaAppState(input: CreateBetaAppStateInput = {}): BetaAppState {
  const today = toIsoDate(new Date());
  const weekPlan = createEmptyWeekPlan(today);
  const firstName = input.firstName?.trim() || deriveFirstName(input.email) || "Bastian";

  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    appMode: "beta",
    profile: {
      id: input.userId ?? "beta-user",
      firstName,
      locale: "de-DE",
      bodyMetrics: {
        heightCm: 184,
        weightKg: 86,
        targetWeightKg: 82
      },
      primarySports: ["Laufen", "Krafttraining", "Padel"],
      coachingStyle: "active"
    },
    goals: {
      weightStrategy: "reduce",
      performanceStrategy: "maintain_and_improve",
      fuelingPriority: "support_training"
    },
    weekPlan,
    mealTemplates: createBaseMealTemplates(),
    standards: createBaseStandards(),
    selectedDate: today
  };
}

function createEmptyWeekPlan(referenceDate: IsoDate): WeekPlan {
  const start = startOfWeek(referenceDate);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return createEmptyDayPlan(toIsoDate(date));
  });

  return {
    id: `week-${toIsoDate(start)}`,
    label: "Aktuelle Woche",
    startsOn: toIsoDate(start),
    templateName: "Eigene Beta-Woche",
    days
  };
}

function createEmptyDayPlan(date: IsoDate): DayPlan {
  return {
    date,
    context: ["homeoffice"],
    focus: "Eigener Tag",
    workouts: [],
    mealPlan: [],
    blocks: [createPlanningContextBlock("homeoffice")]
  };
}

function createBaseMealTemplates(): MealTemplate[] {
  return [
    {
      id: "base-protein-breakfast",
      name: "Proteinfrühstück",
      description: "Skyr oder Joghurt, Haferflocken, Obst, Nüsse",
      estimatedCalories: { min: 450, max: 600, unit: "kcal" },
      estimatedProteinGrams: { min: 35, max: 50, unit: "g" },
      tags: ["standard", "breakfast", "protein"],
      isStandard: true
    },
    {
      id: "base-balanced-bowl",
      name: "Ausgewogene Bowl",
      description: "Reis oder Kartoffeln, Proteinquelle, Gemüse, Dressing",
      estimatedCalories: { min: 650, max: 850, unit: "kcal" },
      estimatedProteinGrams: { min: 40, max: 60, unit: "g" },
      tags: ["standard", "lunch", "protein"],
      isStandard: true
    },
    {
      id: "base-pre-workout-snack",
      name: "Pre-Workout Snack",
      description: "Banane, Toast oder kleiner Riegel vor der Einheit",
      estimatedCalories: { min: 120, max: 250, unit: "kcal" },
      estimatedProteinGrams: { min: 0, max: 8, unit: "g" },
      tags: ["standard", "pre-workout", "carbs"],
      isStandard: true
    }
  ];
}

function createBaseStandards(): AppStandards {
  return {
    planning: [
      {
        id: "base-planning-homeoffice",
        name: "Home-Office",
        context: "homeoffice",
        extraInfos: [],
        note: "Flexibler Tag, Training und Mahlzeiten gut steuerbar."
      },
      {
        id: "base-planning-office",
        name: "Büroarbeit",
        context: "office",
        extraInfos: [],
        note: "Training, Snacks und Abendessen vorher grob festlegen."
      },
      {
        id: "base-planning-travel",
        name: "Reisetag",
        context: "travel",
        extraInfos: [],
        note: "Einfach halten, Energie und Protein pragmatisch sichern."
      }
    ],
    workouts: [],
    weeks: []
  };
}

function createPlanningContextBlock(context: PlanningContext): DayBlock {
  const blocks: Record<PlanningContext, Omit<DayBlock, "id">> = {
    homeoffice: {
      type: "work",
      label: "Home-Office",
      impact: "flexibler Tagesrhythmus, Training gut steuerbar"
    },
    office: {
      type: "work",
      label: "Büroarbeit",
      impact: "Training und Verpflegung brauchen mehr Vorplanung"
    },
    travel: {
      type: "travel",
      label: "Reisetag",
      impact: "Training und Fueling müssen bewusst einfach bleiben"
    }
  };

  return {
    id: `${context}-${Date.now().toString(36)}`,
    ...blocks[context]
  };
}

function deriveFirstName(email?: string): string | undefined {
  if (!email) return undefined;

  const localPart = email.split("@")[0]?.split(/[._-]/)[0];
  if (!localPart) return undefined;

  return `${localPart.charAt(0).toUpperCase()}${localPart.slice(1)}`;
}

function startOfWeek(date: IsoDate): Date {
  const current = new Date(`${date}T12:00:00`);
  const day = current.getDay();
  const distanceToMonday = day === 0 ? -6 : 1 - day;

  return addDays(current, distanceToMonday);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}` as IsoDate;
}
