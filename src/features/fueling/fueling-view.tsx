"use client";

import { FormEvent, useMemo, useState } from "react";
import { Beef, BookmarkPlus, Plus, Salad, Soup, Trash2, Wheat } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import type { MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import { getDayPlanByDate } from "@/domain/planning/week";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { QuickFuelingPanel } from "@/features/fueling/quick-fueling-panel";

const mealIcons = [Salad, Beef, Soup, Wheat];

export function FuelingView() {
  const { state, addMealTemplate, addMealEntry, addMealSlot, removeMealSlot, saveMealTemplateAsStandard } = useAppState();
  const selectedDay = getDayPlanByDate(state.weekPlan, state.selectedDate);
  const standardMealTemplates = state.mealTemplates.filter((meal) => meal.isStandard !== false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [caloriesMin, setCaloriesMin] = useState("450");
  const [caloriesMax, setCaloriesMax] = useState("650");
  const [proteinMin, setProteinMin] = useState("30");
  const [proteinMax, setProteinMax] = useState("45");
  const [tags, setTags] = useState("standard, protein");
  const [saveMealAsStandard, setSaveMealAsStandard] = useState(true);
  const [addNewMealToDay, setAddNewMealToDay] = useState(true);
  const [newMealTime, setNewMealTime] = useState("12:30");
  const [newMealRole, setNewMealRole] = useState<MealPlanSlot["role"]>("lunch");
  const [slotTemplateId, setSlotTemplateId] = useState(standardMealTemplates[0]?.id ?? "");
  const [slotTime, setSlotTime] = useState("12:30");
  const [slotRole, setSlotRole] = useState<MealPlanSlot["role"]>("lunch");
  const selectedDayTotals = useMemo(() => calculateDayMealTotals(selectedDay.mealPlan, state.mealTemplates), [selectedDay.mealPlan, state.mealTemplates]);

  function submitTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName || !trimmedDescription) return;

    const template = {
      name: trimmedName,
      description: trimmedDescription,
      caloriesMin: parseNumber(caloriesMin, 0),
      caloriesMax: parseNumber(caloriesMax, 0),
      proteinMin: parseNumber(proteinMin, 0),
      proteinMax: parseNumber(proteinMax, 0),
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
      />

      <WeekCalendar />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Tageskalorien</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{selectedDayTotals.calories}</p>
          <p className="mt-2 text-sm text-muted">aus geplanten Mahlzeiten</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Protein</p>
          <p className="mt-3 text-2xl font-semibold text-ink">{selectedDayTotals.protein}</p>
          <p className="mt-2 text-sm text-muted">grober Tagesrahmen</p>
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
                  value={caloriesMin}
                  onChange={(event) => setCaloriesMin(event.target.value)}
                  inputMode="numeric"
                  placeholder="kcal min"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Kalorien Minimum"
                />
                <input
                  value={caloriesMax}
                  onChange={(event) => setCaloriesMax(event.target.value)}
                  inputMode="numeric"
                  placeholder="kcal max"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Kalorien Maximum"
                />
                <input
                  value={proteinMin}
                  onChange={(event) => setProteinMin(event.target.value)}
                  inputMode="numeric"
                  placeholder="Protein min"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Protein Minimum"
                />
                <input
                  value={proteinMax}
                  onChange={(event) => setProteinMax(event.target.value)}
                  inputMode="numeric"
                  placeholder="Protein max"
                  className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                  aria-label="Protein Maximum"
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
    calories: `${totals.caloriesMin}-${totals.caloriesMax} kcal`,
    protein: `${totals.proteinMin}-${totals.proteinMax} g`
  };
}

function formatMealEstimate(meal: MealTemplate): string {
  return `${meal.estimatedCalories.min}-${meal.estimatedCalories.max} kcal · ${meal.estimatedProteinGrams.min}-${meal.estimatedProteinGrams.max} g Protein`;
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
