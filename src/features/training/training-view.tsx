"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bike, BookmarkPlus, CircleDot, Dumbbell, Footprints, Plus, Waves, X, Zap } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import { getDayPlanByDate } from "@/domain/planning/week";
import {
  describeWorkoutType,
  intensityLabels,
  intensityOptions,
  runningFocusOptions,
  runningTypeOptions,
  sportOptions
} from "@/domain/training/catalog";
import type {
  RunningFocus,
  RunningWorkoutType,
  SportType,
  WorkoutIntensity,
  WorkoutPlan,
  WorkoutStatus
} from "@/domain/training/types";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";

const statusLabels: Record<WorkoutStatus, string> = {
  planned: "geplant",
  optional: "optional",
  completed: "erledigt",
  cancelled: "gestrichen"
};

export function TrainingView() {
  const { state, setSelectedDate, addWorkout, applyWorkoutStandard, updateWorkoutStatus, removeWorkout } = useAppState();
  const selectedDay = getDayPlanByDate(state.weekPlan, state.selectedDate);
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState<SportType>("running");
  const [startTime, setStartTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [distanceKm, setDistanceKm] = useState("");
  const [intensity, setIntensity] = useState<WorkoutIntensity>("easy");
  const [runningType, setRunningType] = useState<RunningWorkoutType>("easy_run");
  const [runningFocus, setRunningFocus] = useState<RunningFocus>("base");
  const [saveAsStandard, setSaveAsStandard] = useState(false);
  const [selectedStandardId, setSelectedStandardId] = useState(state.standards.workouts[0]?.id ?? "");
  const workouts = useMemo(() => state.weekPlan.days.flatMap((day) => day.workouts), [state.weekPlan.days]);
  const activeWorkouts = workouts.filter((workout) => workout.status !== "cancelled");
  const runningKm = activeWorkouts
    .filter((workout) => workout.sport === "running")
    .reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0);
  const hardSessions = activeWorkouts.filter((workout) => workout.intensity === "hard").length;

  useEffect(() => {
    if (!selectedStandardId && state.standards.workouts[0]) {
      setSelectedStandardId(state.standards.workouts[0].id);
    }
  }, [selectedStandardId, state.standards.workouts]);

  function submitWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    addWorkout(selectedDay.date, {
      sport,
      title: trimmedTitle,
      startTime: startTime || undefined,
      durationMinutes: parseOptionalNumber(durationMinutes),
      distanceKm: sport === "running" ? parseOptionalNumber(distanceKm) : undefined,
      status: "planned",
      intensity,
      runningType: sport === "running" ? runningType : undefined,
      runningFocus: sport === "running" ? runningFocus : undefined,
      description: createDescription(sport, intensity, runningType, runningFocus)
    }, { saveAsStandard });
    setTitle("");
    setDistanceKm("");
    setSaveAsStandard(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Training"
        title="Training planen"
        description="Geplante Einheiten liefern den Kontext für Energie, Protein, Kohlenhydrate und Erholung."
      />

      <WeekCalendar />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Laufumfang</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{roundOne(runningKm)} km</p>
          <p className="mt-2 text-sm text-muted">aktive Laufeinheiten diese Woche</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Qualität</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{hardSessions}</p>
          <p className="mt-2 text-sm text-muted">harte Einheiten</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Ausgewählter Tag</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{formatShortDate(selectedDay.date)}</p>
          <p className="mt-2 text-sm text-muted">{selectedDay.focus}</p>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <div className="grid gap-3">
          {state.weekPlan.days.map((day) => (
            <div key={day.date} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
              <button
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className="mb-3 flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <p className="font-semibold text-ink">{formatLongDate(day.date)}</p>
                  <p className="mt-1 text-sm text-muted">{day.focus}</p>
                </div>
                <Pill tone={day.date === selectedDay.date ? "green" : "neutral"}>
                  {day.workouts.length} Einheiten
                </Pill>
              </button>

              <div className="grid gap-2">
                {day.workouts.length === 0 ? (
                  <div className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">Ruhetag</div>
                ) : day.workouts.map((workout) => (
                  <WorkoutRow
                    key={workout.id}
                    workout={workout}
                    onStatus={(status) => updateWorkoutStatus(day.date, workout.id, status)}
                    onRemove={() => removeWorkout(day.date, workout.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 content-start">
          <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Trainingsstandards</h2>
              <Pill tone="green">{state.standards.workouts.length} Vorlagen</Pill>
            </div>

            {state.standards.workouts.length === 0 ? (
              <div className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
                Noch keine Trainingsstandards. Speichere die nächste echte Einheit als Standard.
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <select
                    value={selectedStandardId}
                    onChange={(event) => setSelectedStandardId(event.target.value)}
                    className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                    aria-label="Trainingsstandard auswählen"
                  >
                    {state.standards.workouts.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => applyWorkoutStandard(selectedDay.date, selectedStandardId)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Beim Tag einfügen
                  </button>
                </div>

                <div className="mt-4 grid gap-2">
                  {state.standards.workouts.slice(0, 4).map((template) => (
                    <div key={template.id} className="rounded-xl bg-canvas px-3 py-3">
                      <p className="text-sm font-semibold text-ink">{template.name}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {describeWorkoutType(template)} · {template.startTime ?? "flexibel"} · {intensityLabels[template.intensity]}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold text-ink">Einheit hinzufügen</h2>
            <form onSubmit={submitWorkout} className="mt-4 grid gap-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="z. B. 8 km locker"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Trainingstitel"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={sport}
                  onChange={(event) => setSport(event.target.value as SportType)}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Sportart"
                >
                  {sportOptions.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select
                  value={intensity}
                  onChange={(event) => setIntensity(event.target.value as WorkoutIntensity)}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Intensität"
                >
                  {intensityOptions.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <input
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  type="time"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Startzeit"
                />
                <input
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  inputMode="numeric"
                  placeholder="Minuten"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Dauer in Minuten"
                />
                <input
                  value={distanceKm}
                  onChange={(event) => setDistanceKm(event.target.value)}
                  inputMode="decimal"
                  placeholder="km bei Lauf"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400 sm:col-span-2"
                  aria-label="Distanz in Kilometern"
                />
                {sport === "running" ? (
                  <>
                    <select
                      value={runningType}
                      onChange={(event) => setRunningType(event.target.value as RunningWorkoutType)}
                      className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                      aria-label="Laufart"
                    >
                      {runningTypeOptions.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <select
                      value={runningFocus}
                      onChange={(event) => setRunningFocus(event.target.value as RunningFocus)}
                      className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                      aria-label="Lauf-Fokus"
                    >
                      {runningFocusOptions.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>
              <label className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-3 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={saveAsStandard}
                  onChange={(event) => setSaveAsStandard(event.target.checked)}
                  className="h-4 w-4 rounded border-line text-coach-600"
                />
                Als Trainingsstandard speichern
              </label>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
              >
                {saveAsStandard ? <BookmarkPlus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Hinzufügen
              </button>
            </form>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold text-ink">Coach-Einordnung</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {runningKm >= 35
                ? "Die Laufwoche ist anspruchsvoll. Harte Defizite und zusätzliche Beinbelastung wären jetzt teuer."
                : "Die Woche ist moderat. Zusätzliche Einheiten sollten trotzdem nur einen klaren Zweck haben."}
            </p>
          </Panel>
        </div>
      </section>
    </div>
  );
}

type WorkoutRowProps = {
  workout: WorkoutPlan;
  onStatus: (status: WorkoutStatus) => void;
  onRemove: () => void;
};

function WorkoutRow({ workout, onStatus, onRemove }: WorkoutRowProps) {
  const Icon = iconForSport(workout.sport);

  return (
    <div className="rounded-xl border border-line px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coach-50 text-coach-700">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-ink">{workout.title}</p>
            <p className="mt-1 text-sm text-muted">
              {describeWorkoutType(workout)} · {workout.startTime ?? "flexibel"} · {intensityLabels[workout.intensity]}
            </p>
          </div>
        </div>
        <Pill tone={workout.status === "cancelled" ? "red" : workout.status === "optional" ? "amber" : "green"}>
          {statusLabels[workout.status]}
        </Pill>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["planned", "completed", "optional", "cancelled"] as WorkoutStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatus(status)}
            className="min-h-9 rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-ink"
          >
            {statusLabels[status]}
          </button>
        ))}
        <button
          type="button"
          onClick={onRemove}
          className="flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:border-rose-100 hover:text-rose-700"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Entfernen
        </button>
      </div>
    </div>
  );
}

function iconForSport(sport: SportType) {
  if (sport === "running") return Footprints;
  if (sport === "cycling") return Bike;
  if (sport === "swimming") return Waves;
  if (sport === "hiit" || sport === "squash") return Zap;
  if (sport === "padel") return CircleDot;

  return Dumbbell;
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date(`${date}T12:00:00`));
}

function roundOne(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

function parseOptionalNumber(value: string): number | undefined {
  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : undefined;
}

function createDescription(
  sport: SportType,
  intensity: WorkoutIntensity,
  runningType: RunningWorkoutType,
  runningFocus: RunningFocus
): string {
  if (sport === "running" && intensity === "hard") return `${describeWorkoutType({ sport, runningType, runningFocus })} mit bewusstem Fueling`;
  if (sport === "running") return `${describeWorkoutType({ sport, runningType, runningFocus })} im Wochenplan`;
  if (sport === "strength" || sport === "hiit") return "Kraft- oder Intensitätsreiz ohne unnötige Ermüdung";
  if (sport === "padel") return "Spielbelastung mit moderatem Fueling";

  return "Geplante Einheit";
}
