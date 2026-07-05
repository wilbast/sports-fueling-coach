"use client";

import { useEffect, useMemo } from "react";
import { createDailyBriefing } from "@/domain/briefing/create-daily-briefing";
import { getDayPlanByDate } from "@/domain/planning/week";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { useExternalActivities } from "@/features/activities/external-activities";
import { TodayView } from "@/features/today/today-view";
import { QuickFuelingPanel } from "@/features/fueling/quick-fueling-panel";

type TodayPageClientProps = {
  date?: string;
};

export function TodayPageClient({ date }: TodayPageClientProps) {
  const { state, setSelectedDate, updateManualDailyBurnForecastCalories } = useAppState();
  const activeDate = date ?? state.selectedDate;
  const dayPlan = getDayPlanByDate(state.weekPlan, activeDate);
  const {
    activitiesByDate,
    isLoading: activitiesLoading,
    error: activitiesError
  } = useExternalActivities(activeDate, activeDate);

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

  return (
    <TodayView
      briefing={briefing}
      calendar={<WeekCalendar />}
      externalActivities={activitiesByDate[activeDate] ?? []}
      externalActivitiesLoading={activitiesLoading}
      externalActivitiesError={activitiesError}
      manualForecastCalories={state.energySettings.manualDailyBurnForecastCaloriesByDate[activeDate]}
      onManualForecastCaloriesChange={(calories) => updateManualDailyBurnForecastCalories(activeDate, calories)}
      fuelingQuickAdd={<QuickFuelingPanel date={activeDate} compact />}
    />
  );
}
