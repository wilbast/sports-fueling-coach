"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, BarChart3, Info, Target } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import { createDailyBriefing } from "@/domain/briefing/create-daily-briefing";
import { createDailyNutritionSummary, type MealLog } from "@/domain/nutrition/logs";
import { getWeekTrainingLoad } from "@/domain/planning/week";
import type { WeekPlan } from "@/domain/planning/types";
import type { ExternalActivitySummary } from "@/features/activities/external-activities";
import { useExternalActivities } from "@/features/activities/external-activities";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import type { AppState } from "@/features/app-state/app-state-provider";
import { useAppState } from "@/features/app-state/app-state-provider";
import { CoachRecommendationButton } from "@/features/coach/coach-recommendation-button";

export function InsightsView() {
  const { state } = useAppState();
  const insights = createInsights(state.weekPlan);
  const weekStart = state.weekPlan.days[0]?.date ?? state.selectedDate;
  const weekEnd = state.weekPlan.days[state.weekPlan.days.length - 1]?.date ?? state.selectedDate;
  const { activitiesByDate } = useExternalActivities(weekStart, weekEnd);
  const weekLogs = useWeekMealLogs(state.weekPlan.days.map((day) => day.date));
  const planVsActual = useMemo(() => createPlanVsActual(state, activitiesByDate, weekLogs.logs), [activitiesByDate, state, weekLogs.logs]);
  const currentWeight = state.profile.bodyMetrics.weightKg;
  const targetWeight = state.profile.bodyMetrics.targetWeightKg ?? currentWeight;
  const weightDelta = currentWeight - targetWeight;

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Plan vs. Ist"
        description="Training, Fueling und Zielwerte werden pro Tag und Woche gegenübergestellt."
        action={
          <CoachRecommendationButton
            pageContext="insights"
            prompt="Gib mir eine kurze Auswertung der aktuellen Plan-vs-Ist-Daten: wichtigste Abweichung, Lernpunkt und nächste sinnvolle Anpassung. Keine Planänderung."
            label="KI-Empfehlung"
          />
        }
      />

      <WeekCalendar />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard label="Training" value={`${planVsActual.week.trainingActual}/${planVsActual.week.trainingPlanned}`} detail="durchgeführt / geplant" />
        <InsightCard label="Kalorien" value={`${planVsActual.week.caloriesActual}`} detail={`von ca. ${planVsActual.week.caloriesTarget} kcal Ziel`} />
        <InsightCard label="Protein" value={`${planVsActual.week.proteinActual} g`} detail={`von ca. ${planVsActual.week.proteinTarget} g Ziel`} />
        <InsightCard label="Trainingsbelastung" value={insights.trainingLoad} detail={`${insights.runningKm} km Laufen geplant`} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Tage im Vergleich</h2>
            <Pill tone="blue">{planVsActual.days.length} Tage</Pill>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-3 py-2">Tag</th>
                  <th className="px-3 py-2">Training</th>
                  <th className="px-3 py-2">Ernährung</th>
                  <th className="px-3 py-2">Kalorien</th>
                  <th className="px-3 py-2">Protein</th>
                  <th className="px-3 py-2">Carbs</th>
                </tr>
              </thead>
              <tbody>
                {planVsActual.days.map((day) => (
                  <tr key={day.date} className="border-t border-line">
                    <td className="px-3 py-3 font-semibold text-ink">{formatWeekday(day.date)}</td>
                    <td className="px-3 py-3 text-muted">{day.trainingActual}/{day.trainingPlanned}</td>
                    <td className="px-3 py-3 text-muted">{day.mealsActual}/{day.mealsPlanned}</td>
                    <td className="px-3 py-3 text-muted">{day.caloriesActual}/{day.caloriesTarget}</td>
                    <td className="px-3 py-3 text-muted">{day.proteinActual}/{day.proteinTarget} g</td>
                    <td className="px-3 py-3 text-muted">{day.carbsActual}/{day.carbsTarget} g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Wocheninterpretation</h2>
            <Pill tone={insights.trainingLoad === "hoch" ? "amber" : "green"}>
              {insights.trainingLoad}
            </Pill>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {insights.interpretation}
          </p>
          <div className="mt-5 grid gap-3">
            <ProgressRow label="Laufen" value={insights.runningKmRaw} max={45} suffix="km" />
            <ProgressRow label="Harte Einheiten" value={insights.hardSessions} max={3} suffix="" />
            <ProgressRow label="Aktive Einheiten" value={insights.activeWorkoutCount} max={8} suffix="" />
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-3">
            <Info className="mt-1 h-5 w-5 shrink-0 text-coach-600" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-ink">Warum diese Empfehlung?</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {insights.runningKmRaw >= 35
                  ? "Die Laufwoche ist umfangreich. Die App sollte Defizit und Trainingsqualität gegeneinander abwägen und Carbs an den Lauftagen schützen."
                  : "Die Trainingswoche bleibt kontrollierbar. Fueling sollte täglich aus Training, Hunger, Alltag und Coach-Dialog nachgezogen werden."}
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-coach-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Wettkampfkontext</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-canvas px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Ziel</p>
              <p className="mt-2 font-semibold text-ink">{state.profile.raceGoal?.name ?? "kein Ziel"}</p>
            </div>
            <div className="rounded-xl bg-canvas px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Distanz</p>
              <p className="mt-2 font-semibold text-ink">{state.profile.raceGoal?.distanceKm ?? "-"} km</p>
            </div>
            <div className="rounded-xl bg-canvas px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Zielzeit</p>
              <p className="mt-2 font-semibold text-ink">{state.profile.raceGoal?.targetTime ?? "-"}</p>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Gewicht</h2>
            <Pill tone={weightDelta > 0 ? "amber" : "green"}>{`${formatNumber(weightDelta)} kg zum Ziel`}</Pill>
          </div>
          <p className="text-sm leading-6 text-muted">
            Aktuell ist nur der Profilwert verfügbar. Ein echter Trend braucht regelmäßige Gewichtseinträge als normalisierte Historie.
          </p>
        </Panel>
      </div>
    </div>
  );
}

type InsightCardProps = {
  label: string;
  value: string;
  detail: string;
  trend?: boolean;
};

function InsightCard({ label, value, detail, trend }: InsightCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <BarChart3 className="h-5 w-5 text-coach-600" aria-hidden="true" />
        {trend ? <ArrowDownRight className="h-5 w-5 text-coach-600" aria-hidden="true" /> : null}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-5 text-muted">{detail}</p>
    </article>
  );
}

type ProgressRowProps = {
  label: string;
  value: number;
  max: number;
  suffix: string;
};

function ProgressRow({ label, value, max, suffix }: ProgressRowProps) {
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted">{formatNumber(value)}{suffix ? ` ${suffix}` : ""}</span>
      </div>
      <div className="h-2 rounded-full bg-line">
        <div className="h-2 rounded-full bg-coach-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function createInsights(weekPlan: WeekPlan) {
  const workouts = weekPlan.days.flatMap((day) => day.workouts).filter((workout) => workout.status !== "cancelled");
  const runningKmRaw = workouts
    .filter((workout) => workout.sport === "running")
    .reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0);
  const hardSessions = workouts.filter((workout) => workout.intensity === "hard").length;
  const trainingLoad = getWeekTrainingLoad(weekPlan);

  return {
    runningKmRaw,
    runningKm: formatNumber(runningKmRaw),
    hardSessions,
    activeWorkoutCount: workouts.length,
    trainingLoad,
    interpretation: createInterpretation(trainingLoad, runningKmRaw, hardSessions)
  };
}

function createPlanVsActual(
  state: AppState,
  activitiesByDate: Record<string, ExternalActivitySummary[]>,
  logs: MealLog[]
) {
  const logsByDate = logs.reduce<Record<string, MealLog[]>>((groups, log) => {
    groups[log.date] = [...(groups[log.date] ?? []), log];

    return groups;
  }, {});

  const days = state.weekPlan.days.map((day) => {
    const briefing = createDailyBriefing({
      profile: state.profile,
      goals: state.goals,
      dayPlan: day,
      mealTemplates: state.mealTemplates,
      actualActivities: activitiesByDate[day.date] ?? [],
      energySettings: state.energySettings
    });
    const nutritionSummary = createDailyNutritionSummary(logsByDate[day.date] ?? [], briefing.nutritionTarget);
    const trainingPlanned = day.workouts.filter((workout) => workout.status !== "cancelled").length;
    const trainingActual = activitiesByDate[day.date]?.length ?? 0;

    return {
      date: day.date,
      trainingPlanned,
      trainingActual,
      mealsPlanned: day.mealPlan.length,
      mealsActual: logsByDate[day.date]?.length ?? 0,
      caloriesActual: nutritionSummary.intake.calories,
      caloriesTarget: nutritionSummary.targets.caloriesMax,
      proteinActual: nutritionSummary.intake.proteinGrams,
      proteinTarget: nutritionSummary.targets.proteinMin,
      carbsActual: nutritionSummary.intake.carbohydrateGrams,
      carbsTarget: nutritionSummary.targets.carbsMin
    };
  });

  return {
    days,
    week: days.reduce((sum, day) => ({
      trainingPlanned: sum.trainingPlanned + day.trainingPlanned,
      trainingActual: sum.trainingActual + day.trainingActual,
      mealsPlanned: sum.mealsPlanned + day.mealsPlanned,
      mealsActual: sum.mealsActual + day.mealsActual,
      caloriesActual: sum.caloriesActual + day.caloriesActual,
      caloriesTarget: sum.caloriesTarget + day.caloriesTarget,
      proteinActual: sum.proteinActual + day.proteinActual,
      proteinTarget: sum.proteinTarget + day.proteinTarget,
      carbsActual: sum.carbsActual + day.carbsActual,
      carbsTarget: sum.carbsTarget + day.carbsTarget
    }), {
      trainingPlanned: 0,
      trainingActual: 0,
      mealsPlanned: 0,
      mealsActual: 0,
      caloriesActual: 0,
      caloriesTarget: 0,
      proteinActual: 0,
      proteinTarget: 0,
      carbsActual: 0,
      carbsTarget: 0
    })
  };
}

function useWeekMealLogs(dates: string[]) {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const datesKey = dates.join("|");

  useEffect(() => {
    let cancelled = false;
    const selectedDates = datesKey.split("|").filter(Boolean);

    async function loadLogs() {
      try {
        const results = await Promise.all(selectedDates.map(async (date) => {
          const response = await fetch(`/api/nutrition/logs?date=${encodeURIComponent(date)}`);
          const result = await response.json() as { logs?: MealLog[] };

          return response.ok ? result.logs ?? [] : [];
        }));

        if (!cancelled) setLogs(results.flat());
      } catch {
        if (!cancelled) setLogs([]);
      }
    }

    if (selectedDates.length > 0) {
      void loadLogs();
    }

    return () => {
      cancelled = true;
    };
  }, [datesKey]);

  return { logs };
}

function createInterpretation(trainingLoad: "niedrig" | "mittel" | "hoch", runningKm: number, hardSessions: number): string {
  if (trainingLoad === "hoch") {
    return `Mit ${formatNumber(runningKm)} km und ${hardSessions} harter Einheit ist die Woche trainingsrelevant. Fueling sollte an Lauf- und Qualitätstagen Vorrang vor einem aggressiven Defizit haben.`;
  }

  if (hardSessions > 0) {
    return "Die Trainingslast ist kontrollierbar, aber Qualitätstage brauchen bewusstes Fueling. Die konkrete Essensplanung sollte nicht im Wochenplan festgezurrt werden.";
  }

  return "Die Woche ist ruhig genug für Gewichtsmanagement, solange Training und Tagesenergie nicht gegeneinander arbeiten.";
}

function formatNumber(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}
