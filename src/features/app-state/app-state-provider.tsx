"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoMealTemplates } from "@/data/mock/nutrition";
import { demoWeekPlan } from "@/data/mock/planning";
import { demoUserGoals, demoUserProfile } from "@/data/mock/profile";
import { demoStandards } from "@/data/mock/standards";
import type { RaceGoal, UserGoals } from "@/domain/goals/types";
import type { MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import type { DayBlock, DayContext, DayPlan, WeekPlan } from "@/domain/planning/types";
import type { UserProfile } from "@/domain/profile/types";
import type { IsoDate } from "@/domain/shared";
import type {
  AppStandards,
  PlanningContext,
  PlanningExtraInfo,
  PlanningStandard,
  StandardWeekDay,
  StandardWeekTemplate,
  WorkoutTemplate
} from "@/domain/standards/types";
import type { SportType, WorkoutIntensity, WorkoutPlan, WorkoutStatus } from "@/domain/training/types";
import { createClient as createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const STORAGE_KEY = "sports-fueling-coach:demo-state:v3";

export type AppState = {
  profile: UserProfile;
  goals: UserGoals;
  weekPlan: WeekPlan;
  mealTemplates: MealTemplate[];
  standards: AppStandards;
  selectedDate: string;
};

type WorkoutDraft = {
  sport: SportType;
  title: string;
  startTime?: string;
  durationMinutes?: number;
  distanceKm?: number;
  status: WorkoutStatus;
  intensity: WorkoutIntensity;
  description: string;
};

type MealTemplateDraft = {
  name: string;
  description: string;
  caloriesMin: number;
  caloriesMax: number;
  proteinMin: number;
  proteinMax: number;
  tags: string[];
};

type AppStateContextValue = {
  state: AppState;
  hasHydrated: boolean;
  setSelectedDate: (date: string) => void;
  updateDayPlanningContext: (date: string, context: PlanningContext) => void;
  addDayExtraInfo: (date: string, info: Omit<PlanningExtraInfo, "id">) => void;
  removeDayExtraInfo: (date: string, infoId: string) => void;
  addPlanningStandard: (standard: Omit<PlanningStandard, "id">) => void;
  applyPlanningStandard: (date: string, standardId: string) => void;
  addWorkout: (date: string, workout: WorkoutDraft, options?: { saveAsStandard?: boolean }) => void;
  applyWorkoutStandard: (date: string, templateId: string) => void;
  updateWorkoutStatus: (date: string, workoutId: string, status: WorkoutStatus) => void;
  removeWorkout: (date: string, workoutId: string) => void;
  addMealSlot: (date: string, slot: MealPlanSlot) => void;
  removeMealSlot: (date: string, slotIndex: number) => void;
  addMealTemplate: (template: MealTemplateDraft) => void;
  addMealEntry: (
    date: string,
    template: MealTemplateDraft,
    slot: Omit<MealPlanSlot, "mealTemplateId">,
    options?: { saveAsStandard?: boolean }
  ) => void;
  saveCurrentWeekAsStandard: (name: string, description?: string) => void;
  applyWeekStandard: (templateId: string) => void;
  updateProfile: (profile: UserProfile) => void;
  updateGoals: (goals: UserGoals) => void;
  updateRaceGoal: (raceGoal: RaceGoal) => void;
  resetDemoState: () => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

type AppStateProviderProps = {
  children: React.ReactNode;
};

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, setState] = useState<AppState>(() => createInitialAppState());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydrateState() {
      if (!isSupabaseConfigured()) {
        const storedState = loadStoredState();

        if (active && storedState) {
          setState(storedState);
        }

        if (active) {
          setHasHydrated(true);
        }

        return;
      }

      const supabase = createSupabaseClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!active) return;

      if (!user) {
        setHasHydrated(true);
        return;
      }

      setSupabaseUserId(user.id);

      const { data, error } = await supabase
        .from("app_states")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (data?.state) {
        setState(normalizeAppState(data.state as Partial<AppState>));
      } else if (!error) {
        const initialState = createInitialAppState();
        setState(initialState);

        await supabase
          .from("app_states")
          .upsert({
            user_id: user.id,
            state: initialState
          }, { onConflict: "user_id" });
      } else {
        console.warn("Supabase app state could not be loaded.", error.message);
      }

      if (active) {
        setHasHydrated(true);
      }
    }

    hydrateState();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isSupabaseConfigured()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return;
    }

    if (!supabaseUserId) return;

    const saveTimeout = window.setTimeout(async () => {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from("app_states")
        .upsert({
          user_id: supabaseUserId,
          state
        }, { onConflict: "user_id" });

      if (error) {
        console.warn("Supabase app state could not be saved.", error.message);
      }
    }, 500);

    return () => window.clearTimeout(saveTimeout);
  }, [hasHydrated, state, supabaseUserId]);

  const value = useMemo<AppStateContextValue>(() => ({
    state,
    hasHydrated,
    setSelectedDate: (date) => {
      setState((current) => ({ ...current, selectedDate: date }));
    },
    updateDayPlanningContext: (date, context) => {
      setState((current) => updateDay(current, date, (day) => ({
        ...day,
        context: [context, ...day.context.filter((item) => !isPlanningContext(item))],
        blocks: [
          ...day.blocks.filter((block) => block.type !== "work" && block.type !== "travel"),
          createPlanningContextBlock(context)
        ]
      })));
    },
    addDayExtraInfo: (date, info) => {
      setState((current) => updateDay(current, date, (day) => {
        const extraInfo: PlanningExtraInfo = {
          id: createId("info"),
          ...info
        };

        return {
          ...day,
          context: extraInfo.context && !day.context.includes(extraInfo.context)
            ? [...day.context, extraInfo.context]
            : day.context,
          blocks: [...day.blocks, planningExtraInfoToBlock(extraInfo)]
        };
      }));
    },
    removeDayExtraInfo: (date, infoId) => {
      setState((current) => updateDay(current, date, (day) => ({
        ...day,
        blocks: day.blocks.filter((block) => block.id !== infoId)
      })));
    },
    addPlanningStandard: (standard) => {
      setState((current) => ({
        ...current,
        standards: {
          ...current.standards,
          planning: [
            ...current.standards.planning,
            {
              id: createId("planning-standard"),
              ...standard
            }
          ]
        }
      }));
    },
    applyPlanningStandard: (date, standardId) => {
      setState((current) => {
        const standard = current.standards.planning.find((item) => item.id === standardId);
        if (!standard) return current;

        return updateDay(current, date, (day) => ({
          ...day,
          context: mergeDayContexts(standard.context, standard.extraInfos),
          blocks: [
            ...day.blocks.filter((block) => block.type === "training" || block.type === "nutrition"),
            createPlanningContextBlock(standard.context),
            ...standard.extraInfos.map((info) => planningExtraInfoToBlock({ ...info, id: createId("info") }))
          ],
          note: standard.note ?? day.note
        }));
      });
    },
    addWorkout: (date, workout, options) => {
      setState((current) => {
        const workoutPlan = createWorkoutFromDraft(date, workout);
        const nextState = updateDay(current, date, (day) => ({
          ...day,
          workouts: [...day.workouts, workoutPlan],
          blocks: [...day.blocks, createWorkoutBlock(workoutPlan)]
        }));

        if (!options?.saveAsStandard) return nextState;

        return {
          ...nextState,
          standards: {
            ...nextState.standards,
            workouts: [
              ...nextState.standards.workouts,
              workoutToTemplate(workoutPlan)
            ]
          }
        };
      });
    },
    applyWorkoutStandard: (date, templateId) => {
      setState((current) => {
        const template = current.standards.workouts.find((item) => item.id === templateId);
        if (!template) return current;

        const workout = workoutTemplateToPlan(date, template);

        return updateDay(current, date, (day) => ({
          ...day,
          workouts: [...day.workouts, workout],
          blocks: [...day.blocks, createWorkoutBlock(workout)]
        }));
      });
    },
    updateWorkoutStatus: (date, workoutId, status) => {
      setState((current) => updateDay(current, date, (day) => ({
        ...day,
        workouts: day.workouts.map((workout) => workout.id === workoutId ? { ...workout, status } : workout)
      })));
    },
    removeWorkout: (date, workoutId) => {
      setState((current) => updateDay(current, date, (day) => ({
        ...day,
        workouts: day.workouts.filter((workout) => workout.id !== workoutId)
      })));
    },
    addMealSlot: (date, slot) => {
      setState((current) => updateDay(current, date, (day) => ({
        ...day,
        mealPlan: [...day.mealPlan, slot].sort((a, b) => a.time.localeCompare(b.time))
      })));
    },
    removeMealSlot: (date, slotIndex) => {
      setState((current) => updateDay(current, date, (day) => ({
        ...day,
        mealPlan: day.mealPlan.filter((_, index) => index !== slotIndex)
      })));
    },
    addMealTemplate: (template) => {
      setState((current) => ({
        ...current,
        mealTemplates: [
          ...current.mealTemplates,
          createMealTemplate(template, true)
        ]
      }));
    },
    addMealEntry: (date, template, slot, options) => {
      setState((current) => {
        const meal = createMealTemplate(template, options?.saveAsStandard ?? false);
        const nextState = {
          ...current,
          mealTemplates: [...current.mealTemplates, meal]
        };

        return updateDay(nextState, date, (day) => ({
          ...day,
          mealPlan: [
            ...day.mealPlan,
            {
              ...slot,
              mealTemplateId: meal.id
            }
          ].sort((a, b) => a.time.localeCompare(b.time))
        }));
      });
    },
    saveCurrentWeekAsStandard: (name, description) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      setState((current) => ({
        ...current,
        standards: {
          ...current.standards,
          weeks: [
            ...current.standards.weeks,
            weekPlanToTemplate(current.weekPlan, trimmedName, description)
          ]
        }
      }));
    },
    applyWeekStandard: (templateId) => {
      setState((current) => {
        const template = current.standards.weeks.find((item) => item.id === templateId);
        if (!template) return current;

        const days = current.weekPlan.days.map((day, index) => {
          const standardDay = template.days[index] ?? template.days[template.days.length - 1];
          return standardWeekDayToPlan(day.date, standardDay);
        });

        return {
          ...current,
          weekPlan: {
            ...current.weekPlan,
            templateName: template.name,
            days
          },
          selectedDate: days[0]?.date ?? current.selectedDate
        };
      });
    },
    updateProfile: (profile) => {
      setState((current) => ({ ...current, profile }));
    },
    updateGoals: (goals) => {
      setState((current) => ({ ...current, goals }));
    },
    updateRaceGoal: (raceGoal) => {
      setState((current) => ({
        ...current,
        profile: { ...current.profile, raceGoal },
        goals: { ...current.goals, raceGoal }
      }));
    },
    resetDemoState: () => {
      window.localStorage.removeItem(STORAGE_KEY);
      setState(createInitialAppState());
    }
  }), [hasHydrated, state]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}

function createInitialAppState(): AppState {
  return {
    profile: clone(demoUserProfile),
    goals: clone(demoUserGoals),
    weekPlan: clone(demoWeekPlan),
    mealTemplates: clone(demoMealTemplates),
    standards: clone(demoStandards),
    selectedDate: demoWeekPlan.days[0].date
  };
}

function loadStoredState(): AppState | null {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<AppState>;
    return normalizeAppState(parsed);
  } catch {
    return null;
  }
}

function normalizeAppState(parsed: Partial<AppState>): AppState {
  const fallback = createInitialAppState();

  return {
    profile: parsed.profile ?? fallback.profile,
    goals: parsed.goals ?? fallback.goals,
    weekPlan: parsed.weekPlan ?? fallback.weekPlan,
    mealTemplates: parsed.mealTemplates ?? fallback.mealTemplates,
    standards: parsed.standards ?? fallback.standards,
    selectedDate: parsed.selectedDate ?? fallback.selectedDate
  };
}

function updateDay(state: AppState, date: string, updater: (day: DayPlan) => DayPlan): AppState {
  return {
    ...state,
    weekPlan: {
      ...state.weekPlan,
      days: state.weekPlan.days.map((day) => day.date === date ? updater(day) : day)
    }
  };
}

function isPlanningContext(context: DayContext): context is PlanningContext {
  return context === "homeoffice" || context === "office" || context === "travel";
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
    id: createId(context),
    ...blocks[context]
  };
}

function planningExtraInfoToBlock(info: PlanningExtraInfo): DayBlock {
  return {
    id: info.id,
    type: info.type,
    label: info.label,
    impact: info.impact
  };
}

function mergeDayContexts(context: PlanningContext, extraInfos: PlanningExtraInfo[]): DayContext[] {
  const contexts: DayContext[] = [context];

  extraInfos.forEach((info) => {
    if (info.context && !contexts.includes(info.context)) {
      contexts.push(info.context);
    }
  });

  return contexts;
}

function createWorkoutFromDraft(date: string, workout: WorkoutDraft): WorkoutPlan {
  return {
    id: createId(workout.sport),
    date: asIsoDate(date),
    ...workout
  };
}

function workoutTemplateToPlan(date: string, template: WorkoutTemplate): WorkoutPlan {
  return {
    id: createId(template.sport),
    date: asIsoDate(date),
    sport: template.sport,
    title: template.title,
    startTime: template.startTime,
    durationMinutes: template.durationMinutes,
    distanceKm: template.distanceKm,
    status: "planned",
    intensity: template.intensity,
    description: template.description
  };
}

function workoutToTemplate(workout: WorkoutPlan): WorkoutTemplate {
  return {
    id: createId("workout-standard"),
    name: workout.title,
    sport: workout.sport,
    title: workout.title,
    startTime: workout.startTime,
    durationMinutes: workout.durationMinutes,
    distanceKm: workout.distanceKm,
    intensity: workout.intensity,
    description: workout.description
  };
}

function createWorkoutBlock(workout: Pick<WorkoutPlan, "sport" | "title">): DayBlock {
  return {
    id: createId("training"),
    type: "training",
    label: workout.title,
    impact: workout.sport === "running"
      ? "Fueling und Kohlenhydrate rund um den Lauf einplanen"
      : "Protein und Erholung passend zur Einheit sichern"
  };
}

function createMealTemplate(template: MealTemplateDraft, isStandard: boolean): MealTemplate {
  return {
    id: createId("meal"),
    name: template.name,
    description: template.description,
    estimatedCalories: { min: template.caloriesMin, max: template.caloriesMax, unit: "kcal" },
    estimatedProteinGrams: { min: template.proteinMin, max: template.proteinMax, unit: "g" },
    tags: template.tags,
    isStandard
  };
}

function weekPlanToTemplate(weekPlan: WeekPlan, name: string, description?: string): StandardWeekTemplate {
  return {
    id: createId("week-standard"),
    name,
    description: description?.trim() || "Aus der aktuellen Demo-Woche gespeichert.",
    days: weekPlan.days.map((day) => ({
      label: formatWeekday(day.date),
      context: getPlanningContext(day),
      extraInfos: dayBlocksToExtraInfos(day.blocks),
      workouts: day.workouts.map(workoutToTemplate),
      mealPlan: clone(day.mealPlan),
      note: day.note
    }))
  };
}

function standardWeekDayToPlan(date: IsoDate, standardDay: StandardWeekDay): DayPlan {
  const workouts = standardDay.workouts.map((workout) => workoutTemplateToPlan(date, workout));

  return {
    date,
    context: mergeDayContexts(standardDay.context, standardDay.extraInfos),
    focus: workouts[0]?.title ?? "Ruhetag",
    workouts,
    mealPlan: clone(standardDay.mealPlan),
    blocks: [
      createPlanningContextBlock(standardDay.context),
      ...standardDay.extraInfos.map((info) => planningExtraInfoToBlock({ ...info, id: createId("info") })),
      ...workouts.map(createWorkoutBlock)
    ],
    note: standardDay.note
  };
}

function getPlanningContext(day: DayPlan): PlanningContext {
  if (day.context.includes("travel")) return "travel";
  if (day.context.includes("office")) return "office";

  return "homeoffice";
}

function dayBlocksToExtraInfos(blocks: DayBlock[]): PlanningExtraInfo[] {
  return blocks
    .filter((block) => block.type === "restaurant" || block.type === "family" || block.type === "recovery" || block.type === "planning")
    .map((block) => ({
      id: createId("info"),
      label: block.label,
      impact: block.impact,
      type: block.type,
      context: block.type === "restaurant" ? "restaurant" : block.type === "family" ? "family" : undefined
    }));
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(".", "");
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asIsoDate(value: string): IsoDate {
  return value as IsoDate;
}
