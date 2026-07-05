"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createBetaAppState } from "@/data/beta/app-state";
import { demoMealTemplates } from "@/data/mock/nutrition";
import { demoWeekPlan } from "@/data/mock/planning";
import { demoUserGoals, demoUserProfile } from "@/data/mock/profile";
import { demoStandards } from "@/data/mock/standards";
import type { CoachMealDraft, CoachPlanChange, CoachWorkoutDraft } from "@/domain/coach/types";
import type { RaceGoal, UserGoals } from "@/domain/goals/types";
import type { EnergySettings, MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import { addWeeks, createEmptyWeekPlan, createPlanningContextBlock, startOfWeek } from "@/domain/planning/calendar";
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
import type {
  RunningFocus,
  RunningWorkoutType,
  SportType,
  WorkoutIntensity,
  WorkoutPlan,
  WorkoutStatus
} from "@/domain/training/types";
import { createClient as createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const STORAGE_KEY = "sports-fueling-coach:demo-state:v3";

export type AppState = {
  schemaVersion: number;
  appMode: "demo" | "beta";
  updatedAt?: string;
  profile: UserProfile;
  goals: UserGoals;
  weekPlan: WeekPlan;
  weekPlans: WeekPlan[];
  mealTemplates: MealTemplate[];
  standards: AppStandards;
  energySettings: EnergySettings;
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
  runningType?: RunningWorkoutType;
  runningFocus?: RunningFocus;
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
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  updateDayPlanningContext: (date: string, context: PlanningContext) => void;
  addDayExtraInfo: (date: string, info: Omit<PlanningExtraInfo, "id">) => void;
  removeDayExtraInfo: (date: string, infoId: string) => void;
  addPlanningStandard: (standard: Omit<PlanningStandard, "id">) => void;
  removePlanningStandard: (standardId: string) => void;
  applyPlanningStandard: (date: string, standardId: string) => void;
  addWorkout: (date: string, workout: WorkoutDraft, options?: { saveAsStandard?: boolean }) => void;
  addWorkoutStandard: (template: Omit<WorkoutTemplate, "id">) => void;
  saveWorkoutAsStandard: (date: string, workoutId: string) => void;
  removeWorkoutStandard: (templateId: string) => void;
  applyWorkoutStandard: (date: string, templateId: string) => void;
  updateWorkoutStatus: (date: string, workoutId: string, status: WorkoutStatus) => void;
  removeWorkout: (date: string, workoutId: string) => void;
  addMealSlot: (date: string, slot: MealPlanSlot) => void;
  removeMealSlot: (date: string, slotIndex: number) => void;
  addMealTemplate: (template: MealTemplateDraft) => void;
  saveMealTemplateAsStandard: (mealTemplateId: string) => void;
  removeMealStandard: (mealTemplateId: string) => void;
  addMealEntry: (
    date: string,
    template: MealTemplateDraft,
    slot: Omit<MealPlanSlot, "mealTemplateId">,
    options?: { saveAsStandard?: boolean }
  ) => void;
  saveCurrentWeekAsStandard: (name: string, description?: string) => void;
  removeWeekStandard: (templateId: string) => void;
  applyWeekStandard: (templateId: string) => void;
  applyCoachPlanChanges: (changes: CoachPlanChange[]) => void;
  updateBaselineCaloriesWithoutActivity: (calories: number) => void;
  updateManualActivityForecastCalories: (date: string, calories?: number) => void;
  updateProfile: (profile: UserProfile) => void;
  updateGoals: (goals: UserGoals) => void;
  updateRaceGoal: (raceGoal: RaceGoal) => void;
  saveStateNow: () => Promise<void>;
  resetDemoState: () => void;
  resetBetaState: () => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

type AppStateProviderProps = {
  children: React.ReactNode;
};

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, setState] = useState<AppState>(() => createInitialAppState());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseUserEmail, setSupabaseUserEmail] = useState<string | undefined>();

  useEffect(() => {
    let active = true;

    async function hydrateState() {
      const storedState = loadStoredState();

      if (!isSupabaseConfigured()) {
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
      setSupabaseUserEmail(user.email);

      const localBetaState = storedState?.appMode === "beta" ? storedState : null;
      const { data, error } = await supabase
        .from("app_states")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (data?.state) {
        const remoteState = normalizeAppState(data.state as Partial<AppState>);
        const selectedState = selectNewestState(remoteState, localBetaState);
        setState(selectedState);

        if (selectedState === localBetaState) {
          await supabase
            .from("app_states")
            .upsert({
              user_id: user.id,
              state: markUpdated(selectedState)
            }, { onConflict: "user_id" });
        }
      } else if (!error) {
        const initialState = localBetaState ?? createBetaAppState({
          userId: user.id,
          email: user.email,
          firstName: getUserMetadataName(user.user_metadata)
        });
        setState(initialState);

        await supabase
          .from("app_states")
          .upsert({
            user_id: user.id,
            state: markUpdated(initialState)
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

    const stateToPersist = markUpdated(state);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));

    if (!isSupabaseConfigured()) {
      return;
    }

    if (!supabaseUserId) return;

    const saveTimeout = window.setTimeout(async () => {
      await persistStateToSupabase(supabaseUserId, stateToPersist);
    }, 500);

    return () => window.clearTimeout(saveTimeout);
  }, [hasHydrated, state, supabaseUserId]);

  const value = useMemo<AppStateContextValue>(() => ({
    state,
    hasHydrated,
    setSelectedDate: (date) => {
      setState((current) => selectDate(current, date));
    },
    goToPreviousWeek: () => {
      setState((current) => selectDate(current, addWeeks(current.weekPlan.startsOn, -1)));
    },
    goToNextWeek: () => {
      setState((current) => selectDate(current, addWeeks(current.weekPlan.startsOn, 1)));
    },
    updateDayPlanningContext: (date, context) => {
      setState((current) => updateDay(current, date, (day) => ({
        ...day,
        context: [context, ...day.context.filter((item) => !isPlanningContext(item))],
        blocks: [
          ...day.blocks.filter((block) => block.type !== "work" && block.type !== "travel" && block.type !== "free"),
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
    removePlanningStandard: (standardId) => {
      setState((current) => ({
        ...current,
        standards: {
          ...current.standards,
          planning: current.standards.planning.filter((standard) => standard.id !== standardId)
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
    addWorkoutStandard: (template) => {
      setState((current) => ({
        ...current,
        standards: {
          ...current.standards,
          workouts: [
            ...current.standards.workouts,
            {
              id: createId("workout-standard"),
              ...template
            }
          ]
        }
      }));
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
    saveWorkoutAsStandard: (date, workoutId) => {
      setState((current) => {
        const stateForDate = selectDate(current, date);
        const day = stateForDate.weekPlan.days.find((item) => item.date === date);
        const workout = day?.workouts.find((item) => item.id === workoutId);
        if (!workout) return current;
        const alreadySaved = stateForDate.standards.workouts.some((template) => (
          template.sport === workout.sport &&
          template.title === workout.title &&
          template.startTime === workout.startTime &&
          template.intensity === workout.intensity
        ));
        if (alreadySaved) return stateForDate;

        return {
          ...stateForDate,
          standards: {
            ...stateForDate.standards,
            workouts: [
              ...stateForDate.standards.workouts,
              workoutToTemplate(workout)
            ]
          }
        };
      });
    },
    removeWorkoutStandard: (templateId) => {
      setState((current) => ({
        ...current,
        standards: {
          ...current.standards,
          workouts: current.standards.workouts.filter((template) => template.id !== templateId)
        }
      }));
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
    saveMealTemplateAsStandard: (mealTemplateId) => {
      setState((current) => ({
        ...current,
        mealTemplates: current.mealTemplates.map((meal) => meal.id === mealTemplateId
          ? { ...meal, isStandard: true }
          : meal)
      }));
    },
    removeMealStandard: (mealTemplateId) => {
      setState((current) => ({
        ...current,
        mealTemplates: current.mealTemplates.map((meal) => meal.id === mealTemplateId
          ? { ...meal, isStandard: false }
          : meal)
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
    removeWeekStandard: (templateId) => {
      setState((current) => ({
        ...current,
        standards: {
          ...current.standards,
          weeks: current.standards.weeks.filter((template) => template.id !== templateId)
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
          ...syncActiveWeek(current, {
            ...current.weekPlan,
            templateName: template.name,
            days
          }),
          selectedDate: days[0]?.date ?? current.selectedDate
        };
      });
    },
    applyCoachPlanChanges: (changes) => {
      if (changes.length === 0) return;

      setState((current) => changes.reduce(applyCoachPlanChange, current));
    },
    updateBaselineCaloriesWithoutActivity: (calories) => {
      setState((current) => ({
        ...current,
        energySettings: {
          ...current.energySettings,
          baselineCaloriesWithoutActivity: normalizeCalories(calories, current.energySettings.baselineCaloriesWithoutActivity)
        }
      }));
    },
    updateManualActivityForecastCalories: (date, calories) => {
      setState((current) => {
        const forecastByDate = { ...current.energySettings.manualActivityForecastCaloriesByDate };
        const normalizedCalories = typeof calories === "number" ? normalizeCalories(calories, 0) : 0;

        if (normalizedCalories > 0) {
          forecastByDate[asIsoDate(date)] = normalizedCalories;
        } else {
          delete forecastByDate[asIsoDate(date)];
        }

        return {
          ...current,
          energySettings: {
            ...current.energySettings,
            manualActivityForecastCaloriesByDate: forecastByDate
          }
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
    saveStateNow: async () => {
      const stateToPersist = markUpdated(state);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));

      if (isSupabaseConfigured() && supabaseUserId) {
        await persistStateToSupabase(supabaseUserId, stateToPersist);
      }
    },
    resetDemoState: () => {
      window.localStorage.removeItem(STORAGE_KEY);
      setState(createInitialAppState());
    },
    resetBetaState: () => {
      setState((current) => {
        const betaState = createBetaAppState({
          userId: supabaseUserId ?? current.profile.id,
          email: supabaseUserEmail,
          firstName: current.profile.firstName
        });

        return {
          ...betaState,
          profile: {
            ...betaState.profile,
            firstName: current.profile.firstName,
            bodyMetrics: current.profile.bodyMetrics,
            primarySports: current.profile.primarySports,
            coachingStyle: current.profile.coachingStyle,
            family: current.profile.family,
            job: current.profile.job,
            raceGoal: current.profile.raceGoal
          },
          goals: current.goals,
          energySettings: current.energySettings
        };
      });
    }
  }), [hasHydrated, state, supabaseUserEmail, supabaseUserId]);

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

async function persistStateToSupabase(userId: string, state: AppState): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("app_states")
    .upsert({
      user_id: userId,
      state
    }, { onConflict: "user_id" });

  if (error) {
    console.warn("Supabase app state could not be saved.", error.message);
  }
}

function createInitialAppState(): AppState {
  if (isSupabaseConfigured()) {
    return createBetaAppState();
  }

  return {
    schemaVersion: 4,
    appMode: "demo",
    profile: clone(demoUserProfile),
    goals: clone(demoUserGoals),
    weekPlan: clone(demoWeekPlan),
    weekPlans: [clone(demoWeekPlan)],
    mealTemplates: clone(demoMealTemplates),
    standards: clone(demoStandards),
    energySettings: createDefaultEnergySettings(),
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
  const weekPlan = parsed.weekPlan ?? fallback.weekPlan;
  const weekPlans = parsed.weekPlans?.length ? parsed.weekPlans : [weekPlan];

  return selectDate({
    schemaVersion: parsed.schemaVersion ?? fallback.schemaVersion,
    appMode: parsed.appMode ?? fallback.appMode,
    updatedAt: parsed.updatedAt,
    profile: normalizeProfile(parsed.profile, fallback.profile),
    goals: parsed.goals ?? fallback.goals,
    weekPlan,
    weekPlans,
    mealTemplates: parsed.mealTemplates ?? fallback.mealTemplates,
    standards: normalizeStandards(parsed.standards, fallback.standards),
    energySettings: normalizeEnergySettings(parsed.energySettings, fallback.energySettings),
    selectedDate: parsed.selectedDate ?? fallback.selectedDate
  }, parsed.selectedDate ?? fallback.selectedDate);
}

function createDefaultEnergySettings(): EnergySettings {
  return {
    baselineCaloriesWithoutActivity: 2700,
    manualActivityForecastCaloriesByDate: {}
  };
}

function normalizeEnergySettings(
  settings: Partial<EnergySettings> | undefined,
  fallback: EnergySettings
): EnergySettings {
  return {
    baselineCaloriesWithoutActivity: normalizeCalories(
      settings?.baselineCaloriesWithoutActivity,
      fallback.baselineCaloriesWithoutActivity
    ),
    manualActivityForecastCaloriesByDate: Object.fromEntries(
      Object.entries(settings?.manualActivityForecastCaloriesByDate ?? {})
        .map(([date, calories]) => [asIsoDate(date), normalizeCalories(calories, 0)] as const)
        .filter(([, calories]) => calories > 0)
    )
  };
}

function normalizeStandards(
  standards: Partial<AppStandards> | undefined,
  fallback: AppStandards
): AppStandards {
  return {
    planning: standards?.planning ?? fallback.planning,
    workouts: standards?.workouts ?? fallback.workouts,
    weeks: standards?.weeks ?? fallback.weeks
  };
}

function selectNewestState(remoteState: AppState, localState: AppState | null): AppState {
  if (!localState) return remoteState;

  const remoteTime = Date.parse(remoteState.updatedAt ?? "");
  const localTime = Date.parse(localState.updatedAt ?? "");

  if (Number.isFinite(localTime) && (!Number.isFinite(remoteTime) || localTime > remoteTime)) {
    return localState;
  }

  return remoteState;
}

function markUpdated(state: AppState): AppState {
  return {
    ...state,
    updatedAt: new Date().toISOString()
  };
}

function normalizeCalories(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(",", "."));

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(0, Math.round(parsed));
}

function updateDay(state: AppState, date: string, updater: (day: DayPlan) => DayPlan): AppState {
  const stateForDate = selectDate(state, date);
  const weekPlan = {
    ...stateForDate.weekPlan,
    days: stateForDate.weekPlan.days.map((day) => day.date === date ? updater(day) : day)
  };

  return syncActiveWeek(stateForDate, weekPlan);
}

function selectDate(state: AppState, date: string): AppState {
  const selectedDate = asIsoDate(date);
  const weekStart = startOfWeek(selectedDate);
  const weekPlan = state.weekPlans.find((week) => week.startsOn === weekStart)
    ?? createEmptyWeekPlan(selectedDate);

  return {
    ...syncActiveWeek(state, weekPlan),
    selectedDate
  };
}

function syncActiveWeek(state: AppState, weekPlan: WeekPlan): AppState {
  return {
    ...state,
    weekPlan,
    weekPlans: upsertWeekPlan(state.weekPlans, weekPlan)
  };
}

function upsertWeekPlan(weekPlans: WeekPlan[], weekPlan: WeekPlan): WeekPlan[] {
  const nextWeekPlans = [
    ...weekPlans.filter((week) => week.startsOn !== weekPlan.startsOn),
    weekPlan
  ];

  return nextWeekPlans.sort((left, right) => left.startsOn.localeCompare(right.startsOn));
}

function normalizeProfile(profile: AppState["profile"] | undefined, fallback: AppState["profile"]): AppState["profile"] {
  const fallbackFamily = fallback.family ?? {
    situation: "with_children" as const,
    childrenCount: 2,
    careResponsibility: "medium" as const,
    notes: ""
  };
  const fallbackJob = fallback.job ?? {
    title: "Wissensarbeit",
    workPattern: "hybrid" as const,
    workload: "variable" as const,
    commuteMinutes: 30,
    notes: ""
  };

  return {
    ...fallback,
    ...profile,
    bodyMetrics: {
      ...fallback.bodyMetrics,
      ...profile?.bodyMetrics
    },
    primarySports: profile?.primarySports ?? fallback.primarySports,
    family: {
      ...fallbackFamily,
      ...profile?.family
    },
    job: {
      ...fallbackJob,
      ...profile?.job
    }
  };
}

function applyCoachPlanChange(state: AppState, change: CoachPlanChange): AppState {
  if (change.type === "move_workout") {
    return moveWorkout(state, change);
  }

  const stateForDate = selectDate(state, change.date);

  if (change.type === "set_day_context") {
    return updateDay(stateForDate, change.date, (day) => ({
      ...day,
      context: [change.context, ...day.context.filter((item) => !isPlanningContext(item))],
      blocks: [
        ...day.blocks.filter((block) => block.type !== "work" && block.type !== "travel" && block.type !== "free"),
        createPlanningContextBlock(change.context)
      ]
    }));
  }

  if (change.type === "add_extra_info") {
    const extraInfo: PlanningExtraInfo = {
      id: createId("coach-info"),
      label: change.label,
      impact: change.impact ?? createCoachExtraInfoImpact(change.label),
      type: change.blockType ?? inferExtraInfoBlockType(change.label),
      context: change.context
    };

    return updateDay(stateForDate, change.date, (day) => ({
      ...day,
      context: extraInfo.context && !day.context.includes(extraInfo.context)
        ? [...day.context, extraInfo.context]
        : day.context,
      blocks: [...day.blocks, planningExtraInfoToBlock(extraInfo)]
    }));
  }

  if (change.type === "add_workout") {
    const workout = createWorkoutFromDraft(change.date, normalizeCoachWorkout(change.workout));
    const nextState = updateDay(stateForDate, change.date, (day) => ({
      ...day,
      workouts: [...day.workouts, workout],
      blocks: [...day.blocks, createWorkoutBlock(workout)]
    }));

    if (!change.saveAsStandard) return nextState;

    return {
      ...nextState,
      standards: {
        ...nextState.standards,
        workouts: [...nextState.standards.workouts, workoutToTemplate(workout)]
      }
    };
  }

  if (change.type === "add_meal") {
    return applyCoachMealChange(stateForDate, change.date, change.meal);
  }

  return stateForDate;
}

function moveWorkout(state: AppState, change: Extract<CoachPlanChange, { type: "move_workout" }>): AppState {
  const sourceState = selectDate(state, change.fromDate);
  const sourceDay = sourceState.weekPlan.days.find((day) => day.date === change.fromDate);
  const workout = sourceDay?.workouts.find((item) => (
    change.workoutId ? item.id === change.workoutId : change.sport ? item.sport === change.sport : true
  ));

  if (!workout) return sourceState;

  const movedWorkout = {
    ...workout,
    id: createId(workout.sport),
    date: change.toDate
  };
  const removedState = updateDay(sourceState, change.fromDate, (day) => ({
    ...day,
    workouts: day.workouts.filter((item) => item.id !== workout.id),
    blocks: day.blocks.filter((block) => block.label !== workout.title)
  }));

  return updateDay(removedState, change.toDate, (day) => ({
    ...day,
    workouts: [...day.workouts, movedWorkout],
    blocks: [...day.blocks, createWorkoutBlock(movedWorkout)]
  }));
}

function normalizeCoachWorkout(workout: CoachWorkoutDraft): WorkoutDraft {
  return {
    sport: workout.sport,
    title: workout.title,
    startTime: workout.startTime,
    durationMinutes: workout.durationMinutes,
    distanceKm: workout.sport === "running" ? workout.distanceKm : undefined,
    status: workout.status ?? "planned",
    intensity: workout.intensity ?? "moderate",
    runningType: workout.sport === "running" ? workout.runningType : undefined,
    runningFocus: workout.sport === "running" ? workout.runningFocus : undefined,
    description: workout.description ?? createCoachWorkoutDescription(workout)
  };
}

function applyCoachMealChange(state: AppState, date: IsoDate, mealDraft: CoachMealDraft): AppState {
  const meal = createMealTemplate({
    name: mealDraft.name,
    description: mealDraft.description,
    caloriesMin: mealDraft.caloriesMin ?? 350,
    caloriesMax: mealDraft.caloriesMax ?? 650,
    proteinMin: mealDraft.proteinMin ?? 25,
    proteinMax: mealDraft.proteinMax ?? 45,
    tags: mealDraft.tags ?? ["coach"]
  }, mealDraft.saveAsStandard ?? false);
  const nextState = {
    ...state,
    mealTemplates: [...state.mealTemplates, meal]
  };

  return updateDay(nextState, date, (day) => ({
    ...day,
    mealPlan: [
      ...day.mealPlan,
      {
        time: mealDraft.time,
        role: mealDraft.role,
        mealTemplateId: meal.id
      }
    ].sort((a, b) => a.time.localeCompare(b.time)),
    blocks: [
      ...day.blocks,
      {
        id: createId("coach-nutrition"),
        type: "nutrition",
        label: mealDraft.name,
        impact: mealDraft.description
      }
    ]
  }));
}

function isPlanningContext(context: DayContext): context is PlanningContext {
  return context === "homeoffice" ||
    context === "office" ||
    context === "travel" ||
    context === "free" ||
    context === "vacation";
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
    runningType: template.runningType,
    runningFocus: template.runningFocus,
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
    runningType: workout.runningType,
    runningFocus: workout.runningFocus,
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

function inferExtraInfoBlockType(label: string): DayBlock["type"] {
  const normalized = label.toLowerCase();

  if (normalized.includes("restaurant") || normalized.includes("biergarten") || normalized.includes("essen")) {
    return "restaurant";
  }

  if (normalized.includes("freund") || normalized.includes("familie") || normalized.includes("treffen")) {
    return "family";
  }

  if (normalized.includes("ruhe") || normalized.includes("erholung") || normalized.includes("schlaf")) {
    return "recovery";
  }

  return "planning";
}

function createCoachExtraInfoImpact(label: string): string {
  const type = inferExtraInfoBlockType(label);

  if (type === "restaurant") return `${label}: tagsüber Protein und einfache Standards sichern`;
  if (type === "family") return `${label}: Training und Hauptmahlzeit realistisch platzieren`;
  if (type === "recovery") return `${label}: Belastung und Defizit vorsichtig steuern`;

  return `${label}: im Tagesbriefing berücksichtigen`;
}

function createCoachWorkoutDescription(workout: CoachWorkoutDraft): string {
  if (workout.sport === "running") {
    if (workout.runningType === "intervals") return "Qualitätseinheit, Fueling vorher sichern";
    if (workout.runningType === "tempo_run") return "Temporeiz, nicht nüchtern erzwingen";
    if (workout.runningType === "fartlek") return "Spiel mit Tempo, Belastung bewusst steuern";

    return "Ruhiger Lauf, Energie vorher und danach passend halten";
  }

  if (workout.sport === "strength") return "Kraftreiz, Protein in der nächsten Mahlzeit";
  if (workout.sport === "hiit") return "Intensitätsreiz, Erholung danach ernst nehmen";
  if (workout.sport === "padel" || workout.sport === "squash") return "Spielbelastung, Flüssigkeit und Abendessen mitdenken";
  if (workout.sport === "swimming" || workout.sport === "cycling") return "Ausdauereinheit im Wochenkontext";

  return "Geplante Einheit im Wochenkontext";
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
    description: description?.trim() || "Aus der aktuellen Woche gespeichert.",
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
  if (day.context.includes("vacation")) return "vacation";
  if (day.context.includes("free")) return "free";
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

function getUserMetadataName(metadata: Record<string, unknown> | null | undefined): string | undefined {
  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === "string" && fullName.trim()) return fullName.trim().split(" ")[0];
  if (typeof name === "string" && name.trim()) return name.trim().split(" ")[0];

  return undefined;
}
