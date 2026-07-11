"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookmarkPlus,
  BriefcaseBusiness,
  CalendarDays,
  Dumbbell,
  Flame,
  HeartHandshake,
  Home,
  Layers3,
  Plane,
  Plus,
  Sparkles,
  Tags,
  Trash2,
  Umbrella,
  X
} from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import { demoPlanningExtraInfos } from "@/data/mock/standards";
import { createDailyBriefing } from "@/domain/briefing/create-daily-briefing";
import type { DayBlock, DayBlockType, DayContext, DayPlan } from "@/domain/planning/types";
import { getDayPlanByDate, getWeekTrainingLoad, getWorkoutSummary } from "@/domain/planning/week";
import type { PlanningContext, PlanningExtraInfo } from "@/domain/standards/types";
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
  WorkoutStatus
} from "@/domain/training/types";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { CoachChatPanel } from "@/features/coach/coach-chat-panel";
import { CoachRecommendationButton } from "@/features/coach/coach-recommendation-button";
import { ExternalActivityList, useExternalActivities } from "@/features/activities/external-activities";

const planningContexts: Array<{
  value: PlanningContext;
  label: string;
  detail: string;
  icon: typeof Home;
}> = [
  {
    value: "homeoffice",
    label: "Home-Office",
    detail: "flexibel, gut planbar",
    icon: Home
  },
  {
    value: "office",
    label: "Büroarbeit",
    detail: "mehr Struktur nötig",
    icon: BriefcaseBusiness
  },
  {
    value: "free",
    label: "Frei",
    detail: "Wochenende, Erholung, flexible Struktur",
    icon: HeartHandshake
  },
  {
    value: "vacation",
    label: "Urlaub",
    detail: "lockerer Rhythmus, grob coachen",
    icon: Umbrella
  },
  {
    value: "travel",
    label: "Reisetag",
    detail: "einfach halten",
    icon: Plane
  }
];

const statusLabels: Record<WorkoutStatus, string> = {
  planned: "geplant",
  optional: "optional",
  completed: "erledigt",
  cancelled: "gestrichen"
};

export function PlanningView() {
  const {
    state,
    setSelectedDate,
    updateDayPlanningContext,
    addDayExtraInfo,
    removeDayExtraInfo,
    addPlanningStandard,
    applyPlanningStandard,
    addWorkout,
    saveWorkoutAsStandard: saveExistingWorkoutAsStandard,
    applyWorkoutStandard,
    updateWorkoutStatus,
    removeWorkout,
    saveCurrentWeekAsStandard,
    applyWeekStandard,
    updateManualDailyBurnForecastCalories
  } = useAppState();
  const selectedDay = getDayPlanByDate(state.weekPlan, state.selectedDate);
  const selectedContext = getPlanningContext(selectedDay);
  const extraInfos = getAdditionalInfoBlocks(selectedDay);
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [sport, setSport] = useState<SportType>("running");
  const [startTime, setStartTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [distanceKm, setDistanceKm] = useState("");
  const [intensity, setIntensity] = useState<WorkoutIntensity>("easy");
  const [runningType, setRunningType] = useState<RunningWorkoutType>("easy_run");
  const [runningFocus, setRunningFocus] = useState<RunningFocus>("base");
  const [saveWorkoutAsStandard, setSaveWorkoutAsStandard] = useState(false);
  const [selectedWorkoutStandardId, setSelectedWorkoutStandardId] = useState(state.standards.workouts[0]?.id ?? "");
  const [selectedPlanningStandardId, setSelectedPlanningStandardId] = useState(state.standards.planning[0]?.id ?? "");
  const [planningStandardName, setPlanningStandardName] = useState("");
  const [extraInfoLabel, setExtraInfoLabel] = useState("");
  const [selectedWeekTemplateId, setSelectedWeekTemplateId] = useState(state.standards.weeks[0]?.id ?? "");
  const [weekStandardName, setWeekStandardName] = useState("");
  const trainingLoad = getWeekTrainingLoad(state.weekPlan);
  const weekStart = state.weekPlan.days[0]?.date ?? state.weekPlan.startsOn;
  const weekEnd = state.weekPlan.days[state.weekPlan.days.length - 1]?.date ?? state.weekPlan.startsOn;
  const {
    activitiesByDate,
    isLoading: activitiesLoading,
    error: activitiesError
  } = useExternalActivities(weekStart, weekEnd);
  const selectedActivities = useMemo(() => activitiesByDate[selectedDay.date] ?? [], [activitiesByDate, selectedDay.date]);
  const selectedForecastCalories = state.energySettings.manualDailyBurnForecastCaloriesByDate[selectedDay.date];

  useEffect(() => {
    if (!selectedWorkoutStandardId && state.standards.workouts[0]) {
      setSelectedWorkoutStandardId(state.standards.workouts[0].id);
    }

    if (!selectedWeekTemplateId && state.standards.weeks[0]) {
      setSelectedWeekTemplateId(state.standards.weeks[0].id);
    }
  }, [selectedWeekTemplateId, selectedWorkoutStandardId, state.standards.weeks, state.standards.workouts]);

  function submitWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = workoutTitle.trim();
    if (!title) return;

    addWorkout(selectedDay.date, {
      sport,
      title,
      startTime: startTime || undefined,
      durationMinutes: parseOptionalNumber(durationMinutes),
      distanceKm: sport === "running" ? parseOptionalNumber(distanceKm) : undefined,
      status: "planned",
      intensity,
      runningType: sport === "running" ? runningType : undefined,
      runningFocus: sport === "running" ? runningFocus : undefined,
      description: createWorkoutDescription(sport, intensity, runningType, runningFocus)
    }, { saveAsStandard: saveWorkoutAsStandard });
    setWorkoutTitle("");
    setDistanceKm("");
    setSaveWorkoutAsStandard(false);
  }

  function submitExtraInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = extraInfoLabel.trim();
    if (!label) return;

    addDayExtraInfo(selectedDay.date, createExtraInfoDraft(label));
    setExtraInfoLabel("");
  }

  function savePlanningStandard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = planningStandardName.trim();
    if (!name) return;

    addPlanningStandard({
      name,
      context: selectedContext,
      extraInfos: extraInfos.map(blockToExtraInfo),
      note: selectedDay.note
    });
    setPlanningStandardName("");
  }

  function saveWeekStandard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = weekStandardName.trim();
    if (!name) return;

    saveCurrentWeekAsStandard(name, "Planung, Training und Fueling aus der aktuellen Woche.");
    setWeekStandardName("");
  }

  const briefing = useMemo(() => createDailyBriefing({
    profile: state.profile,
    goals: state.goals,
    dayPlan: selectedDay,
    mealTemplates: state.mealTemplates,
    actualActivities: selectedActivities,
    energySettings: state.energySettings
  }), [selectedActivities, selectedDay, state.energySettings, state.goals, state.mealTemplates, state.profile]);

  return (
    <div>
      <PageHeader
        eyebrow="Planung"
        title="Woche vorbereiten"
        description="Rahmenbedingungen und Training festlegen. Fueling bleibt dynamisch im Tagesbriefing."
        action={
          <div className="grid gap-2 sm:grid-cols-2">
            <CoachRecommendationButton
              pageContext="planning"
              prompt="Gib mir eine kurze Planungsempfehlung für den aktiven Tag und die Woche: Alltag, Training, Familie, Fueling-Risiken. Keine Planänderung."
              label="Coach-Empfehlung"
            />
            <Link
              href={`/today?date=${selectedDay.date}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Als Heute anzeigen
            </Link>
          </div>
        }
      />

      <WeekCalendar variant="compact" />

      <div className="flex flex-col">
        <details className="order-2 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Wocheninformationen</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{state.weekPlan.label}</h2>
            </div>
            <Pill tone="blue">Trainingslast {trainingLoad}</Pill>
          </summary>

          <div className="mt-5 grid gap-6">
            <WeekCalendar />

            <section className="grid gap-3 sm:grid-cols-3">
              <Panel>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-1 h-5 w-5 text-coach-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-ink">{state.weekPlan.label}</p>
                    <p className="mt-1 text-sm text-muted">{state.weekPlan.templateName}</p>
                  </div>
                </div>
              </Panel>
              <Panel>
                <div className="flex items-start gap-3">
                  <Dumbbell className="mt-1 h-5 w-5 text-coach-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-ink">Trainingslast</p>
                    <p className="mt-1 text-sm text-muted">Diese Woche: {trainingLoad}</p>
                  </div>
                </div>
              </Panel>
              <Panel>
                <div className="flex items-start gap-3">
                  <Layers3 className="mt-1 h-5 w-5 text-coach-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-ink">Standards</p>
                    <p className="mt-1 text-sm text-muted">{state.standards.weeks.length} Wochen · {state.standards.workouts.length} Einheiten</p>
                  </div>
                </div>
              </Panel>
            </section>

            <Panel>
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Layers3 className="h-5 w-5 text-coach-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-ink">Standardwoche</h2>
                  </div>
                  {state.standards.weeks.length === 0 ? (
                    <div className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
                      Noch keine Standardwoche gespeichert. Plane eine echte Woche und speichere sie anschließend als Vorlage.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        value={selectedWeekTemplateId}
                        onChange={(event) => setSelectedWeekTemplateId(event.target.value)}
                        className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                        aria-label="Standardwoche auswählen"
                      >
                        {state.standards.weeks.map((template) => (
                          <option key={template.id} value={template.id}>{template.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => applyWeekStandard(selectedWeekTemplateId)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
                      >
                        Anwenden
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-sm leading-5 text-muted">
                    Eine Standardwoche setzt Rahmenbedingungen, Training und grobe Fueling-Slots.
                  </p>
                </div>

                <form onSubmit={saveWeekStandard} className="grid content-start gap-2">
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Aktuelle Woche als Standard speichern
                    <input
                      value={weekStandardName}
                      onChange={(event) => setWeekStandardName(event.target.value)}
                      placeholder="z. B. Aufbauwoche mit langem Lauf"
                      className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
                  >
                    <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                    Woche speichern
                  </button>
                </form>
              </div>
            </Panel>

            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">Tage</h2>
                <Pill tone="green">Kontext und Training</Pill>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                {state.weekPlan.days.map((day) => (
                  <DayCard
                    key={day.date}
                    day={day}
                    activityCount={activitiesByDate[day.date]?.length ?? 0}
                    selected={day.date === selectedDay.date}
                    onSelect={() => setSelectedDate(day.date)}
                  />
                ))}
              </div>
            </section>
          </div>
        </details>

        <div className="order-1 mb-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-6">
          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Ausgewählter Tag
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">{formatLongDate(selectedDay.date)}</h2>
              </div>
              <Pill tone="blue">{contextLabel(selectedContext)}</Pill>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <select
                value={selectedPlanningStandardId}
                onChange={(event) => setSelectedPlanningStandardId(event.target.value)}
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Planungsstandard auswählen"
              >
                {state.standards.planning.map((standard) => (
                  <option key={standard.id} value={standard.id}>{standard.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => applyPlanningStandard(selectedDay.date, selectedPlanningStandardId)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
              >
                Standard anwenden
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {planningContexts.map((context) => {
                const Icon = context.icon;
                const selected = context.value === selectedContext;

                return (
                  <button
                    key={context.value}
                    type="button"
                    onClick={() => updateDayPlanningContext(selectedDay.date, context.value)}
                    className={
                      selected
                        ? "rounded-2xl border border-coach-500 bg-coach-50 p-4 text-left shadow-soft transition"
                        : "rounded-2xl border border-line bg-white p-4 text-left shadow-soft transition hover:border-coach-100"
                    }
                  >
                    <Icon className="h-5 w-5 text-coach-600" aria-hidden="true" />
                    <p className="mt-3 font-semibold text-ink">{context.label}</p>
                    <p className="mt-1 text-sm text-muted">{context.detail}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl bg-canvas p-3">
              <div className="mb-3 flex items-center gap-2">
                <Tags className="h-4 w-4 text-coach-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-ink">Zusatzinfos</h3>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {demoPlanningExtraInfos.map((info) => (
                  <button
                    key={info.id}
                    type="button"
                    onClick={() => addDayExtraInfo(selectedDay.date, stripInfoId(info))}
                    className="min-h-9 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-ink"
                  >
                    {info.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2">
                {extraInfos.length === 0 ? (
                  <p className="rounded-lg bg-white px-3 py-2 text-sm text-muted">Keine Zusatzinfos für diesen Tag</p>
                ) : extraInfos.map((info) => (
                  <div key={info.id} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{info.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{info.impact}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDayExtraInfo(selectedDay.date, info.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                      aria-label="Zusatzinfo entfernen"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={submitExtraInfo} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={extraInfoLabel}
                  onChange={(event) => setExtraInfoLabel(event.target.value)}
                  placeholder="z. B. Biergarten, Restaurantbesuch, Freunde treffen"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Zusatzinfo"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Hinzufügen
                </button>
              </form>
            </div>

            <form onSubmit={savePlanningStandard} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={planningStandardName}
                onChange={(event) => setPlanningStandardName(event.target.value)}
                placeholder="Aktuellen Tag als Planungsstandard speichern"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Name des Planungsstandards"
              />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
              >
                <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                Speichern
              </button>
            </form>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Training</h2>
              <Pill tone={selectedDay.workouts.length > 0 ? "blue" : "neutral"}>
                {selectedDay.workouts.length} Einheiten
              </Pill>
            </div>

            {state.standards.workouts.length === 0 ? (
              <div className="mb-4 rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
                Noch keine Trainingsstandards. Füge eine Einheit hinzu und markiere sie als Standard.
              </div>
            ) : (
              <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <select
                  value={selectedWorkoutStandardId}
                  onChange={(event) => setSelectedWorkoutStandardId(event.target.value)}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Trainingsstandard auswählen"
                >
                  {state.standards.workouts.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => applyWorkoutStandard(selectedDay.date, selectedWorkoutStandardId)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
                >
                  Standard einfügen
                </button>
              </div>
            )}

            <div className="grid gap-3">
              {selectedDay.workouts.length === 0 ? (
                <div className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">
                  Kein Training geplant
                </div>
              ) : selectedDay.workouts.map((workout) => (
                <div key={workout.id} className="rounded-xl border border-line px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{workout.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {describeWorkoutType(workout)} · {workout.startTime ?? "flexibel"} · {intensityLabels[workout.intensity]}
                      </p>
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
                        onClick={() => updateWorkoutStatus(selectedDay.date, workout.id, status)}
                        className="min-h-9 rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-ink"
                      >
                        {statusLabels[status]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => saveExistingWorkoutAsStandard(selectedDay.date, workout.id)}
                      className="flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-coach-700"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      Als Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => removeWorkout(selectedDay.date, workout.id)}
                      className="flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:border-rose-100 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Entfernen
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={submitWorkout} className="mt-5 grid gap-3 rounded-xl bg-canvas p-3">
              <input
                value={workoutTitle}
                onChange={(event) => setWorkoutTitle(event.target.value)}
                placeholder="Einheit, z. B. 8 km locker"
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
                  placeholder="Dauer Minuten"
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
              <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={saveWorkoutAsStandard}
                  onChange={(event) => setSaveWorkoutAsStandard(event.target.checked)}
                  className="h-4 w-4 rounded border-line text-coach-600"
                />
                Als Trainingsstandard speichern
              </label>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Einheit hinzufügen
              </button>
            </form>
          </Panel>

          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Durchgeführt</h2>
                <p className="mt-1 text-sm text-muted">Importierte Aktivitäten am ausgewählten Tag</p>
              </div>
              <Pill tone={selectedActivities.length > 0 ? "amber" : "neutral"}>
                {selectedActivities.length} Strava
              </Pill>
            </div>
            <ExternalActivityList
              activities={selectedActivities}
              isLoading={activitiesLoading}
              error={activitiesError}
              emptyText="Keine importierte Strava-Aktivität an diesem Tag."
            />

            <div className="mt-4 rounded-xl bg-canvas p-3">
              <div className="mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-ink">Tagesverbrauch-Forecast</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={selectedForecastCalories ?? ""}
                  onChange={(event) => updateManualDailyBurnForecastCalories(
                    selectedDay.date,
                    parseOptionalNumber(event.target.value)
                  )}
                  placeholder="z. B. 3200"
                  inputMode="numeric"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Manueller Tagesverbrauch-Forecast"
                />
                <button
                  type="button"
                  onClick={() => updateManualDailyBurnForecastCalories(selectedDay.date)}
                  disabled={!selectedForecastCalories}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Entfernen
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                Überschreibt den Tagesverbrauch für diesen Tag.
              </p>
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <CoachChatPanel
            title="Coach fragen"
            intro="Frag nach Einordnung oder Vorschlägen für den ausgewählten Tag. Für den vollen Coach-Bereich nutze die Coach-Navigation."
            compact
            pageContext="planning"
          />

          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Daily Briefing
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">{briefing.heroTitle}</h2>
              </div>
              <Pill tone={briefing.nutritionTarget.energyDemand === "hoch" ? "amber" : "green"}>
                Energiebedarf: {briefing.nutritionTarget.energyDemand}
              </Pill>
            </div>

            <p className="text-sm leading-6 text-muted">{briefing.lead}</p>

            <div className="mt-4 grid gap-2">
              {briefing.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl bg-canvas px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-semibold text-ink">
                    {metric.value} <span className="text-xs font-medium text-muted">{metric.unit}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-coach-50 px-3 py-3 text-sm leading-6 text-muted">
              <span className="font-semibold text-ink">Coach: </span>
              {briefing.coachHint}
            </div>
          </Panel>
        </div>
        </div>
      </div>
    </div>
  );
}

type DayCardProps = {
  day: DayPlan;
  activityCount: number;
  selected: boolean;
  onSelect: () => void;
};

function DayCard({ day, activityCount, selected, onSelect }: DayCardProps) {
  const context = getPlanningContext(day);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? "rounded-2xl border border-coach-500 bg-coach-50 p-4 text-left shadow-soft transition"
          : "rounded-2xl border border-line bg-white p-4 text-left shadow-soft transition hover:border-coach-100"
      }
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-semibold text-coach-700 ring-1 ring-coach-100">
          {formatWeekday(day.date)}
        </span>
        <div className="flex flex-wrap justify-end gap-1">
          <Pill tone={day.workouts.length === 0 ? "neutral" : "blue"}>{day.workouts.length} Plan</Pill>
          {activityCount > 0 ? <Pill tone="amber">{activityCount} Ist</Pill> : null}
        </div>
      </div>
      <h3 className="font-semibold text-ink">{contextLabel(context)}</h3>
      <p className="mt-3 text-sm leading-5 text-muted">{getWorkoutSummary(day)}</p>
    </button>
  );
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(".", "");
}

function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(`${date}T12:00:00`));
}

function getPlanningContext(day: DayPlan): PlanningContext {
  if (day.context.includes("vacation")) return "vacation";
  if (day.context.includes("free")) return "free";
  if (day.context.includes("travel")) return "travel";
  if (day.context.includes("office")) return "office";

  return "homeoffice";
}

function contextLabel(context: PlanningContext): string {
  const labels: Record<PlanningContext, string> = {
    homeoffice: "Home-Office",
    office: "Büroarbeit",
    travel: "Reisetag",
    free: "Frei",
    vacation: "Urlaub"
  };

  return labels[context];
}

function getAdditionalInfoBlocks(day: DayPlan): DayBlock[] {
  return day.blocks.filter((block) => (
    block.type === "restaurant" ||
    block.type === "family" ||
    block.type === "recovery" ||
    block.type === "planning"
  ));
}

function stripInfoId(info: PlanningExtraInfo): Omit<PlanningExtraInfo, "id"> {
  return {
    label: info.label,
    impact: info.impact,
    type: info.type,
    context: info.context
  };
}

function blockToExtraInfo(block: DayBlock): PlanningExtraInfo {
  return {
    id: block.id,
    label: block.label,
    impact: block.impact,
    type: block.type,
    context: block.type === "restaurant" ? "restaurant" : block.type === "family" ? "family" : undefined
  };
}

function createExtraInfoDraft(label: string): Omit<PlanningExtraInfo, "id"> {
  const normalized = label.toLowerCase();
  const isRestaurant = normalized.includes("restaurant") || normalized.includes("biergarten") || normalized.includes("essen");
  const isSocial = normalized.includes("freund") ||
    normalized.includes("treffen") ||
    normalized.includes("familie") ||
    normalized.includes("kind") ||
    normalized.includes("betreuung");
  const type: DayBlockType = isRestaurant ? "restaurant" : isSocial ? "family" : "planning";
  const context: DayContext | undefined = isRestaurant ? "restaurant" : isSocial ? "family" : undefined;

  return {
    label,
    type,
    context,
    impact: createExtraInfoImpact(label, type)
  };
}

function createExtraInfoImpact(label: string, type: DayBlockType): string {
  if (type === "restaurant") {
    return `${label}: grob einplanen, tagsüber Protein und einfache Standards sichern`;
  }

  if (type === "family") {
    return `${label}: Training und Hauptmahlzeit vorher realistisch platzieren`;
  }

  return `${label}: als Rahmenbedingung im Tagesbriefing berücksichtigen`;
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function createWorkoutDescription(
  sport: SportType,
  intensity: WorkoutIntensity,
  runningType: RunningWorkoutType,
  runningFocus: RunningFocus
): string {
  if (sport === "running" && intensity === "hard") return `${describeWorkoutType({ sport, runningType, runningFocus })}, Fueling vorher sichern`;
  if (sport === "running") return `${describeWorkoutType({ sport, runningType, runningFocus })}, Energie vorher und danach passend halten`;
  if (sport === "strength" || sport === "hiit") return "Kraft- oder Intensitätsreiz, Protein in der nächsten Mahlzeit";
  if (sport === "padel") return "Spielbelastung, Flüssigkeit und Abendessen mitdenken";

  return "Geplante Einheit im Wochenkontext";
}
