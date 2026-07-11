"use client";

import { ChefHat, Dumbbell, Sparkles, Utensils } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import { getDayPlanByDate } from "@/domain/planning/week";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { CoachChatPanel } from "@/features/coach/coach-chat-panel";

export function CoachView() {
  const { state } = useAppState();
  const selectedDay = getDayPlanByDate(state.weekPlan, state.selectedDate);
  const plannedWorkouts = state.weekPlan.days.flatMap((day) => day.workouts);
  const plannedMeals = state.weekPlan.days.flatMap((day) => day.mealPlan);

  return (
    <div>
      <PageHeader
        eyebrow="Coach"
        title="Fragen, einordnen, übernehmen"
        description="Der Coach nutzt Profil, Ziele, Training, Fueling, Standards und aktuelle Planung für konkrete Empfehlungen."
      />

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <Panel>
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 text-coach-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">Aktueller Tag</p>
              <p className="mt-1 text-sm text-muted">{formatDate(selectedDay.date)} · {selectedDay.focus}</p>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-start gap-3">
            <Dumbbell className="mt-1 h-5 w-5 text-coach-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">Trainingskontext</p>
              <p className="mt-1 text-sm text-muted">{plannedWorkouts.length} Einheiten in der Woche</p>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-start gap-3">
            <Utensils className="mt-1 h-5 w-5 text-coach-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">Fueling-Kontext</p>
              <p className="mt-1 text-sm text-muted">{plannedMeals.length} Mahlzeiten geplant · {state.mealTemplates.length} Standards</p>
            </div>
          </div>
        </Panel>
      </section>

      <details className="mb-6 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Wocheninformationen</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Coach-Kontext der Woche</h2>
          </div>
          <Pill tone="blue">{plannedWorkouts.length} Einheiten</Pill>
        </summary>

        <div className="mt-5">
          <WeekCalendar />
        </div>
      </details>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.48fr]">
        <CoachChatPanel pageContext="coach" />

        <div className="grid content-start gap-6">
          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <ChefHat className="h-5 w-5 text-coach-600" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Gute Fragen</h2>
            </div>
            <div className="grid gap-2">
              {[
                "Was soll ich heute vor dem Training essen?",
                "Gib mir ein schnelles Rezept mit viel Protein.",
                "Wie sollte ich diese Laufwoche steuern?",
                "Was ist die beste Fueling-Strategie für den langen Lauf?"
              ].map((question) => (
                <div key={question} className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
                  {question}
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Übernahme</h2>
              <Pill tone="green">Training & Fueling</Pill>
            </div>
            <p className="text-sm leading-6 text-muted">
              Vorschläge bleiben Empfehlungen, bis du sie übernimmst. Dann landen sie direkt in Training oder Fueling der aktuellen Woche.
            </p>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date(`${date}T12:00:00`));
}
