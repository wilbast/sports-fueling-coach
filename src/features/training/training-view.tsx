"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, Bike, BookmarkPlus, CircleDot, Dumbbell, Footprints, Gauge, HeartPulse, MessageCircle, Pencil, Plus, Route, Waves, X, Zap } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import { PerformanceHero, RecommendationBand, SignalCard, SignalGrid, TrendBars } from "@/components/performance/performance-ui";
import { assessReadiness, createTrainingTrend, trainingConsistency } from "@/domain/performance/insights";
import type { DailyPerformanceSnapshot } from "@/domain/performance/types";
import { getDayPlanByDate } from "@/domain/planning/week";
import type { WorkoutTemplate } from "@/domain/standards/types";
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
import { ExternalActivityList, type ExternalActivitySummary, useExternalActivities } from "@/features/activities/external-activities";
import { CoachChatPanel } from "@/features/coach/coach-chat-panel";
import { CoachRecommendationButton } from "@/features/coach/coach-recommendation-button";

const statusLabels: Record<WorkoutStatus, string> = {
  planned: "geplant",
  optional: "optional",
  completed: "erledigt",
  cancelled: "gestrichen"
};

export function TrainingView() {
  const {
    state,
    setSelectedDate,
    addWorkout,
    applyWorkoutStandard,
    saveWorkoutAsStandard,
    updateWorkout,
    updateWorkoutStatus,
    removeWorkout
  } = useAppState();
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
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingWorkoutDate, setEditingWorkoutDate] = useState<string | null>(null);
  const weekStart = state.weekPlan.days[0]?.date ?? state.weekPlan.startsOn;
  const weekEnd = state.weekPlan.days[state.weekPlan.days.length - 1]?.date ?? state.weekPlan.startsOn;
  const today = getBerlinDate();
  const overviewDate = today >= weekStart && today <= weekEnd ? today : selectedDay.date;
  const historyStart = addDays(weekStart, -21);
  const {
    activities,
    activitiesByDate,
    performanceByDate,
    isLoading: activitiesLoading,
    error: activitiesError
  } = useExternalActivities(historyStart, weekEnd);
  const weekActivities = useMemo(
    () => activities.filter((activity) => {
      const date = activityDateKey(activity);
      return date >= weekStart && date <= weekEnd;
    }),
    [activities, weekEnd, weekStart]
  );
  const trainingOverview = useMemo(
    () => createTrainingOverview(state.weekPlan.days, weekActivities, overviewDate),
    [overviewDate, state.weekPlan.days, weekActivities]
  );
  const trendDates = useMemo(() => createDateRange(addDays(overviewDate, -27), overviewDate), [overviewDate]);
  const trainingTrend = useMemo(() => createTrainingTrend(activities, trendDates), [activities, trendDates]);
  const currentWeekTrend = trainingTrend.slice(-7);
  const selectedPerformance = findLatestPerformanceSnapshot(performanceByDate, selectedDay.date);
  const readiness = useMemo(
    () => assessReadiness(selectedPerformance, activities, selectedDay.workouts),
    [activities, selectedDay.workouts, selectedPerformance]
  );
  const weeklyTrainingLoad = currentWeekTrend.reduce((sum, point) => sum + point.trainingLoad, 0);
  const averagePace = averageDefined(trainingTrend.map((point) => point.averagePaceSecondsPerKm));
  const averageHeartRate = averageDefined(trainingTrend.map((point) => point.averageHeartRate));
  const groupedStandards = useMemo(() => groupWorkoutStandards(state.standards.workouts), [state.standards.workouts]);
  const selectedDayActivities = activitiesByDate[selectedDay.date] ?? [];
  const selectedRemainingWorkouts = getRemainingPlannedWorkouts(selectedDay.workouts, selectedDay.date, overviewDate);
  const selectedCompletedManualWorkouts = getCompletedPlanWorkouts(
    selectedDay.workouts,
    selectedDay.date,
    overviewDate,
    selectedDayActivities.length > 0
  );

  useEffect(() => {
    if (!selectedStandardId && state.standards.workouts[0]) {
      setSelectedStandardId(state.standards.workouts[0].id);
    }
  }, [selectedStandardId, state.standards.workouts]);

  function submitWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const draft = {
      sport,
      title: trimmedTitle,
      startTime: startTime || undefined,
      durationMinutes: parseOptionalNumber(durationMinutes),
      distanceKm: sport === "running" ? parseOptionalNumber(distanceKm) : undefined,
      status: "planned" as WorkoutStatus,
      intensity,
      runningType: sport === "running" ? runningType : undefined,
      runningFocus: sport === "running" ? runningFocus : undefined,
      description: createDescription(sport, intensity, runningType, runningFocus)
    };

    if (editingWorkoutId) {
      updateWorkout(editingWorkoutDate ?? selectedDay.date, editingWorkoutId, draft);
    } else {
      addWorkout(selectedDay.date, draft, { saveAsStandard });
    }

    resetWorkoutForm();
  }

  function startEditingWorkout(date: string, workout: WorkoutPlan) {
    if (date !== selectedDay.date) {
      setSelectedDate(date);
    }

    setEditingWorkoutId(workout.id);
    setEditingWorkoutDate(date);
    setTitle(workout.title);
    setSport(workout.sport);
    setStartTime(workout.startTime ?? "");
    setDurationMinutes(workout.durationMinutes ? String(workout.durationMinutes) : "");
    setDistanceKm(workout.distanceKm ? String(workout.distanceKm).replace(".", ",") : "");
    setIntensity(workout.intensity);
    setRunningType(workout.runningType ?? "easy_run");
    setRunningFocus(workout.runningFocus ?? "base");
    setSaveAsStandard(false);
  }

  function resetWorkoutForm() {
    setEditingWorkoutId(null);
    setEditingWorkoutDate(null);
    setTitle("");
    setDistanceKm("");
    setStartTime("18:00");
    setDurationMinutes("45");
    setSport("running");
    setIntensity("easy");
    setRunningType("easy_run");
    setRunningFocus("base");
    setSaveAsStandard(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Training"
        title="Training steuern"
        description="Tatsächliche Belastung, offene Planung und Recovery in einer gemeinsamen Wochenprognose."
        action={
          <div className="grid gap-2 sm:grid-cols-2">
            <CoachRecommendationButton
              pageContext="training"
              prompt="Gib mir eine kurze Trainingsempfehlung für den aktiven Tag und die Woche: Belastung, Regeneration, Laufqualität und Fueling. Keine Planänderung."
              label="Coach-Empfehlung"
            />
            <a
              href="#coach"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-coach-100 hover:text-coach-700"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Coach fragen
            </a>
          </div>
        }
      />

      <WeekCalendar variant="compact" />

      <PerformanceHero
        eyebrow={`Trainingssteuerung · ${formatShortDate(selectedDay.date)}`}
        title={readiness.label}
        summary={`${readiness.recommendation} Die aktuelle Wochenprognose liegt bei ${roundOne(trainingOverview.projectedRunningKm)} km.`}
        score={readiness.score}
        scoreLabel="Trainingsbereitschaft"
        tone={readiness.tone}
        confidence={translateConfidence(readiness.confidence)}
        reasons={readiness.reasons}
      />

      <SignalGrid>
        <SignalCard icon={Footprints} label="Erledigt diese Woche" value={roundOne(trainingOverview.completedRunningKm)} unit="km" detail={`${trainingOverview.completedActivityCount} durchgeführte Einheiten`} tone="green" />
        <SignalCard icon={Route} label="Wochenprognose" value={roundOne(trainingOverview.projectedRunningKm)} unit="km" detail={`${roundOne(trainingOverview.remainingRunningKm)} km noch geplant`} tone="blue" />
        <SignalCard icon={Activity} label="Trainingsbelastung" value={weeklyTrainingLoad ? String(Math.round(weeklyTrainingLoad)) : "–"} detail={weeklyTrainingLoad ? "Summe aus durchgeführten Einheiten" : "Noch keine Belastungsdaten"} tone="amber" />
        <SignalCard icon={Gauge} label="Konstanz · 28 Tage" value={`${trainingConsistency(trainingTrend)}%`} detail={`${trainingTrend.filter((point) => point.durationMinutes > 0).length} aktive Tage`} tone="neutral" />
      </SignalGrid>

      <RecommendationBand
        title="Einordnung für den ausgewählten Tag"
        body={selectedDayActivities.length > 0
          ? "Die tatsächlich erledigte Belastung führt die Tagesbewertung. Offene Planung bleibt nur für die Prognose relevant."
          : selectedRemainingWorkouts.length > 0
            ? "Heute ist noch Training offen. Steuere die Einheit anhand der Recovery-Signale und des bereits absolvierten Wochenumfangs."
            : "Heute ist keine Einheit offen. Regeneration schützt die Qualität der nächsten geplanten Belastung."}
        reasons={[`${selectedDayActivities.length} durchgeführt`, `${selectedRemainingWorkouts.length} offen`, `${trainingOverview.remainingHardSessionCount} harte Reize offen`]}
        tone={readiness.tone}
      />

      <section className="mb-6 grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <div>
          <SelectedTrainingDay
            date={selectedDay.date}
            focus={selectedDay.focus}
            activities={selectedDayActivities}
            activitiesLoading={activitiesLoading}
            activitiesError={activitiesError}
            completedManualWorkouts={selectedCompletedManualWorkouts}
            remainingWorkouts={selectedRemainingWorkouts}
            dayPlanWorkouts={selectedDay.workouts}
            overviewDate={overviewDate}
            onStatus={(workoutId, status) => updateWorkoutStatus(selectedDay.date, workoutId, status)}
            onSaveAsStandard={(workoutId) => saveWorkoutAsStandard(selectedDay.date, workoutId)}
            onEdit={(workout) => startEditingWorkout(selectedDay.date, workout)}
            onRemove={(workoutId) => removeWorkout(selectedDay.date, workoutId)}
          />
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
                    {groupedStandards.map((group) => (
                      <optgroup key={group.key} label={group.label}>
                        {group.items.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                      </optgroup>
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

                <div className="mt-4 grid gap-4">
                  {groupedStandards.map((group) => (
                    <section key={group.key}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{group.label}</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.items.map((template) => (
                          <button key={template.id} type="button" onClick={() => applyWorkoutStandard(selectedDay.date, template.id)} className="rounded-xl bg-canvas px-3 py-3 text-left transition hover:bg-coach-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coach-500">
                            <p className="text-sm font-semibold text-ink">{template.name}</p>
                            <p className="mt-1 text-xs leading-5 text-muted">{template.startTime ?? "flexibel"} · {intensityLabels[template.intensity]}</p>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{editingWorkoutId ? "Einheit bearbeiten" : "Einheit hinzufügen"}</h2>
                {editingWorkoutId ? (
                  <p className="mt-1 text-sm text-muted">Änderungen werden direkt für den ausgewählten Tag gespeichert.</p>
                ) : null}
              </div>
              {editingWorkoutId ? (
                <button
                  type="button"
                  onClick={resetWorkoutForm}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-ink"
                >
                  Abbrechen
                </button>
              ) : null}
            </div>
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
                  disabled={Boolean(editingWorkoutId)}
                  className="h-4 w-4 rounded border-line text-coach-600"
                />
                Als Trainingsstandard speichern
              </label>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
              >
                {editingWorkoutId ? <Pencil className="h-4 w-4" aria-hidden="true" /> : saveAsStandard ? <BookmarkPlus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {editingWorkoutId ? "Änderungen speichern" : "Hinzufügen"}
              </button>
            </form>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Tatsächliche Leistung</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">Letzte 7 Tage</h2>
              </div>
              <Pill tone="blue">Ist-Daten</Pill>
            </div>
            <TrendBars
              values={currentWeekTrend.map((point) => point.runningKm)}
              labels={currentWeekTrend.map((point) => formatWeekday(point.date))}
              tone="blue"
              formatValue={(value) => `${roundOne(value)} km`}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniMetric icon={Gauge} label="Ø Pace · 28 T." value={formatPace(averagePace)} />
              <MiniMetric icon={HeartPulse} label="Ø Puls · 28 T." value={averageHeartRate ? `${Math.round(averageHeartRate)} bpm` : "–"} />
              <MiniMetric icon={Activity} label="Akute Last" value={formatOptionalMetric(selectedPerformance?.recovery.acuteLoad)} />
              <MiniMetric icon={Route} label="VO₂max Lauf" value={formatOptionalMetric(selectedPerformance?.recovery.vo2maxRunning)} />
            </div>
          </Panel>

          <CoachChatPanel
            title="Coach fragen"
            intro="Frag nach Training, Regeneration, Wochenumfang oder Fueling für den ausgewählten Tag."
            compact
            pageContext="training"
          />
        </div>
      </section>

      <details className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Wocheninformationen</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{state.weekPlan.label}</h2>
          </div>
          <Pill tone="blue">
            {roundOne(trainingOverview.completedRunningKm)} + {roundOne(trainingOverview.remainingRunningKm)} km
          </Pill>
        </summary>

        <div className="mt-5 grid gap-6">
          <WeekCalendar />

          <section className="grid gap-3 md:grid-cols-4">
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Erledigt</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{trainingOverview.completedActivityCount}</p>
              <p className="mt-2 text-sm text-muted">{roundOne(trainingOverview.completedRunningKm)} km Laufumfang</p>
            </Panel>
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Noch geplant</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{trainingOverview.remainingWorkoutCount}</p>
              <p className="mt-2 text-sm text-muted">{roundOne(trainingOverview.remainingRunningKm)} km offen</p>
            </Panel>
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Prognose</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{roundOne(trainingOverview.projectedRunningKm)} km</p>
              <p className="mt-2 text-sm text-muted">Ist plus Restplan</p>
            </Panel>
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Harte Reize</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{trainingOverview.remainingHardSessionCount}</p>
              <p className="mt-2 text-sm text-muted">noch offene Qualitätseinheiten</p>
            </Panel>
          </section>

          <div className="rounded-2xl bg-canvas px-4 py-4 text-sm leading-6 text-muted">
            <span className="font-semibold text-ink">Wochenlogik: </span>
            Abgeschlossene, providerübergreifend zusammengeführte Aktivitäten zählen als Ist. Zukünftige und heutige offene Einheiten bleiben als Plan sichtbar.
          </div>

          <div className="grid gap-3">
            {state.weekPlan.days.map((day) => {
              const dayActivities = activitiesByDate[day.date] ?? [];
              const remainingWorkouts = getRemainingPlannedWorkouts(day.workouts, day.date, overviewDate);
              const completedManualWorkouts = getCompletedPlanWorkouts(day.workouts, day.date, overviewDate, dayActivities.length > 0);

              return (
                <Panel key={day.date} className={day.date === selectedDay.date ? "border-coach-300 bg-coach-50/50" : undefined}>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className="text-left"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{formatShortDate(day.date)}</p>
                      <h3 className="mt-1 font-semibold text-ink">{day.focus}</h3>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <Pill tone={dayActivities.length > 0 ? "amber" : "neutral"}>{dayActivities.length} Ist</Pill>
                      <Pill tone={remainingWorkouts.length > 0 ? "blue" : "neutral"}>{remainingWorkouts.length} Plan</Pill>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {dayActivities.length > 0 ? (
                      <ExternalActivityList
                        activities={dayActivities}
                        isLoading={activitiesLoading}
                        error={activitiesError}
                        emptyText="Keine importierte Aktivität an diesem Tag."
                      />
                    ) : null}

                    {completedManualWorkouts.map((workout) => (
                      <WorkoutRow
                        key={workout.id}
                        workout={workout}
                        compact
                        onStatus={(status) => updateWorkoutStatus(day.date, workout.id, status)}
                        onSaveAsStandard={() => saveWorkoutAsStandard(day.date, workout.id)}
                        onEdit={() => startEditingWorkout(day.date, workout)}
                        onRemove={() => removeWorkout(day.date, workout.id)}
                      />
                    ))}

                    {remainingWorkouts.length === 0 && dayActivities.length === 0 && completedManualWorkouts.length === 0 ? (
                      <div className="rounded-xl bg-white px-3 py-3 text-sm text-muted">Keine Einheit an diesem Tag.</div>
                    ) : remainingWorkouts.map((workout) => (
                      <WorkoutRow
                        key={workout.id}
                        workout={workout}
                        compact
                        onStatus={(status) => updateWorkoutStatus(day.date, workout.id, status)}
                        onSaveAsStandard={() => saveWorkoutAsStandard(day.date, workout.id)}
                        onEdit={() => startEditingWorkout(day.date, workout)}
                        onRemove={() => removeWorkout(day.date, workout.id)}
                      />
                    ))}
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}

type SelectedTrainingDayProps = {
  date: string;
  focus: string;
  activities: ExternalActivitySummary[];
  activitiesLoading: boolean;
  activitiesError: string | null;
  completedManualWorkouts: WorkoutPlan[];
  remainingWorkouts: WorkoutPlan[];
  dayPlanWorkouts: WorkoutPlan[];
  overviewDate: string;
  onStatus: (workoutId: string, status: WorkoutStatus) => void;
  onSaveAsStandard: (workoutId: string) => void;
  onEdit: (workout: WorkoutPlan) => void;
  onRemove: (workoutId: string) => void;
};

function SelectedTrainingDay({
  date,
  focus,
  activities,
  activitiesLoading,
  activitiesError,
  completedManualWorkouts,
  remainingWorkouts,
  dayPlanWorkouts,
  overviewDate,
  onStatus,
  onSaveAsStandard,
  onEdit,
  onRemove
}: SelectedTrainingDayProps) {
  const isPast = date < overviewDate;
  const hasCompleted = activities.length > 0 || completedManualWorkouts.length > 0;
  const hasDayPlan = dayPlanWorkouts.length > 0;

  return (
    <Panel>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Ausgewählter Tag</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">{formatLongDate(date)}</h2>
          <p className="mt-1 text-sm text-muted">{focus}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={hasCompleted ? "amber" : "neutral"}>{activities.length + completedManualWorkouts.length} erledigt</Pill>
          <Pill tone={hasDayPlan ? "blue" : "neutral"}>{dayPlanWorkouts.length} geplant</Pill>
        </div>
      </div>

      <div className="grid gap-5">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">Durchgeführt</h3>
            <Pill tone={activities.length > 0 ? "amber" : "neutral"}>{activities.length} importiert</Pill>
          </div>
          <ExternalActivityList
            activities={activities}
            isLoading={activitiesLoading}
            error={activitiesError}
            emptyText={isPast ? "Keine importierte Aktivität an diesem Tag." : "Noch keine importierte Aktivität an diesem Tag."}
          />
          {completedManualWorkouts.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {completedManualWorkouts.map((workout) => (
                <WorkoutRow
                  key={workout.id}
                  workout={workout}
                  compact
                  onStatus={(status) => onStatus(workout.id, status)}
                  onSaveAsStandard={() => onSaveAsStandard(workout.id)}
                  onEdit={() => onEdit(workout)}
                  onRemove={() => onRemove(workout.id)}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">Geplanter Tagesplan</h3>
            <Pill tone={dayPlanWorkouts.length > 0 ? "blue" : "neutral"}>{dayPlanWorkouts.length} Einheiten</Pill>
          </div>
          <div className="grid gap-3">
            {dayPlanWorkouts.length === 0 ? (
              <div className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">
                {isPast ? "Kein geplanter Tagesplan vorhanden." : "Kein Training geplant."}
              </div>
            ) : dayPlanWorkouts.map((workout) => (
              <WorkoutRow
                key={workout.id}
                workout={workout}
                onStatus={(status) => onStatus(workout.id, status)}
                onSaveAsStandard={() => onSaveAsStandard(workout.id)}
                onEdit={() => onEdit(workout)}
                onRemove={() => onRemove(workout.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
}

type WorkoutRowProps = {
  workout: WorkoutPlan;
  onStatus: (status: WorkoutStatus) => void;
  onSaveAsStandard: () => void;
  onEdit: () => void;
  onRemove: () => void;
  compact?: boolean;
};

function WorkoutRow({ workout, onStatus, onSaveAsStandard, onEdit, onRemove, compact = false }: WorkoutRowProps) {
  const Icon = iconForSport(workout.sport);

  return (
    <div className={compact ? "rounded-xl border border-line bg-white/70 px-3 py-2" : "rounded-xl border border-line px-3 py-3"}>
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

      <div className={compact ? "mt-2 flex flex-wrap gap-2" : "mt-3 flex flex-wrap gap-2"}>
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
          onClick={onEdit}
          className="flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-coach-700"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={onSaveAsStandard}
          className="flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:border-coach-100 hover:text-coach-700"
        >
          <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Als Standard
        </button>
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

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-canvas p-3">
      <Icon className="h-4 w-4 text-coach-600" aria-hidden="true" />
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
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

function groupWorkoutStandards(templates: WorkoutTemplate[]) {
  const groups = new Map<string, { key: string; label: string; items: WorkoutTemplate[] }>();
  for (const template of templates) {
    const subtype = template.sport === "running" ? template.runningType ?? "easy_run" : "general";
    const key = `${template.sport}:${subtype}`;
    const sportLabel = sportOptions.find((option) => option.value === template.sport)?.label ?? template.sport;
    const runningLabel = template.sport === "running"
      ? runningTypeOptions.find((option) => option.value === subtype)?.label
      : undefined;
    const group = groups.get(key) ?? { key, label: runningLabel ? `${sportLabel} · ${runningLabel}` : sportLabel, items: [] };
    group.items.push(template);
    groups.set(key, group);
  }
  return Array.from(groups.values());
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

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function createDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end && dates.length < 60) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function averageDefined(values: Array<number | null | undefined>): number | null {
  const defined = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  return defined.length ? defined.reduce((sum, value) => sum + value, 0) / defined.length : null;
}

function formatPace(seconds?: number | null): string {
  if (!seconds) return "–";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")} min/km`;
}

function formatOptionalMetric(value?: number | null): string {
  return value != null && Number.isFinite(value) ? value.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : "–";
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
}

function translateConfidence(confidence: "high" | "medium" | "low"): string {
  if (confidence === "high") return "hoch";
  if (confidence === "medium") return "mittel";
  return "niedrig";
}

function findLatestPerformanceSnapshot(
  snapshots: Record<string, DailyPerformanceSnapshot>,
  date: string
): DailyPerformanceSnapshot | undefined {
  const latestDate = Object.keys(snapshots).filter((candidate) => candidate <= date).sort().at(-1);
  return latestDate ? snapshots[latestDate] : undefined;
}

function createTrainingOverview(
  days: Array<{ date: string; workouts: WorkoutPlan[] }>,
  activities: ExternalActivitySummary[],
  overviewDate: string
) {
  const completedActivities = activities.filter((activity) => activityDateKey(activity) <= overviewDate);
  const activityDates = new Set(completedActivities.map(activityDateKey));
  const completedManualWorkouts = days.flatMap((day) => getCompletedPlanWorkouts(
    day.workouts,
    day.date,
    overviewDate,
    activityDates.has(day.date)
  ));
  const remainingWorkouts = days.flatMap((day) => getRemainingPlannedWorkouts(day.workouts, day.date, overviewDate));
  const completedRunningKm = Math.round((sumRunningActivityKm(completedActivities) + sumRunningWorkoutKm(completedManualWorkouts)) * 10) / 10;
  const remainingRunningKm = sumRunningWorkoutKm(remainingWorkouts);

  return {
    completedActivityCount: completedActivities.length + completedManualWorkouts.length,
    completedRunningKm,
    remainingWorkoutCount: remainingWorkouts.length,
    remainingRunningKm,
    projectedRunningKm: Math.round((completedRunningKm + remainingRunningKm) * 10) / 10,
    remainingHardSessionCount: remainingWorkouts.filter(isHardWorkout).length
  };
}

function getRemainingPlannedWorkouts(workouts: WorkoutPlan[], dayDate: string, overviewDate: string): WorkoutPlan[] {
  return workouts
    .filter((workout) => workout.status !== "cancelled")
    .filter((workout) => workout.status !== "completed")
    .filter(() => dayDate > overviewDate || dayDate === overviewDate);
}

function getCompletedPlanWorkouts(workouts: WorkoutPlan[], dayDate: string, overviewDate: string, hasExternalActivityOnDay: boolean): WorkoutPlan[] {
  if (hasExternalActivityOnDay || dayDate > overviewDate) return [];

  return workouts
    .filter((workout) => workout.status === "completed")
    .filter((workout) => workout.status !== "cancelled");
}

function sumRunningActivityKm(activities: ExternalActivitySummary[]): number {
  return Math.round(activities
    .filter(isRunningActivity)
    .reduce((sum, activity) => sum + ((activity.distanceMeters ?? 0) / 1000), 0) * 10) / 10;
}

function sumRunningWorkoutKm(workouts: WorkoutPlan[]): number {
  return Math.round(workouts
    .filter((workout) => workout.sport === "running")
    .reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0) * 10) / 10;
}

function isRunningActivity(activity: ExternalActivitySummary): boolean {
  const sport = activity.sportType.toLowerCase();
  return sport.includes("run") || sport.includes("lauf");
}

function isHardWorkout(workout: WorkoutPlan): boolean {
  return workout.intensity === "hard" || workout.runningFocus === "threshold" || workout.runningFocus === "vo2max";
}

function activityDateKey(activity: ExternalActivitySummary): string {
  return (activity.startDateLocal ?? activity.startDate).slice(0, 10);
}

function getBerlinDate(): string {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("year")}-${part("month")}-${part("day")}`;
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
