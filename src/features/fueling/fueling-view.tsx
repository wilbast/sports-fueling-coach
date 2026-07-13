"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Beef, BookmarkPlus, Flame, History, MessageCircle, Plus, Salad, Soup, Utensils, Wheat } from "lucide-react";
import { PageHeader, Panel, Pill } from "@/components/ui";
import { PerformanceHero, RecommendationBand, SignalCard, SignalGrid, TrendBars } from "@/components/performance/performance-ui";
import { createDailyBriefing } from "@/domain/briefing/create-daily-briefing";
import { createDailyNutritionSummary, type DailyNutritionSummary, type MealLog } from "@/domain/nutrition/logs";
import { estimateMealLogTime, inferMealCategory, mealCategoryOptions, mealCategoryToRole } from "@/domain/nutrition/meal-timing";
import type { MealPlanSlot, MealTemplate } from "@/domain/nutrition/types";
import { getDayPlanByDate } from "@/domain/planning/week";
import { WeekCalendar } from "@/features/calendar/week-calendar";
import { useAppState } from "@/features/app-state/app-state-provider";
import { useExternalActivities } from "@/features/activities/external-activities";
import { CoachChatPanel } from "@/features/coach/coach-chat-panel";
import { CoachRecommendationButton } from "@/features/coach/coach-recommendation-button";
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
  const {
    activitiesByDate,
    garminDailyEnergyByDate
  } = useExternalActivities(selectedDay.date, selectedDay.date);
  const briefing = useMemo(() => createDailyBriefing({
    profile: state.profile,
    goals: state.goals,
    dayPlan: selectedDay,
    mealTemplates: state.mealTemplates,
    actualActivities: activitiesByDate[selectedDay.date] ?? [],
    garminDailyTotalCalories: garminDailyEnergyByDate[selectedDay.date]?.totalCalories,
    energySettings: state.energySettings
  }), [activitiesByDate, garminDailyEnergyByDate, selectedDay, state.energySettings, state.goals, state.mealTemplates, state.profile]);
  const nutritionSummary = useMemo(
    () => createDailyNutritionSummary(selectedDayLogs, briefing.nutritionTarget),
    [briefing.nutritionTarget, selectedDayLogs]
  );
  const fuelingScore = calculateFuelingScore(nutritionSummary.progress);
  const weeklyNutrition = useMemo(
    () => state.weekPlan.days.map((day) => calculateMealLogTotals(weeklyLogs.logs.filter((log) => log.date === day.date))),
    [state.weekPlan.days, weeklyLogs.logs]
  );

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
        title="Fueling steuern"
        description="Essen loggen, Tagesbedarf verstehen und die nächste Mahlzeit passend zur Belastung wählen."
        action={
          <div className="grid gap-2 sm:grid-cols-2">
            <CoachRecommendationButton
              pageContext="fueling"
              prompt="Gib mir eine kurze Fueling-Empfehlung für den aktiven Tag: bisher gegessen, Zielwerte, Training und was als nächstes sinnvoll wäre. Keine Planänderung."
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
        eyebrow={`Fueling-Status · ${formatShortDate(selectedDay.date)}`}
        title={createFuelingStatusTitle(nutritionSummary.deltas.proteinRemaining, nutritionSummary.deltas.carbsRemaining, selectedDayLogs.length)}
        summary={createFuelingNextStep(nutritionSummary, selectedDay.workouts.length)}
        score={selectedDayLogs.length ? fuelingScore : undefined}
        scoreLabel="Zielabdeckung"
        tone={fuelingScore >= 75 ? "green" : fuelingScore >= 45 ? "amber" : "neutral"}
        confidence={selectedDayLogs.length ? "aus geloggten Mahlzeiten" : "noch keine Logs"}
        reasons={[`${selectedDayLogs.length} Einträge`, `${selectedDay.workouts.length} Einheiten geplant`, briefing.nutritionTarget.energyExpenditure.source === "garmin" ? "Garmin-Gesamtverbrauch" : "Verbrauch geschätzt"]}
      />

      <SignalGrid>
        <SignalCard icon={Utensils} label="Aufgenommen" value={formatNumber(nutritionSummary.intake.calories)} unit="kcal" detail={`Ziel ${formatNumber(nutritionSummary.targets.caloriesMin)}–${formatNumber(nutritionSummary.targets.caloriesMax)} kcal`} tone="blue" progress={nutritionSummary.progress.calories} />
        <SignalCard icon={Flame} label="Gesamtverbrauch" value={formatNumber(nutritionSummary.expenditureCalories)} unit="kcal" detail={describeEnergySource(briefing.nutritionTarget.energyExpenditure.source)} tone="amber" />
        <SignalCard icon={Beef} label="Protein" value={`${formatNumber(nutritionSummary.intake.proteinGrams)} / ${formatNumber(nutritionSummary.targets.proteinMin)}`} unit="g" detail={`${formatProteinPerKg(nutritionSummary.intake.proteinGrams, state.profile.bodyMetrics.weightKg)} g/kg · noch ca. ${formatNumber(nutritionSummary.deltas.proteinRemaining)} g`} tone="green" progress={nutritionSummary.progress.protein} />
        <SignalCard icon={Wheat} label="Kohlenhydrate" value={`${formatNumber(nutritionSummary.intake.carbohydrateGrams)} / ${formatNumber(nutritionSummary.targets.carbsMin)}`} unit="g" detail={`Noch ca. ${formatNumber(nutritionSummary.deltas.carbsRemaining)} g`} tone="amber" progress={nutritionSummary.progress.carbs} />
      </SignalGrid>

      <RecommendationBand
        title="Nächste sinnvolle Fueling-Entscheidung"
        body={createFuelingNextStep(nutritionSummary, selectedDay.workouts.length)}
        reasons={[briefing.focus, `${formatNumber(nutritionSummary.deltas.proteinRemaining)} g Protein offen`, `${formatNumber(nutritionSummary.deltas.carbsRemaining)} g Carbs offen`]}
        tone={nutritionSummary.deltas.proteinRemaining > 30 || nutritionSummary.deltas.carbsRemaining > 80 ? "amber" : "green"}
      />

      {statusMessage ? (
        <div className="mb-6 rounded-xl border border-coach-100 bg-coach-50 px-3 py-3 text-sm font-medium text-coach-800">
          {statusMessage}
        </div>
      ) : null}

      <div className="mb-6">
        <QuickFuelingPanel date={selectedDay.date} />
      </div>

      <section className="mb-6">
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Tagesaufnahme</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">Kalorien dieser Woche</h3>
              </div>
              <Pill tone="blue">echte Logs</Pill>
            </div>
            <TrendBars
              values={weeklyNutrition.map((day) => day.calories)}
              labels={state.weekPlan.days.map((day) => formatWeekday(day.date))}
              tone="blue"
              formatValue={(value) => `${formatNumber(value)} kcal`}
            />
            <p className="mt-3 text-xs leading-5 text-muted">Leere Tage bedeuten fehlende Logs, nicht automatisch Fasten oder ein Kaloriendefizit.</p>
          </Panel>

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
          <CoachChatPanel
            title="Coach fragen"
            intro="Frag nach Mahlzeiten, Snacks, Rezeptideen oder Fueling-Timing für den ausgewählten Tag."
            compact
            pageContext="fueling"
          />

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

function calculateFuelingScore(progress: DailyNutritionSummary["progress"]): number {
  const calories = Math.min(100, progress.calories);
  const protein = Math.min(100, progress.protein);
  const carbs = Math.min(100, progress.carbs);
  return Math.round(calories * 0.3 + protein * 0.4 + carbs * 0.3);
}

function createFuelingStatusTitle(proteinRemaining: number, carbsRemaining: number, logCount: number): string {
  if (!logCount) return "Erste Mahlzeit loggen, dann wird es persönlich";
  if (proteinRemaining <= 15 && carbsRemaining <= 35) return "Tagesziele sind weitgehend abgesichert";
  if (proteinRemaining > 30) return "Protein ist heute der wichtigste Hebel";
  if (carbsRemaining > 80) return "Kohlenhydrate gezielt ums Training platzieren";
  return "Noch eine ausgewogene Mahlzeit einplanen";
}

function createFuelingNextStep(summary: DailyNutritionSummary, workoutCount: number): string {
  if (summary.intake.calories === 0) {
    return workoutCount > 0
      ? "Logge die erste Mahlzeit. Danach kann der Coach Energie und Makros passend zur heutigen Belastung steuern."
      : "Logge die erste Mahlzeit, damit Tagesbilanz und Empfehlungen nicht auf Annahmen beruhen.";
  }
  if (summary.deltas.proteinRemaining > 30 && summary.deltas.carbsRemaining > 80) {
    return workoutCount > 0
      ? `Als Nächstes etwa 30–40 g Protein plus eine gut verträgliche Kohlenhydratquelle einplanen. Noch offen: ca. ${formatNumber(summary.deltas.proteinRemaining)} g Protein und ${formatNumber(summary.deltas.carbsRemaining)} g Kohlenhydrate.`
      : "Eine proteinreiche Hauptmahlzeit schließen; Kohlenhydrate kannst du ohne harte Einheit nach Hunger verteilen.";
  }
  if (summary.deltas.proteinRemaining > 20) return "Die nächste Mahlzeit sollte eine klare Proteinquelle enthalten. Kalorien nicht isoliert auffüllen.";
  if (summary.deltas.carbsRemaining > 60 && workoutCount > 0) return "Die verbleibenden Kohlenhydrate vor oder nach der Einheit platzieren, statt sie spät zufällig nachzuholen.";
  return "Die wichtigsten Ziele sind gut abgedeckt. Den Rest nach Hunger, Tagesverbrauch und morgiger Belastung steuern.";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

function formatProteinPerKg(proteinGrams: number, weightKg: number): string {
  if (!weightKg) return "–";
  return (proteinGrams / weightKg).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
}

function describeEnergySource(source: "garmin" | "none" | "planned" | "actual" | "manual_forecast"): string {
  if (source === "garmin") return "Garmin-Gesamtverbrauch führt";
  if (source === "manual_forecast") return "Manueller Tagesforecast";
  if (source === "actual") return "Basis plus tatsächliche Aktivitäten";
  if (source === "planned") return "Basis plus geplante Aktivitäten";
  return "Geschätzter Basisverbrauch";
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
