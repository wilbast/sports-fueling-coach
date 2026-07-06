"use client";

import { FormEvent, useState } from "react";
import { ArrowDown, ArrowUp, BookmarkPlus, Bot, CalendarRange, Dumbbell, Pencil, Plus, Salad, SlidersHorizontal, Trash2 } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import { inferMealCategory, mealCategoryLabel, mealCategoryOptions } from "@/domain/nutrition/meal-timing";
import type { MealTemplate } from "@/domain/nutrition/types";
import type { PlanningContext } from "@/domain/standards/types";
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
  WorkoutIntensity
} from "@/domain/training/types";
import { useAppState } from "@/features/app-state/app-state-provider";

const planningContextLabels: Record<PlanningContext, string> = {
  homeoffice: "Home-Office",
  office: "Büroarbeit",
  travel: "Reisetag",
  free: "Frei",
  vacation: "Urlaub"
};

const planningContexts = Object.entries(planningContextLabels).map(([value, label]) => ({
  value: value as PlanningContext,
  label
}));

export function ConfigurationView() {
  const {
    state,
    addPlanningStandard,
    removePlanningStandard,
    addWorkoutStandard,
    removeWorkoutStandard,
    addMealTemplate,
    updateMealTemplate,
    removeMealStandard,
    deleteMealTemplate,
    moveMealTemplate,
    saveCurrentWeekAsStandard,
    removeWeekStandard
  } = useAppState();
  const standardMeals = state.mealTemplates.filter((meal) => meal.isStandard !== false);

  const [planningName, setPlanningName] = useState("");
  const [planningContext, setPlanningContext] = useState<PlanningContext>("homeoffice");
  const [planningNote, setPlanningNote] = useState("");

  const [workoutName, setWorkoutName] = useState("");
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [sport, setSport] = useState<SportType>("running");
  const [startTime, setStartTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [distanceKm, setDistanceKm] = useState("");
  const [intensity, setIntensity] = useState<WorkoutIntensity>("easy");
  const [runningType, setRunningType] = useState<RunningWorkoutType>("easy_run");
  const [runningFocus, setRunningFocus] = useState<RunningFocus>("base");
  const [workoutDescription, setWorkoutDescription] = useState("");

  const [mealName, setMealName] = useState("");
  const [mealDescription, setMealDescription] = useState("");
  const [calories, setCalories] = useState("550");
  const [protein, setProtein] = useState("35");
  const [carbsGrams, setCarbsGrams] = useState("70");
  const [fatGrams, setFatGrams] = useState("20");
  const [mealCategory, setMealCategory] = useState<MealTemplate["category"]>("main");
  const [mealTags, setMealTags] = useState("standard, protein");
  const [mealEditingId, setMealEditingId] = useState<string | null>(null);
  const [isEstimatingMeal, setIsEstimatingMeal] = useState(false);
  const [mealEstimateNotice, setMealEstimateNotice] = useState<string | null>(null);

  const [weekName, setWeekName] = useState("");
  const [weekDescription, setWeekDescription] = useState("Planung, Training und Fueling aus der aktuellen Woche.");

  function submitPlanningStandard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = planningName.trim();
    if (!name) return;

    addPlanningStandard({
      name,
      context: planningContext,
      extraInfos: [],
      note: planningNote.trim() || undefined
    });
    setPlanningName("");
    setPlanningNote("");
  }

  function submitWorkoutStandard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = workoutTitle.trim();
    const name = workoutName.trim() || title;
    if (!title || !name) return;

    addWorkoutStandard({
      name,
      sport,
      title,
      startTime: startTime || undefined,
      durationMinutes: parseOptionalNumber(durationMinutes),
      distanceKm: sport === "running" ? parseOptionalNumber(distanceKm) : undefined,
      intensity,
      runningType: sport === "running" ? runningType : undefined,
      runningFocus: sport === "running" ? runningFocus : undefined,
      description: workoutDescription.trim() || createWorkoutDescription(sport, intensity)
    });
    setWorkoutName("");
    setWorkoutTitle("");
    setDistanceKm("");
    setWorkoutDescription("");
  }

  function submitMealStandard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = mealName.trim();
    const description = mealDescription.trim();
    if (!name || !description) return;

    const template = {
      name,
      description,
      caloriesMin: parseNumber(calories, 0),
      caloriesMax: parseNumber(calories, 0),
      proteinMin: parseNumber(protein, 0),
      proteinMax: parseNumber(protein, 0),
      carbsGrams: parseNumber(carbsGrams, 0),
      fatGrams: parseNumber(fatGrams, 0),
      category: mealCategory,
      nutritionSource: mealEstimateNotice ? "ai_estimate" as const : "manual" as const,
      nutritionConfidence: mealEstimateNotice ? "medium" as const : "manual" as const,
      nutritionRationale: mealEstimateNotice ?? "Manuell gepflegte Standardmahlzeit.",
      tags: mealTags.split(",").map((tag) => tag.trim()).filter(Boolean)
    };

    if (mealEditingId) {
      updateMealTemplate(mealEditingId, template);
    } else {
      addMealTemplate(template);
    }

    resetMealForm();
  }

  async function estimateMealStandard() {
    const input = [mealName, mealDescription].filter(Boolean).join(": ").trim();
    if (!input || isEstimatingMeal) return;

    setIsEstimatingMeal(true);
    setMealEstimateNotice(null);

    try {
      const response = await fetch("/api/nutrition/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
      });
      const result = await response.json() as {
        estimate?: {
          name: string;
          description?: string;
          calories: number;
          proteinGrams: number;
          carbohydrateGrams: number;
          fatGrams: number;
          confidence: "low" | "medium" | "high";
          rationale: string;
        };
      };
      const estimate = result.estimate;

      if (response.ok && estimate) {
        if (!mealName.trim()) setMealName(estimate.name);
        if (estimate.description) setMealDescription(estimate.description);
        setCalories(String(estimate.calories));
        setProtein(String(estimate.proteinGrams));
        setCarbsGrams(String(estimate.carbohydrateGrams));
        setFatGrams(String(estimate.fatGrams));
        setMealEstimateNotice(`KI-Schätzung (${confidenceLabel(estimate.confidence)}): ${estimate.rationale}`);
      } else {
        setMealEstimateNotice("KI-Schätzung konnte nicht geladen werden. Du kannst die Werte manuell pflegen.");
      }
    } catch {
      setMealEstimateNotice("KI-Schätzung konnte nicht geladen werden. Du kannst die Werte manuell pflegen.");
    } finally {
      setIsEstimatingMeal(false);
    }
  }

  function editMealStandard(meal: MealTemplate) {
    setMealEditingId(meal.id);
    setMealName(meal.name);
    setMealDescription(meal.description);
    setCalories(String(midpoint(meal.estimatedCalories.min, meal.estimatedCalories.max)));
    setProtein(String(midpoint(meal.estimatedProteinGrams.min, meal.estimatedProteinGrams.max)));
    setCarbsGrams(String(meal.estimatedCarbohydratesGrams?.min ?? 0));
    setFatGrams(String(meal.estimatedFatGrams?.min ?? 0));
    setMealCategory(inferMealCategory(meal));
    setMealTags(meal.tags.join(", "));
    setMealEstimateNotice(meal.nutritionRationale ?? null);
  }

  function resetMealForm() {
    setMealName("");
    setMealDescription("");
    setCalories("550");
    setProtein("35");
    setCarbsGrams("70");
    setFatGrams("20");
    setMealCategory("main");
    setMealTags("standard, protein");
    setMealEditingId(null);
    setMealEstimateNotice(null);
  }

  function submitWeekStandard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = weekName.trim();
    if (!name) return;

    saveCurrentWeekAsStandard(name, weekDescription.trim() || undefined);
    setWeekName("");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Standards"
        title="Standards verwalten"
        description="Gespeicherte Vorlagen nach Kategorie pflegen. Standards bleiben zentral, die Tagesplanung bleibt leicht."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <CategoryHeader
            icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
            title="Planungsstandards"
            count={state.standards.planning.length}
          />

          <div className="grid gap-2">
            {state.standards.planning.length === 0 ? (
              <EmptyState text="Noch keine Planungsstandards gespeichert." />
            ) : state.standards.planning.map((standard) => (
              <div key={standard.id} className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-3">
                <div>
                  <p className="font-semibold text-ink">{standard.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {planningContextLabels[standard.context]}{standard.note ? ` · ${standard.note}` : ""}
                  </p>
                </div>
                <DeleteButton label="Planungsstandard löschen" onClick={() => removePlanningStandard(standard.id)} />
              </div>
            ))}
          </div>

          <form onSubmit={submitPlanningStandard} className="mt-5 grid gap-3 rounded-xl bg-canvas p-3">
            <input
              value={planningName}
              onChange={(event) => setPlanningName(event.target.value)}
              placeholder="Name, z. B. Wochenende mit Familie"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Name des Planungsstandards"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={planningContext}
                onChange={(event) => setPlanningContext(event.target.value as PlanningContext)}
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Planungskontext"
              >
                {planningContexts.map((context) => (
                  <option key={context.value} value={context.value}>{context.label}</option>
                ))}
              </select>
              <input
                value={planningNote}
                onChange={(event) => setPlanningNote(event.target.value)}
                placeholder="Notiz"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Notiz zum Planungsstandard"
              />
            </div>
            <SubmitButton label="Planungsstandard hinzufügen" />
          </form>
        </Panel>

        <Panel>
          <CategoryHeader
            icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}
            title="Trainingsstandards"
            count={state.standards.workouts.length}
          />

          <div className="grid gap-2">
            {state.standards.workouts.length === 0 ? (
              <EmptyState text="Noch keine Trainingsstandards gespeichert." />
            ) : state.standards.workouts.map((template) => (
              <div key={template.id} className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-3">
                <div>
                  <p className="font-semibold text-ink">{template.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {describeWorkoutType(template)} · {template.startTime ?? "flexibel"} · {intensityLabels[template.intensity]}
                  </p>
                </div>
                <DeleteButton label="Trainingsstandard löschen" onClick={() => removeWorkoutStandard(template.id)} />
              </div>
            ))}
          </div>

          <form onSubmit={submitWorkoutStandard} className="mt-5 grid gap-3 rounded-xl bg-canvas p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={workoutName}
                onChange={(event) => setWorkoutName(event.target.value)}
                placeholder="Standardname"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Name des Trainingsstandards"
              />
              <input
                value={workoutTitle}
                onChange={(event) => setWorkoutTitle(event.target.value)}
                placeholder="Einheit, z. B. 8 km locker"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Trainingstitel"
              />
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
            <input
              value={workoutDescription}
              onChange={(event) => setWorkoutDescription(event.target.value)}
              placeholder="Beschreibung / Coach-Hinweis"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Beschreibung des Trainingsstandards"
            />
            <SubmitButton label="Trainingsstandard hinzufügen" />
          </form>
        </Panel>

        <Panel>
          <CategoryHeader
            icon={<Salad className="h-5 w-5" aria-hidden="true" />}
            title="Fuelingstandards"
            count={standardMeals.length}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            {standardMeals.length === 0 ? (
              <EmptyState text="Noch keine Fuelingstandards gespeichert." />
            ) : standardMeals.map((meal, index) => (
              <div key={meal.id} className="rounded-xl border border-line px-3 py-3">
                <div className="grid gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{meal.name}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{meal.description}</p>
                    <p className="mt-2 text-xs text-muted">
                      {mealCategoryLabel(inferMealCategory(meal))} · {meal.tags.join(" · ") || "ohne Tags"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <IconButton label="Nach oben" disabled={index === 0} onClick={() => moveMealTemplate(meal.id, "up")}>
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton label="Nach unten" disabled={index === standardMeals.length - 1} onClick={() => moveMealTemplate(meal.id, "down")}>
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton label="Fuelingstandard bearbeiten" onClick={() => editMealStandard(meal)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <button
                      type="button"
                      onClick={() => removeMealStandard(meal.id)}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-white px-2 text-xs font-semibold text-muted transition hover:bg-canvas hover:text-ink"
                    >
                      Ausblenden
                    </button>
                    <DeleteButton label="Fuelingstandard löschen" onClick={() => deleteMealTemplate(meal.id)} />
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold text-coach-700">
                  {formatRange(meal.estimatedCalories.min, meal.estimatedCalories.max)} kcal · {formatRange(meal.estimatedProteinGrams.min, meal.estimatedProteinGrams.max)} g Protein
                  {meal.estimatedCarbohydratesGrams ? ` · ${meal.estimatedCarbohydratesGrams.min} g Carbs` : ""}
                  {meal.estimatedFatGrams ? ` · ${meal.estimatedFatGrams.min} g Fett` : ""}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={submitMealStandard} className="mt-5 grid gap-3 rounded-xl bg-canvas p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                {mealEditingId ? "Standard bearbeiten" : "Standard hinzufügen"}
              </p>
              {mealEditingId ? (
                <button type="button" onClick={resetMealForm} className="text-xs font-semibold text-muted hover:text-ink">
                  Bearbeitung abbrechen
                </button>
              ) : null}
            </div>
            <input
              value={mealName}
              onChange={(event) => setMealName(event.target.value)}
              placeholder="Name, z. B. Proteinfrühstück"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Name des Fuelingstandards"
            />
            <input
              value={mealDescription}
              onChange={(event) => setMealDescription(event.target.value)}
              placeholder="Beschreibung"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Beschreibung des Fuelingstandards"
            />
            <select
              value={mealCategory}
              onChange={(event) => setMealCategory(event.target.value as MealTemplate["category"])}
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Kategorie des Fuelingstandards"
            >
              {mealCategoryOptions.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
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
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={carbsGrams}
                onChange={(event) => setCarbsGrams(event.target.value)}
                inputMode="numeric"
                placeholder="Kohlenhydrate g"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Kohlenhydrate in Gramm"
              />
              <input
                value={fatGrams}
                onChange={(event) => setFatGrams(event.target.value)}
                inputMode="numeric"
                placeholder="Fett g"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Fett in Gramm"
              />
            </div>
            <input
              value={mealTags}
              onChange={(event) => setMealTags(event.target.value)}
              placeholder="Tags"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Tags des Fuelingstandards"
            />
            {mealEstimateNotice ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                {mealEstimateNotice}
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={estimateMealStandard}
                disabled={isEstimatingMeal || (!mealName.trim() && !mealDescription.trim())}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-coach-200 bg-white px-4 text-sm font-semibold text-coach-800 transition hover:bg-coach-50 disabled:cursor-not-allowed disabled:text-muted"
              >
                <Bot className="h-4 w-4" aria-hidden="true" />
                {isEstimatingMeal ? "Schätzt..." : "KI schätzen lassen"}
              </button>
              <SubmitButton label={mealEditingId ? "Änderungen speichern" : "Fuelingstandard hinzufügen"} />
            </div>
          </form>
        </Panel>

        <Panel>
          <CategoryHeader
            icon={<CalendarRange className="h-5 w-5" aria-hidden="true" />}
            title="Standardwochen"
            count={state.standards.weeks.length}
          />

          <div className="grid gap-2">
            {state.standards.weeks.length === 0 ? (
              <EmptyState text="Noch keine Standardwochen gespeichert." />
            ) : state.standards.weeks.map((template) => (
              <div key={template.id} className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-3">
                <div>
                  <p className="font-semibold text-ink">{template.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {template.description} · {template.days.length} Tage
                  </p>
                </div>
                <DeleteButton label="Standardwoche löschen" onClick={() => removeWeekStandard(template.id)} />
              </div>
            ))}
          </div>

          <form onSubmit={submitWeekStandard} className="mt-5 grid gap-3 rounded-xl bg-canvas p-3">
            <input
              value={weekName}
              onChange={(event) => setWeekName(event.target.value)}
              placeholder="Name, z. B. Aufbauwoche mit langem Lauf"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Name der Standardwoche"
            />
            <input
              value={weekDescription}
              onChange={(event) => setWeekDescription(event.target.value)}
              placeholder="Beschreibung"
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
              aria-label="Beschreibung der Standardwoche"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
            >
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
              Aktuelle Woche als Standard speichern
            </button>
          </form>
        </Panel>
      </section>
    </div>
  );
}

type CategoryHeaderProps = {
  icon: React.ReactNode;
  title: string;
  count: number;
};

function CategoryHeader({ icon, title, count }: CategoryHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-coach-50 text-coach-700">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
      </div>
      <Pill tone="green">{count}</Pill>
    </div>
  );
}

type DeleteButtonProps = {
  label: string;
  onClick: () => void;
};

function DeleteButton({ label, onClick }: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-rose-50 hover:text-rose-700"
      aria-label={label}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

type IconButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function IconButton({ label, disabled = false, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={label}
    >
      {children}
    </button>
  );
}

type EmptyStateProps = {
  text: string;
};

function EmptyState({ text }: EmptyStateProps) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
      {text}
    </div>
  );
}

type SubmitButtonProps = {
  label: string;
};

function SubmitButton({ label }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function createWorkoutDescription(sport: SportType, intensity: WorkoutIntensity): string {
  if (sport === "running") return intensity === "hard"
    ? "Qualitätseinheit, Fueling vorher sichern"
    : "Laufeinheit im Wochenkontext steuern";
  if (sport === "strength") return "Krafttraining mit Protein- und Erholungsfokus";
  if (sport === "hiit") return "Intensive Einheit, Erholung danach ernst nehmen";

  return "Geplante Einheit als wiederverwendbarer Trainingsstandard";
}

function parseOptionalNumber(value: string): number | undefined {
  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : fallback;
}

function midpoint(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}-${max}`;
}

function confidenceLabel(confidence: "low" | "medium" | "high"): string {
  if (confidence === "high") return "hoch";
  if (confidence === "medium") return "mittel";

  return "niedrig";
}
