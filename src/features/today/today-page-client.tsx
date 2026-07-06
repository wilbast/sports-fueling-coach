"use client";

import { useEffect, useMemo } from "react";
import { createDailyBriefing } from "@/domain/briefing/create-daily-briefing";
import { getDayPlanByDate } from "@/domain/planning/week";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { useExternalActivities } from "@/features/activities/external-activities";
import { TodayView } from "@/features/today/today-view";
import { QuickFuelingPanel } from "@/features/fueling/quick-fueling-panel";
import { createDailyNutritionSummary } from "@/domain/nutrition/logs";
import { useNutritionLogs } from "@/features/nutrition/use-nutrition-logs";

type TodayPageClientProps = {
  date?: string;
};

export function TodayPageClient({ date }: TodayPageClientProps) {
  const { state, setSelectedDate, updateManualDailyBurnForecastCalories } = useAppState();
  const activeDate = date ?? state.selectedDate;
  const dayPlan = getDayPlanByDate(state.weekPlan, activeDate);
  const tomorrowDate = addDays(activeDate, 1);
  const tomorrowPlan = state.weekPlans
    .flatMap((week) => week.days)
    .find((day) => day.date === tomorrowDate);
  const {
    activitiesByDate,
    isLoading: activitiesLoading,
    error: activitiesError
  } = useExternalActivities(activeDate, activeDate);
  const {
    logs: nutritionLogs,
    isLoading: nutritionLogsLoading,
    error: nutritionLogsError,
    updateLog,
    deleteLog
  } = useNutritionLogs(activeDate);

  useEffect(() => {
    if (date && date !== state.selectedDate) {
      setSelectedDate(date);
    }
  }, [date, setSelectedDate, state.selectedDate]);

  const briefing = useMemo(() => createDailyBriefing({
    profile: state.profile,
    goals: state.goals,
    dayPlan,
    mealTemplates: state.mealTemplates,
    actualActivities: activitiesByDate[activeDate] ?? [],
    energySettings: state.energySettings
  }), [activitiesByDate, activeDate, dayPlan, state.energySettings, state.goals, state.mealTemplates, state.profile]);
  const nutritionSummary = useMemo(
    () => createDailyNutritionSummary(nutritionLogs, briefing.nutritionTarget),
    [briefing.nutritionTarget, nutritionLogs]
  );

  return (
    <TodayView
      briefing={briefing}
      calendar={<WeekCalendar />}
      externalActivities={activitiesByDate[activeDate] ?? []}
      externalActivitiesLoading={activitiesLoading}
      externalActivitiesError={activitiesError}
      nutritionLogs={nutritionLogs}
      nutritionSummary={nutritionSummary}
      nutritionLogsLoading={nutritionLogsLoading}
      nutritionLogsError={nutritionLogsError}
      onNutritionLogUpdate={updateLog}
      onNutritionLogDelete={deleteLog}
      tomorrowHint={createTomorrowHint(tomorrowPlan)}
      manualForecastCalories={state.energySettings.manualDailyBurnForecastCaloriesByDate[activeDate]}
      onManualForecastCaloriesChange={(calories) => updateManualDailyBurnForecastCalories(activeDate, calories)}
      fuelingQuickAdd={<QuickFuelingPanel date={activeDate} compact />}
    />
  );
}

function addDays(date: string, days: number): string {
  const nextDate = new Date(`${date}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate.toISOString().slice(0, 10);
}

function createTomorrowHint(day: ReturnType<typeof getDayPlanByDate> | undefined): string {
  if (!day) return "Morgen ist noch nicht geplant. Ein kurzer Blick in die Planung kann den Coach-Kontext verbessern.";
  const workout = day.workouts.find((item) => item.status !== "cancelled");
  if (!workout) return "Morgen ist kein Training geplant. Heute kannst du den Abend ruhig halten und Protein sichern.";
  if (workout.sport === "running" && (workout.distanceKm ?? 0) >= 12) return "Morgen langer Lauf - heute Abend Kohlenhydrate und Flüssigkeit nicht zu knapp halten.";

  return `Morgen steht ${workout.title} an - heute Abend normal essen, Schlaf und Flüssigkeit priorisieren.`;
}
