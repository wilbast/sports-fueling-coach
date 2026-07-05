"use client";

import { ArrowDownRight, BarChart3, Info, Target } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import { getWeekTrainingLoad } from "@/domain/planning/week";
import type { WeekPlan } from "@/domain/planning/types";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";

export function InsightsView() {
  const { state } = useAppState();
  const insights = createInsights(state.weekPlan);
  const currentWeight = state.profile.bodyMetrics.weightKg;
  const targetWeight = state.profile.bodyMetrics.targetWeightKg ?? currentWeight;
  const weightDelta = currentWeight - targetWeight;

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Einordnung statt Zahlenwand"
        description="Training und Zielkontext werden aus dem lokalen Plan abgeleitet."
      />

      <WeekCalendar />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard label="Laufumfang" value={`${insights.runningKm} km`} detail="aktive Laufplanung" />
        <InsightCard label="Harte Einheiten" value={`${insights.hardSessions}`} detail="Qualitätsbelastung" />
        <InsightCard label="Trainingsbelastung" value={insights.trainingLoad} detail={`${insights.runningKm} km Laufen geplant`} />
        <InsightCard label="Zielgewicht" value={`${formatNumber(weightDelta)} kg`} detail="Differenz zum Ziel" trend={weightDelta > 0} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
