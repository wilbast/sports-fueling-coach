import { createDailyBriefing } from "@/domain/briefing/create-daily-briefing";
import type { DailyBriefing } from "@/domain/briefing/types";
import { getDayPlanByDate } from "@/domain/planning/week";
import { demoMealTemplates } from "@/data/mock/nutrition";
import { demoWeekPlan } from "@/data/mock/planning";
import { demoUserGoals, demoUserProfile } from "@/data/mock/profile";

export function getDemoDailyBriefing(date?: string): DailyBriefing {
  return createDailyBriefing({
    profile: demoUserProfile,
    goals: demoUserGoals,
    dayPlan: getDayPlanByDate(demoWeekPlan, date),
    mealTemplates: demoMealTemplates
  });
}
