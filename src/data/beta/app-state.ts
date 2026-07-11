import type { UserGoals } from "@/domain/goals/types";
import type { EnergySettings, MealTemplate } from "@/domain/nutrition/types";
import { createEmptyWeekPlan, toIsoDate } from "@/domain/planning/calendar";
import type { WeekPlan } from "@/domain/planning/types";
import type { UserProfile } from "@/domain/profile/types";
import type { AppStandards } from "@/domain/standards/types";

const APP_STATE_SCHEMA_VERSION = 5;

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
  weekPlans: WeekPlan[];
  mealTemplates: MealTemplate[];
  standards: AppStandards;
  energySettings: EnergySettings;
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
      coachingStyle: "active",
      family: {
        situation: "with_children",
        childrenCount: 2,
        careResponsibility: "medium",
        notes: ""
      },
      job: {
        title: "Wissensarbeit",
        workPattern: "hybrid",
        workload: "variable",
        commuteMinutes: 30,
        notes: ""
      }
    },
    goals: {
      weightStrategy: "reduce",
      performanceStrategy: "maintain_and_improve",
      fuelingPriority: "support_training"
    },
    weekPlan,
    weekPlans: [weekPlan],
    mealTemplates: createBaseMealTemplates(),
    standards: createBaseStandards(),
    energySettings: createBaseEnergySettings(),
    selectedDate: today
  };
}

function createBaseEnergySettings(): EnergySettings {
  return {
    baselineCaloriesWithoutActivity: 2700,
    manualDailyBurnForecastCaloriesByDate: {}
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
      },
      {
        id: "base-planning-free",
        name: "Frei",
        context: "free",
        extraInfos: [],
        note: "Mehr Spielraum nutzen, aber Erholung und Mahlzeiten nicht ausfransen lassen."
      },
      {
        id: "base-planning-vacation",
        name: "Urlaub",
        context: "vacation",
        extraInfos: [],
        note: "Training flexibel halten, grobe Protein- und Energieanker setzen."
      }
    ],
    workouts: [],
    weeks: []
  };
}

function deriveFirstName(email?: string): string | undefined {
  if (!email) return undefined;

  const localPart = email.split("@")[0]?.split(/[._-]/)[0];
  if (!localPart) return undefined;

  return `${localPart.charAt(0).toUpperCase()}${localPart.slice(1)}`;
}
