"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Beef, BookmarkPlus, History, Plus, Salad, Soup, Utensils, Wheat } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import type { MealLog } from "@/domain/nutrition/logs";
import { estimateMealLogTime, inferMealCategory, mealCategoryOptions, mealCategoryToRole } from "@/domain/nutrition/meal-timing";
import type { MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import { getDayPlanByDate } from "@/domain/planning/week";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { CoachRecommendationButton } from "@/features/coach/coach-recommendation-button";
import { TimedCoachBriefing } from "@/features/coach/timed-coach-briefing";
import { QuickFuelingPanel } from "@/features/fueling/quick-fueling-panel";
import { MealLogList } from "@/features/nutrition/meal-log-list";
import { NUTRITION_LOGS_UPDATED_EVENT, loadLocalMealLogsForDate, useNutritionLogs } from "@/features/nutrition/use-nutrition-logs";

const mealIcons = [Salad, Beef, Soup, Wheat];

export function FuelingView() {
  const { state, addMealTemplate } = useAppState();
  const selectedDay = getDayPlanByDate(state.weekPlan, state.selectedDate);
  const standardMealTemplates = state.mealTemplates.filter((meal) => meal.isStandard !== false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("550");
  const [protein, setProtein] = useState("35");
  const [tags, setTags] = useState("standard, protein");
  const [mealCategory, setMealCategory] = useState<MealTemplate["category"]>("main");
  const [manualMealTime, setManualMealTime] = useState("");
  const [saveMealAsStandard, setSaveMealAsStandard] = useState(true);
  const [addNewMealToDay, setAddNewMealToDay] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { logs: selectedDayLogs, isLoading: logsLoading, error: logsError, addLog, updateLog, deleteLog } = useNutritionLogs(selectedDay.date);
  const weeklyLogs = useWeekMealLogs(state.weekPlan.days.map((day) => day.date));
  const selectedDayLoggedTotals = useMemo(() => calculateMealLogTotals(selectedDayLogs), [selectedDayLogs]);

  async function submitTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName || !trimmedDescription) return;

    const template = {
      name: trimmedName,
      description: trimmedDescription,
      caloriesMin: parseNumber(calories, 0),
      caloriesMax: parseNumber(calories, 0),
      proteinMin: parseNumber(protein, 0),
      proteinMax: parseNumber(protein, 0),
      carbsGrams: 0,
      fatGrams: 0,
      category: mealCategory,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    };
    const loggedTime = manualMealTime || estimateMealLogTime(template, selectedDay);

    if (addNewMealToDay) {
      const slot = {
        time: loggedTime,
        role: mealCategoryToRole(mealCategory ?? "main")
      };
      const savedLog = await addLog({
        date: selectedDay.date,
        time: slot.time,
        name: template.name,
        description: template.description,
        source: saveMealAsStandard ? "standard" : "manual",
        values: {
          calories: template.caloriesMin,
          proteinGrams: template.proteinMin,
          carbohydrateGrams: template.carbsGrams ?? 0,
          fatGrams: template.fatGrams ?? 0
        },
        confidence: "manual",
        rationale: "Manuell in Fueling erfasst.",
        manuallyConfirmed: true,
        rawInput: template.description,
        category: mealRoleToLogCategory(slot.role),
        isMainMeal: false
      });

      if (!savedLog) {
        setStatusMessage("Die Mahlzeit konnte gerade nicht gespeichert werden. Es wurde kein Tagesplan-Ersatz angelegt.");
        return;
      }

      if (saveMealAsStandard) {
        addMealTemplate(template);
      }
      setStatusMessage(`${template.name} wurde um ${loggedTime} für ${formatShortDate(selectedDay.date)} geloggt.`);
    } else if (saveMealAsStandard) {
      addMealTemplate(template);
      setStatusMessage(`${template.name} wurde als Fuelingstandard gespeichert.`);
    } else {
      return;
    }

    setName("");
    setDescription("");
    setMealCategory("main");
    setManualMealTime("");
    setSaveMealAsStandard(true);
  }

  async function addStandardMealToDay(meal: MealTemplate, slot: Omit<MealPlanSlot, "mealTemplateId">) {
    const loggedTime = slot.time;
    const category = inferMealCategory(meal);
    const savedLog = await addLog({
      date: selectedDay.date,
      time: loggedTime,
      name: meal.name,
      description: meal.description,
      source: "standard",
      sourceId: meal.id,
      values: {
        calories: midpoint(meal.estimatedCalories.min, meal.estimatedCalories.max),
        proteinGrams: midpoint(meal.estimatedProteinGrams.min, meal.estimatedProteinGrams.max),
        carbohydrateGrams: midpoint(meal.estimatedCarbohydratesGrams?.min, meal.estimatedCarbohydratesGrams?.max),
        fatGrams: midpoint(meal.estimatedFatGrams?.min, meal.estimatedFatGrams?.max)
      },
      confidence: meal.nutritionConfidence ?? "manual",
      rationale: meal.nutritionRationale,
      manuallyConfirmed: meal.nutritionSource === "manual" || meal.nutritionConfidence === "manual",
      rawInput: meal.description,
      category: mealRoleToLogCategory(mealCategoryToRole(category)),
      isMainMeal: false
    });

    if (!savedLog) {
      setStatusMessage(`${meal.name} konnte gerade nicht als Mahlzeit gespeichert werden.`);
      return;
    }

    setStatusMessage(`${meal.name} wurde um ${loggedTime} für ${formatShortDate(selectedDay.date)} geloggt.`);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Fueling"
        title="Mahlzeiten und Standards"
        description="Grobe Planung über Standardmahlzeiten, Portionen, Makros und Trainingszeitpunkt."
        action={
          <CoachRecommendationButton
            pageContext="fueling"
            prompt="Gib mir eine kurze Fueling-Empfehlung für den aktiven Tag: bisher gegessen, Zielwerte, Training und was als nächstes sinnvoll wäre. Keine Planänderung."
            label="Coach-Empfehlung"
          />
        }
      />

      <TimedCoachBriefing
        page="fueling"
        selectedDate={selectedDay.date}
        focus={selectedDay.focus}
        mealCount={selectedDayLogs.length}
        caloriesIntake={selectedDayLoggedTotals.calories}
        proteinRemaining={Math.max(0, estimateProteinTarget(state.profile.bodyMetrics.weightKg) - selectedDayLoggedTotals.protein)}
        carbsRemaining={Math.max(0, estimateCarbsTarget(selectedDay.workouts.length) - selectedDayLoggedTotals.carbs)}
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Geloggt</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{selectedDayLoggedTotals.calories} kcal</p>
          <p className="mt-2 text-sm text-muted">
            {selectedDayLogs.length} Einträge · {selectedDayLoggedTotals.protein} g Protein · {selectedDayLoggedTotals.carbs} g Carbs
          </p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Aktiver Tag</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{formatShortDate(selectedDay.date)}</p>
          <p className="mt-2 text-sm text-muted">{selectedDay.focus}</p>
        </Panel>
      </section>

      {statusMessage ? (
        <div className="mb-6 rounded-xl border border-coach-100 bg-coach-50 px-3 py-3 text-sm font-medium text-coach-800">
          {statusMessage}
        </div>
      ) : null}

      <div className="mb-6">
        <QuickFuelingPanel date={selectedDay.date} />
      </div>

      <section className="mb-6 grid gap-6">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-coach-600" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Geloggt am aktiven Tag</h2>
            </div>
            <Pill tone="amber">{selectedDayLogs.length} Einträge</Pill>
          </div>

          <MealLogList
            logs={selectedDayLogs}
            isLoading={logsLoading}
            error={logsError}
            emptyText="Noch nichts geloggt. Nutze den Chat oder einen Standard, um Fueling zum Tag hinzuzufügen."
            onUpdate={updateLog}
            onDelete={deleteLog}
          />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Rezepte</h2>
            <Pill tone="neutral">vorbereitet</Pill>
          </div>
          <p className="text-sm leading-6 text-muted">
            Rezepte sind als Datenmodell vorbereitet. Für die Bedienung bleibt Fueling aktuell bewusst bei Standardmahlzeiten, Chat-Schätzung und Tageslogs. Die Rezeptverwaltung sollte als eigener Sprint folgen, damit Portionen, Zutaten und Nährwerte sauber editierbar sind.
          </p>
        </Panel>
      </section>

      <details className="mb-6 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Wocheninformationen</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Fueling-Historie und Kalender</h2>
          </div>
          <Pill tone="blue">{weeklyLogs.logs.length} Logs</Pill>
        </summary>

        <div className="mt-5 grid gap-6">
          <WeekCalendar />

          <Panel>
            <div className="mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-coach-600" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Historie dieser Woche</h2>
            </div>
            <MealLogList
              logs={weeklyLogs.logs.slice(0, 8)}
              isLoading={weeklyLogs.isLoading}
              emptyText="Noch keine geloggten Mahlzeiten in dieser Woche."
              onUpdate={updateLog}
              onDelete={deleteLog}
            />
          </Panel>
        </div>
      </details>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <div className="grid gap-6">
          <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Fuelingstandards</h2>
              <Pill tone="green">{standardMealTemplates.length} Standards</Pill>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {standardMealTemplates.map((meal, index) => {
                const Icon = mealIcons[index % mealIcons.length];

                return (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => void addStandardMealToDay(meal, {
                      time: estimateMealLogTime(meal, selectedDay),
                      role: mealCategoryToRole(inferMealCategory(meal))
                    })}
                    className="rounded-xl border border-line px-3 py-3 text-left transition hover:border-coach-200 hover:bg-coach-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coach-50 text-coach-700">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{meal.name}</p>
                        <p className="mt-1 text-sm leading-5 text-muted">{meal.description}</p>
                        <p className="mt-2 text-xs font-semibold text-coach-700">{formatMealEstimate(meal)}</p>
                        <p className="mt-2 text-xs font-semibold text-muted">Antippen: geschätzt um {estimateMealLogTime(meal, selectedDay)} loggen</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold text-ink">Neue Mahlzeit</h2>
            <form onSubmit={submitTemplate} className="mt-4 grid gap-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Name der Standardmahlzeit"
              />
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Beschreibung"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Beschreibung der Standardmahlzeit"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={calories}
                  onChange={(event) => setCalories(event.target.value)}
                  inputMode="numeric"
                  placeholder="kcal"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Kalorien"
                />
                <input
                  value={protein}
                  onChange={(event) => setProtein(event.target.value)}
                  inputMode="numeric"
                  placeholder="Protein g"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Protein in Gramm"
                />
              </div>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Tags"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Tags"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={mealCategory}
                  onChange={(event) => setMealCategory(event.target.value as MealTemplate["category"])}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Fueling-Kategorie"
                >
                  {mealCategoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
                <div className="flex min-h-11 items-center rounded-xl border border-line bg-white px-3 text-sm text-muted">
                  Zeitvorschlag aus Kategorie und Training
                </div>
              </div>
              {addNewMealToDay ? (
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Uhrzeit
                  <input
                    type="time"
                    value={manualMealTime || estimateMealLogTime({
                      name: name || "Neue Mahlzeit",
                      description,
                      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
                      category: mealCategory
                    }, selectedDay)}
                    onChange={(event) => setManualMealTime(event.target.value)}
                    className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-coach-400"
                  />
                </label>
              ) : null}
              <div className="grid gap-2">
                <label className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-3 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={addNewMealToDay}
                    onChange={(event) => setAddNewMealToDay(event.target.checked)}
                    className="h-4 w-4 rounded border-line text-coach-600"
                  />
                  Direkt zum aktiven Tag hinzufügen
                </label>
                <label className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-3 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={saveMealAsStandard}
                    onChange={(event) => setSaveMealAsStandard(event.target.checked)}
                    className="h-4 w-4 rounded border-line text-coach-600"
                  />
                  Als Fuelingstandard speichern
                </label>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
              >
                {saveMealAsStandard ? <BookmarkPlus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Mahlzeit speichern
              </button>
            </form>
          </Panel>
        </div>

        <div className="grid gap-6 content-start">
          <Panel>
            <h2 className="text-lg font-semibold text-ink">Fueling-Hinweis</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {selectedDay.workouts.some((workout) => workout.sport === "running" && (workout.distanceKm ?? 0) >= 14)
                ? "Langer Lauf im Plan: Kohlenhydrate nicht erst nach dem Training lösen."
                : selectedDay.workouts.length > 0
                  ? "Trainingstag: Mahlzeiten vor und nach der Einheit bewusst platzieren."
                  : "Ruhiger Tag: Protein hoch halten, Kohlenhydrate flexibel verteilen."}
            </p>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function calculateMealLogTotals(logs: MealLog[]) {
  return logs.reduce((sum, log) => ({
    calories: sum.calories + log.values.calories,
    protein: sum.protein + log.values.proteinGrams,
    carbs: sum.carbs + log.values.carbohydrateGrams
  }), {
    calories: 0,
    protein: 0,
    carbs: 0
  });
}

function estimateProteinTarget(weightKg: number): number {
  return Math.round(weightKg * 1.9);
}

function estimateCarbsTarget(workoutCount: number): number {
  return workoutCount > 0 ? 250 : 180;
}

function useWeekMealLogs(dates: string[]) {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const datesKey = dates.join("|");

  useEffect(() => {
    let cancelled = false;
    const selectedDates = datesKey.split("|").filter(Boolean);

    async function loadLogs() {
      setIsLoading(true);

      try {
        const results = await Promise.all(selectedDates.map(async (date) => {
          const response = await fetch(`/api/nutrition/logs?date=${encodeURIComponent(date)}`);
          const result = await response.json() as { logs?: MealLog[]; source?: string };

          if (!response.ok) return [];
          if (result.source === "demo" || result.source === "anonymous") return loadLocalMealLogsForDate(date);

          return result.logs ?? [];
        }));

        if (!cancelled) {
          setLogs(results.flat().sort((left, right) => `${right.date}${right.time ?? ""}`.localeCompare(`${left.date}${left.time ?? ""}`)));
        }
      } catch {
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (selectedDates.length > 0) {
      void loadLogs();
    }

    function handleLogsUpdated(event: Event) {
      const detail = (event as CustomEvent<{ date?: string }>).detail;
      if (!detail?.date || selectedDates.includes(detail.date)) {
        void loadLogs();
      }
    }

    window.addEventListener(NUTRITION_LOGS_UPDATED_EVENT, handleLogsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(NUTRITION_LOGS_UPDATED_EVENT, handleLogsUpdated);
    };
  }, [datesKey]);

  return { logs, isLoading };
}

function formatMealEstimate(meal: MealTemplate): string {
  return `${formatRange(meal.estimatedCalories.min, meal.estimatedCalories.max)} kcal · ${formatRange(meal.estimatedProteinGrams.min, meal.estimatedProteinGrams.max)} g Protein`;
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}-${max}`;
}

function mealRoleToLogCategory(role: MealPlanSlot["role"]) {
  if (role === "breakfast") return "breakfast";
  if (role === "dinner") return "dinner";
  if (role === "pre_workout" || role === "post_workout") return "snack";

  return "lunch";
}

function midpoint(min?: number, max?: number): number {
  if (typeof min === "number" && typeof max === "number") return Math.round((min + max) / 2);
  if (typeof min === "number") return Math.round(min);
  if (typeof max === "number") return Math.round(max);

  return 0;
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : fallback;
}
