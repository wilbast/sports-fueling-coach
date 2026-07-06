"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Beef, BookmarkPlus, History, Pencil, Plus, Salad, Save, Soup, Trash2, Utensils, Wheat, X } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import type { MealLog, MealLogCategory } from "@/domain/nutrition/logs";
import { sourceLabel } from "@/domain/nutrition/logs";
import type { MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import { getDayPlanByDate } from "@/domain/planning/week";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { CoachRecommendationButton } from "@/features/coach/coach-recommendation-button";
import { QuickFuelingPanel } from "@/features/fueling/quick-fueling-panel";
import { useNutritionLogs } from "@/features/nutrition/use-nutrition-logs";

const mealIcons = [Salad, Beef, Soup, Wheat];
const mealLogCategories: Array<{ value: MealLogCategory; label: string }> = [
  { value: "breakfast", label: "Frühstück" },
  { value: "lunch", label: "Mittagessen" },
  { value: "dinner", label: "Abendessen" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Getränk" }
];

export function FuelingView() {
  const { state, addMealTemplate, addMealEntry, addMealSlot, removeMealSlot, saveMealTemplateAsStandard } = useAppState();
  const selectedDay = getDayPlanByDate(state.weekPlan, state.selectedDate);
  const standardMealTemplates = state.mealTemplates.filter((meal) => meal.isStandard !== false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("550");
  const [protein, setProtein] = useState("35");
  const [tags, setTags] = useState("standard, protein");
  const [saveMealAsStandard, setSaveMealAsStandard] = useState(true);
  const [addNewMealToDay, setAddNewMealToDay] = useState(true);
  const [newMealTime, setNewMealTime] = useState("12:30");
  const [newMealRole, setNewMealRole] = useState<MealPlanSlot["role"]>("lunch");
  const [slotTemplateId, setSlotTemplateId] = useState(standardMealTemplates[0]?.id ?? "");
  const [slotTime, setSlotTime] = useState("12:30");
  const [slotRole, setSlotRole] = useState<MealPlanSlot["role"]>("lunch");
  const selectedDayTotals = useMemo(() => calculateDayMealTotals(selectedDay.mealPlan, state.mealTemplates), [selectedDay.mealPlan, state.mealTemplates]);
  const { logs: selectedDayLogs, isLoading: logsLoading, error: logsError, updateLog, deleteLog } = useNutritionLogs(selectedDay.date);
  const weeklyLogs = useWeekMealLogs(state.weekPlan.days.map((day) => day.date));
  const selectedDayLoggedTotals = useMemo(() => calculateMealLogTotals(selectedDayLogs), [selectedDayLogs]);

  function submitTemplate(event: FormEvent<HTMLFormElement>) {
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
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    };

    if (addNewMealToDay) {
      addMealEntry(selectedDay.date, template, {
        time: newMealTime,
        role: newMealRole
      }, { saveAsStandard: saveMealAsStandard });
    } else if (saveMealAsStandard) {
      addMealTemplate(template);
    } else {
      return;
    }

    setName("");
    setDescription("");
    setSaveMealAsStandard(true);
  }

  function submitSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slotTemplateId || !slotTime) return;

    addMealSlot(selectedDay.date, {
      time: slotTime,
      mealTemplateId: slotTemplateId,
      role: slotRole
    });
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
            label="KI-Empfehlung"
          />
        }
      />

      <WeekCalendar />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Geplant</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{selectedDayTotals.calories}</p>
          <p className="mt-2 text-sm text-muted">aus geplanten Mahlzeiten</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Geloggt</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{selectedDayLoggedTotals.calories}</p>
          <p className="mt-2 text-sm text-muted">{selectedDayLogs.length} Einträge am aktiven Tag</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Aktiver Tag</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{formatShortDate(selectedDay.date)}</p>
          <p className="mt-2 text-sm text-muted">{selectedDay.focus}</p>
        </Panel>
      </section>

      <div className="mb-6">
        <QuickFuelingPanel date={selectedDay.date} />
      </div>

      <section className="mb-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
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
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-coach-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Historie dieser Woche</h2>
          </div>
          <div className="grid gap-2">
            {weeklyLogs.isLoading ? (
              <p className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">Historie wird geladen...</p>
            ) : weeklyLogs.logs.length === 0 ? (
              <p className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">Noch keine geloggten Mahlzeiten in dieser Woche.</p>
            ) : weeklyLogs.logs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-xl border border-line px-3 py-3">
                <p className="text-sm font-semibold text-ink">{formatShortDate(log.date)} · {log.name}</p>
                <p className="mt-1 text-xs text-muted">{log.values.calories} kcal · {log.values.proteinGrams} g Protein · {sourceLabel(log.source, log.manuallyConfirmed)}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Rezepte</h2>
            <Pill tone="neutral">vorbereitet</Pill>
          </div>
          <p className="text-sm leading-6 text-muted">
            Rezepte sind als Datenmodell vorbereitet. Für die Bedienung bleibt Fueling aktuell bewusst bei Standardmahlzeiten, Chat-Schätzung und Tageslogs. Die Rezeptverwaltung sollte als eigener Sprint folgen, damit Portionen, Zutaten und Nährwerte sauber editierbar sind.
          </p>
        </Panel>
      </section>

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
                    onClick={() => addMealSlot(selectedDay.date, {
                      time: inferNextMealTime(selectedDay.mealPlan.length),
                      role: inferMealRole(meal),
                      mealTemplateId: meal.id
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
                <input
                  value={newMealTime}
                  onChange={(event) => setNewMealTime(event.target.value)}
                  type="time"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Zeit für neue Mahlzeit"
                />
                <select
                  value={newMealRole}
                  onChange={(event) => setNewMealRole(event.target.value as MealPlanSlot["role"])}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Rolle der neuen Mahlzeit"
                >
                  {(["breakfast", "lunch", "pre_workout", "post_workout", "dinner"] as MealPlanSlot["role"][]).map((role) => (
                    <option key={role} value={role}>{roleLabel(role)}</option>
                  ))}
                </select>
              </div>
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Tagesplan</h2>
              <Pill tone="amber">{selectedDay.mealPlan.length} Mahlzeiten</Pill>
            </div>

            <div className="grid gap-3">
              {selectedDay.mealPlan.map((slot, index) => {
                const meal = state.mealTemplates.find((template) => template.id === slot.mealTemplateId);

                return (
                  <div key={`${slot.time}-${slot.mealTemplateId}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-3">
                    <div>
                      <p className="font-semibold text-ink">{meal?.name ?? "Flexible Mahlzeit"}</p>
                      <p className="mt-1 text-sm text-muted">{slot.time} · {roleLabel(slot.role)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {meal && meal.isStandard === false ? (
                        <button
                          type="button"
                          onClick={() => saveMealTemplateAsStandard(meal.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-coach-700"
                          aria-label="Als Fuelingstandard speichern"
                        >
                          <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeMealSlot(selectedDay.date, index)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                        aria-label="Mahlzeit entfernen"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submitSlot} className="mt-5 grid gap-3 rounded-xl bg-canvas p-3">
              <select
                value={slotTemplateId}
                onChange={(event) => setSlotTemplateId(event.target.value)}
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Mahlzeit auswählen"
              >
                {standardMealTemplates.map((meal) => (
                  <option key={meal.id} value={meal.id}>{meal.name}</option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={slotTime}
                  onChange={(event) => setSlotTime(event.target.value)}
                  type="time"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Zeit"
                />
                <select
                  value={slotRole}
                  onChange={(event) => setSlotRole(event.target.value as MealPlanSlot["role"])}
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Rolle"
                >
                  {(["breakfast", "lunch", "pre_workout", "post_workout", "dinner"] as MealPlanSlot["role"][]).map((role) => (
                    <option key={role} value={role}>{roleLabel(role)}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Zum Tag hinzufügen
              </button>
            </form>
          </Panel>

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

function calculateDayMealTotals(slots: MealPlanSlot[], mealTemplates: MealTemplate[]) {
  const totals = slots.reduce((sum, slot) => {
    const meal = mealTemplates.find((template) => template.id === slot.mealTemplateId);
    if (!meal) return sum;

    return {
      caloriesMin: sum.caloriesMin + meal.estimatedCalories.min,
      caloriesMax: sum.caloriesMax + meal.estimatedCalories.max,
      proteinMin: sum.proteinMin + meal.estimatedProteinGrams.min,
      proteinMax: sum.proteinMax + meal.estimatedProteinGrams.max
    };
  }, { caloriesMin: 0, caloriesMax: 0, proteinMin: 0, proteinMax: 0 });

  return {
    calories: `${formatRange(totals.caloriesMin, totals.caloriesMax)} kcal`,
    protein: `${formatRange(totals.proteinMin, totals.proteinMax)} g`
  };
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

function MealLogList({
  logs,
  isLoading,
  error,
  emptyText,
  onUpdate,
  onDelete
}: {
  logs: MealLog[];
  isLoading: boolean;
  error: string | null;
  emptyText: string;
  onUpdate: (input: {
    id: string;
    date: string;
    time?: string;
    name: string;
    description?: string;
    source: MealLog["source"];
    values: MealLog["values"];
    confidence: MealLog["confidence"];
    rationale?: string;
    manuallyConfirmed?: boolean;
    category?: MealLogCategory;
    isMainMeal?: boolean;
  }) => Promise<MealLog | null>;
  onDelete: (id: string, date?: string) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">Mahlzeiten werden geladen...</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</p>;
  }

  if (logs.length === 0) {
    return <p className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">{emptyText}</p>;
  }

  return (
    <div className="grid gap-2">
      {logs.map((log) => (
        <MealLogCard
          key={log.id}
          log={log}
          isEditing={editingId === log.id}
          onEdit={() => setEditingId(log.id)}
          onCancel={() => setEditingId(null)}
          onUpdate={async (input) => {
            const updated = await onUpdate(input);
            if (updated) setEditingId(null);
          }}
          onDelete={async () => {
            const deleted = await onDelete(log.id, log.date);
            if (deleted) setEditingId(null);
          }}
        />
      ))}
    </div>
  );
}

function MealLogCard({
  log,
  isEditing,
  onEdit,
  onCancel,
  onUpdate,
  onDelete
}: {
  log: MealLog;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onUpdate: (input: {
    id: string;
    date: string;
    time?: string;
    name: string;
    description?: string;
    source: MealLog["source"];
    values: MealLog["values"];
    confidence: MealLog["confidence"];
    rationale?: string;
    manuallyConfirmed?: boolean;
    category?: MealLogCategory;
    isMainMeal?: boolean;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [time, setTime] = useState(log.time ?? "");
  const [name, setName] = useState(log.name);
  const [description, setDescription] = useState(log.description ?? "");
  const [category, setCategory] = useState<MealLogCategory>(log.category);
  const [isMainMeal, setIsMainMeal] = useState(log.isMainMeal);
  const [calories, setCalories] = useState(String(log.values.calories));
  const [protein, setProtein] = useState(String(log.values.proteinGrams));
  const [carbs, setCarbs] = useState(String(log.values.carbohydrateGrams));
  const [fat, setFat] = useState(String(log.values.fatGrams ?? 0));

  useEffect(() => {
    if (!isEditing) return;
    setTime(log.time ?? "");
    setName(log.name);
    setDescription(log.description ?? "");
    setCategory(log.category);
    setIsMainMeal(log.isMainMeal);
    setCalories(String(log.values.calories));
    setProtein(String(log.values.proteinGrams));
    setCarbs(String(log.values.carbohydrateGrams));
    setFat(String(log.values.fatGrams ?? 0));
  }, [isEditing, log]);

  if (isEditing) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          void onUpdate({
            id: log.id,
            date: log.date,
            time,
            name: name.trim(),
            description: description.trim() || undefined,
            source: log.source,
            values: {
              calories: parseNumber(calories, 0),
              proteinGrams: parseNumber(protein, 0),
              carbohydrateGrams: parseNumber(carbs, 0),
              fatGrams: parseNumber(fat, 0)
            },
            confidence: "manual",
            rationale: log.rationale ?? undefined,
            manuallyConfirmed: true,
            category,
            isMainMeal
          });
        }}
        className="rounded-xl border border-coach-100 bg-white px-3 py-3"
      >
        <div className="grid gap-2 sm:grid-cols-[0.5fr_1fr]">
          <input value={time} onChange={(event) => setTime(event.target.value)} type="time" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Uhrzeit" />
          <input value={name} onChange={(event) => setName(event.target.value)} className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Name" />
        </div>
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Beschreibung" className="mt-2 min-h-10 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Beschreibung" />
        <div className="mt-2 grid gap-2 sm:grid-cols-5">
          <select value={category} onChange={(event) => setCategory(event.target.value as MealLogCategory)} className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Kategorie">
            {mealLogCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input value={calories} onChange={(event) => setCalories(event.target.value)} inputMode="numeric" placeholder="kcal" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Kalorien" />
          <input value={protein} onChange={(event) => setProtein(event.target.value)} inputMode="numeric" placeholder="Protein" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Protein" />
          <input value={carbs} onChange={(event) => setCarbs(event.target.value)} inputMode="numeric" placeholder="Carbs" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Kohlenhydrate" />
          <input value={fat} onChange={(event) => setFat(event.target.value)} inputMode="numeric" placeholder="Fett" className="min-h-10 rounded-lg border border-line px-2 text-sm outline-none focus:border-coach-400" aria-label="Fett" />
        </div>
        <label className="mt-2 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={isMainMeal} onChange={(event) => setIsMainMeal(event.target.checked)} className="h-4 w-4 rounded border-line text-coach-600" />
          Hauptmahlzeit
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-coach-600 px-3 text-xs font-semibold text-white">
            <Save className="h-4 w-4" aria-hidden="true" />
            Speichern
          </button>
          <button type="button" onClick={onCancel} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted">
            <X className="h-4 w-4" aria-hidden="true" />
            Abbrechen
          </button>
          <button type="button" onClick={() => void onDelete()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 text-xs font-semibold text-rose-700">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Löschen
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl border border-line px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{log.name}</p>
            <Pill tone="blue">{mealLogCategoryLabel(log.category)}</Pill>
            {log.isMainMeal ? <Pill tone="green">Hauptmahlzeit</Pill> : null}
          </div>
          <p className="mt-1 text-sm text-muted">{log.time ?? "ohne Uhrzeit"} · {sourceLabel(log.source, log.manuallyConfirmed)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={log.manuallyConfirmed ? "green" : "amber"}>
            {log.confidence === "manual" ? "bestätigt" : "Schätzung"}
          </Pill>
          <button type="button" onClick={onEdit} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink" aria-label="Mahlzeit bearbeiten">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-coach-700">
        {log.values.calories} kcal · {log.values.proteinGrams} g Protein · {log.values.carbohydrateGrams} g Carbs{typeof log.values.fatGrams === "number" ? ` · ${log.values.fatGrams} g Fett` : ""}
      </p>
    </div>
  );
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
          const result = await response.json() as { logs?: MealLog[] };

          return response.ok ? result.logs ?? [] : [];
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

    return () => {
      cancelled = true;
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

function mealLogCategoryLabel(category: MealLogCategory): string {
  return mealLogCategories.find((item) => item.value === category)?.label ?? "Snack";
}

function roleLabel(role: MealPlanSlot["role"]): string {
  const labels: Record<MealPlanSlot["role"], string> = {
    breakfast: "Frühstück",
    lunch: "Lunch",
    pre_workout: "Pre-Workout",
    post_workout: "Post-Workout",
    dinner: "Abendessen"
  };

  return labels[role];
}

function inferNextMealTime(mealCount: number): string {
  const times = ["08:00", "12:30", "16:30", "19:00", "21:00"];
  return times[Math.min(mealCount, times.length - 1)];
}

function inferMealRole(meal: MealTemplate): MealPlanSlot["role"] {
  const text = `${meal.name} ${meal.tags.join(" ")}`.toLowerCase();
  if (text.includes("breakfast") || text.includes("frühstück")) return "breakfast";
  if (text.includes("pre")) return "pre_workout";
  if (text.includes("post") || text.includes("recovery")) return "post_workout";
  if (text.includes("dinner") || text.includes("abend")) return "dinner";

  return "lunch";
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : fallback;
}
