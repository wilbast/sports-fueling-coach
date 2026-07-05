"use client";

import { useEffect, useMemo } from "react";
import { createDailyBriefing } from "@/domain/briefing/create-daily-briefing";
import { getDayPlanByDate } from "@/domain/planning/week";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { TodayView } from "@/features/today/today-view";

type TodayPageClientProps = {
  date?: string;
};

export function TodayPageClient({ date }: TodayPageClientProps) {
  const { state, setSelectedDate } = useAppState();
  const activeDate = date ?? state.selectedDate;
  const dayPlan = getDayPlanByDate(state.weekPlan, activeDate);

  useEffect(() => {
    if (date && date !== state.selectedDate) {
      setSelectedDate(date);
    }
  }, [date, setSelectedDate, state.selectedDate]);

  const briefing = useMemo(() => createDailyBriefing({
    profile: state.profile,
    goals: state.goals,
    dayPlan,
    mealTemplates: state.mealTemplates
  }), [dayPlan, state.goals, state.mealTemplates, state.profile]);

  return <TodayView briefing={briefing} calendar={<WeekCalendar />} />;
}
