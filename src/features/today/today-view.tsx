"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock3,
  Dumbbell,
  Flame,
  ImagePlus,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Target,
  Utensils,
  Wheat
} from "lucide-react";
import { PageHeader, Panel, Pill, StatCard } from "@/components/ui";
import type { DailyBriefing } from "@/domain/briefing/types";
import type { DailyNutritionSummary, MealLog } from "@/domain/nutrition/logs";
import { ExternalActivityList, type ExternalActivitySummary } from "@/features/activities/external-activities";
import { CoachChatPanel } from "@/features/coach/coach-chat-panel";
import { CoachRecommendationButton } from "@/features/coach/coach-recommendation-button";
import { MealLogList, type MealLogUpdateInput } from "@/features/nutrition/meal-log-list";

type TodayViewProps = {
  briefing: DailyBriefing;
  calendar?: React.ReactNode;
  externalActivities?: ExternalActivitySummary[];
  externalActivitiesLoading?: boolean;
  externalActivitiesError?: string | null;
  nutritionLogs?: MealLog[];
  nutritionSummary: DailyNutritionSummary;
  nutritionLogsLoading?: boolean;
  nutritionLogsError?: string | null;
  onNutritionLogUpdate?: (input: MealLogUpdateInput) => Promise<MealLog | null>;
  onNutritionLogDelete?: (id: string, date?: string) => Promise<boolean>;
  tomorrowHint?: string;
  manualForecastCalories?: number;
  onManualForecastCaloriesChange?: (calories?: number) => void;
  fuelingQuickAdd?: React.ReactNode;
};

type CoachRecommendation = {
  id: string;
  title: string;
  body: string;
  prompt: string;
};

export function TodayView({
  briefing,
  calendar,
  externalActivities = [],
  externalActivitiesLoading = false,
  externalActivitiesError = null,
  nutritionLogs = [],
  nutritionSummary,
  nutritionLogsLoading = false,
  nutritionLogsError = null,
  onNutritionLogUpdate,
  onNutritionLogDelete,
  tomorrowHint,
  manualForecastCalories,
  onManualForecastCaloriesChange,
  fuelingQuickAdd
}: TodayViewProps) {
  const [activeRecommendation, setActiveRecommendation] = useState<CoachRecommendation | null>(null);
  const coachRecommendations = createCoachRecommendations(briefing, nutritionSummary);
  const fatTarget = createFatTarget(nutritionSummary);
  const fatProgress = percent(nutritionSummary.intake.fatGrams, fatTarget);

  return (
    <div>
      <PageHeader
        eyebrow={briefing.dateLabel}
        title={briefing.greeting}
        description={briefing.lead}
        action={
          <div className="grid gap-2 sm:grid-cols-2">
            <CoachRecommendationButton
              pageContext="today"
              prompt="Gib mir eine kurze Coach-Empfehlung für den heutigen Tag: wichtigste Priorität, Fueling, Training und was noch fehlt. Keine Planänderung."
            />
            <Link
              href="/coach"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-coach-100 hover:text-coach-700"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Coach fragen
            </Link>
          </div>
        }
      />

      {calendar}

      <section className="mb-6 rounded-3xl bg-ink p-5 text-white shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                Fokus: {briefing.focus}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                Energiebedarf: {briefing.nutritionTarget.energyDemand}
              </span>
              {briefing.raceContext ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  {briefing.raceContext}
                </span>
              ) : null}
            </div>
            <h2 className="max-w-3xl text-2xl font-semibold tracking-normal sm:text-3xl">
              {briefing.heroTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Der Coach bewertet Training, Alltag und Fueling als ruhigen Entscheidungsrahmen
              für den Tag.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
              Belastbarkeit
            </p>
            <p className="mt-2 text-xl font-semibold">{briefing.readiness}</p>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-3 md:grid-cols-3">
        {briefing.metrics.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            unit={metric.unit}
            note={metric.note}
            tone={metric.tone}
          />
        ))}
      </section>

      <Panel className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-coach-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink">Tagesfortschritt</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <BalanceRow
            label="Kalorien"
            value={`${formatNumber(nutritionSummary.intake.calories)} kcal`}
            detail={`${formatNumber(Math.max(0, nutritionSummary.targets.caloriesMax - nutritionSummary.intake.calories))} kcal bis Zielobergrenze`}
            progress={nutritionSummary.progress.calories}
          />
          <BalanceRow
            label="Protein"
            value={`${formatNumber(nutritionSummary.intake.proteinGrams)} / ${formatNumber(nutritionSummary.targets.proteinMin)} g`}
            detail={`Rest ca. ${formatNumber(nutritionSummary.deltas.proteinRemaining)} g`}
            progress={nutritionSummary.progress.protein}
          />
          <BalanceRow
            label="Carbs"
            value={`${formatNumber(nutritionSummary.intake.carbohydrateGrams)} / ${formatNumber(nutritionSummary.targets.carbsMin)} g`}
            detail={`Rest ca. ${formatNumber(nutritionSummary.deltas.carbsRemaining)} g`}
            progress={nutritionSummary.progress.carbs}
          />
          <BalanceRow
            label="Fett"
            value={`${formatNumber(nutritionSummary.intake.fatGrams)} / ${formatNumber(fatTarget)} g`}
            detail={`Rest ca. ${formatNumber(Math.max(0, fatTarget - nutritionSummary.intake.fatGrams))} g`}
            progress={fatProgress}
          />
        </div>
      </Panel>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Aktivitäten heute</h2>
            <Pill tone="green">{briefing.workouts.length} geplant</Pill>
          </div>
          <div className="grid gap-3">
            {briefing.workouts.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-6 text-muted shadow-soft">
                Noch keine Sporteinheit geplant. Ergänze Training in Planung oder Training, damit das Briefing konkreter wird.
              </div>
            ) : briefing.workouts.map((workout) => (
              <article key={workout.title} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={workout.intensity === "Locker" ? "blue" : "neutral"}>
                        {workout.sport}
                      </Pill>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {workout.time}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-ink">{workout.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{workout.detail}</p>
                  </div>
                  <Pill tone={workout.intensity === "Locker" ? "green" : "amber"}>
                    {workout.intensity}
                  </Pill>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-canvas px-3 py-3 text-sm text-muted">
                  <Wheat className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>{workout.fueling}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Durchgeführt</h2>
            <Pill tone={externalActivities.length > 0 ? "amber" : "neutral"}>
              {externalActivities.length} Strava
            </Pill>
          </div>
          <ExternalActivityList
            activities={externalActivities}
            isLoading={externalActivitiesLoading}
            error={externalActivitiesError}
            emptyText="Noch keine importierte Aktivität für heute."
          />
          <div className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-ink">Tagesverbrauch überschreiben</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={manualForecastCalories ?? ""}
                onChange={(event) => onManualForecastCaloriesChange?.(parseOptionalNumber(event.target.value))}
                placeholder="z. B. 3200"
                inputMode="numeric"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="Prognostizierter Gesamtverbrauch für heute"
              />
              <button
                type="button"
                onClick={() => onManualForecastCaloriesChange?.()}
                disabled={!manualForecastCalories}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Entfernen
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Trage hier den prognostizierten Gesamtverbrauch für heute ein. Dieser Wert überschreibt Basis, Planung und Strava für den Tagesverbrauch.
            </p>
          </div>
        </section>
      </div>

      <section className="mb-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Heute gegessen</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Pill tone={nutritionLogs.length > 0 ? "green" : "neutral"}>
                {nutritionLogs.length} Einträge
              </Pill>
              <Link href="/fueling" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-coach-600 px-3 text-xs font-semibold text-white">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Mahlzeit
              </Link>
              <button type="button" disabled className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted opacity-70">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Foto
              </button>
              <Link href="/fueling" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink">
                Standard
              </Link>
            </div>
          </div>
          <MealLogList
            logs={nutritionLogs}
            isLoading={nutritionLogsLoading}
            error={nutritionLogsError}
            emptyText="Noch nichts geloggt. Nutze die Fueling-Kacheln oder den Chat, um Essen, Snacks oder Getränke für heute zu speichern."
            onUpdate={onNutritionLogUpdate ?? noopUpdateMealLog}
            onDelete={onNutritionLogDelete ?? noopDeleteMealLog}
          />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Tagesbilanz</h2>
            <Pill tone="amber">Input vs. Output</Pill>
          </div>
          <div className="grid gap-3">
            <BalanceRow
              label="kcal aufgenommen"
              value={`${formatNumber(nutritionSummary.intake.calories)} kcal`}
              detail={`Ziel ${formatNumber(nutritionSummary.targets.caloriesMin)}-${formatNumber(nutritionSummary.targets.caloriesMax)} kcal`}
              progress={nutritionSummary.progress.calories}
            />
            <BalanceRow
              label="geschätzter Tagesverbrauch"
              value={`${formatNumber(nutritionSummary.expenditureCalories)} kcal`}
              detail={`Aufnahme vs. Verbrauch: ${formatSigned(nutritionSummary.deltas.caloriesVsExpenditure)} kcal`}
              progress={Math.min(100, Math.round((nutritionSummary.intake.calories / Math.max(1, nutritionSummary.expenditureCalories)) * 100))}
            />
            <BalanceRow
              label="Protein"
              value={`${formatNumber(nutritionSummary.intake.proteinGrams)} / ${formatNumber(nutritionSummary.targets.proteinMin)} g`}
              detail={`Rest ca. ${formatNumber(nutritionSummary.deltas.proteinRemaining)} g`}
              progress={nutritionSummary.progress.protein}
            />
            <BalanceRow
              label="Kohlenhydrate"
              value={`${formatNumber(nutritionSummary.intake.carbohydrateGrams)} / ${formatNumber(nutritionSummary.targets.carbsMin)} g`}
              detail={`Rest ca. ${formatNumber(nutritionSummary.deltas.carbsRemaining)} g`}
              progress={nutritionSummary.progress.carbs}
            />
            <BalanceRow
              label="Fett"
              value={`${formatNumber(nutritionSummary.intake.fatGrams)} / ${formatNumber(fatTarget)} g`}
              detail={`Rest ca. ${formatNumber(Math.max(0, fatTarget - nutritionSummary.intake.fatGrams))} g`}
              progress={fatProgress}
            />
          </div>
        </Panel>
      </section>

      <Panel className="mb-6 bg-coach-50">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-coach-700">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Was fehlt noch?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Heute fehlen noch ca. {formatNumber(nutritionSummary.deltas.proteinRemaining)} g Protein und {formatNumber(nutritionSummary.deltas.carbsRemaining)} g Kohlenhydrate.
              {" "}{briefing.workouts.length > 0
                ? "Da heute Training geplant oder berücksichtigt ist, sollten die fehlenden Kohlenhydrate nicht zu stark reduziert werden."
                : "Ohne harte Einheit kannst du die Kohlenhydrate flexibler halten, Protein bleibt der wichtigste Anker."}
            </p>
          </div>
        </div>
      </Panel>

      {fuelingQuickAdd ? (
        <div className="mb-6">
          {fuelingQuickAdd}
        </div>
      ) : null}

      <Panel className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-coach-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink">Coach-Empfehlungen</h2>
        </div>
        <div className="grid gap-2">
          {coachRecommendations.map((recommendation) => (
            <article key={recommendation.id} className="rounded-xl bg-canvas px-3 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{recommendation.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{recommendation.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRecommendation(recommendation)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-coach-200 bg-white px-3 text-xs font-semibold text-coach-800 transition hover:bg-coach-50"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Mit Coach besprechen
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Mahlzeitenvorschlag</h2>
            <Pill tone="amber">Timing wichtig</Pill>
          </div>
          <div className="grid gap-3">
            {briefing.meals.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-6 text-muted shadow-soft">
                Noch kein Mahlzeitenvorschlag für den Tag. Füge in Fueling eine grobe Mahlzeit oder einen Standard hinzu.
              </div>
            ) : briefing.meals.map((meal) => (
              <article key={`${meal.time}-${meal.name}`} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coach-50 text-coach-700">
                    <Utensils className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="font-semibold text-ink">{meal.name}</h3>
                      <span className="text-xs font-medium text-muted">{meal.time}</span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted">{meal.detail}</p>
                    <p className="mt-2 text-xs font-semibold text-coach-700">{meal.macroHint}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Panel className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Sunrise className="h-5 w-5 text-coach-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink">Morgen</h2>
        </div>
        <p className="text-sm leading-6 text-muted">{tomorrowHint}</p>
      </Panel>

      <Panel className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-coach-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink">Quick Actions</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Link href="/fueling" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-3 text-sm font-semibold text-white">
            <Utensils className="h-4 w-4" aria-hidden="true" />
            Mahlzeit loggen
          </Link>
          <Link href="/training" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink">
            <Dumbbell className="h-4 w-4" aria-hidden="true" />
            Training hinzufügen
          </Link>
          <button type="button" disabled className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-muted opacity-70">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Foto analysieren
          </button>
          <Link href="/coach" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Coach fragen
          </Link>
          <Link href="/settings#strava" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Strava sync
          </Link>
        </div>
      </Panel>

      {activeRecommendation ? (
        <div className="fixed inset-x-3 bottom-3 z-50 sm:left-auto sm:right-4 sm:w-[min(560px,calc(100vw-2rem))]">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveRecommendation(null)}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-muted shadow-soft transition hover:text-ink"
            >
              Schließen
            </button>
          </div>
          <CoachChatPanel
            title={activeRecommendation.title}
            intro={`Besprich diese Empfehlung mit dem Coach: ${activeRecommendation.body}`}
            compact
            pageContext="today"
            threadId={`today-recommendation-${activeRecommendation.id}`}
            initialMessage={activeRecommendation.prompt}
          />
        </div>
      ) : null}
    </div>
  );
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  const parsed = Number.parseFloat(trimmedValue.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function BalanceRow({
  label,
  value,
  detail,
  progress
}: {
  label: string;
  value: string;
  detail: string;
  progress: number;
}) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-coach-600"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{detail} · {Math.round(progress)}%</p>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

function formatSigned(value: number): string {
  const formatted = formatNumber(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function createFatTarget(nutritionSummary: DailyNutritionSummary): number {
  if (typeof nutritionSummary.targets.fatMin === "number") return nutritionSummary.targets.fatMin;

  return Math.round(Math.max(45, nutritionSummary.targets.caloriesMin * 0.22 / 9));
}

async function noopUpdateMealLog(): Promise<MealLog | null> {
  return null;
}

async function noopDeleteMealLog(): Promise<boolean> {
  return false;
}

function percent(value: number, target: number): number {
  if (target <= 0) return 0;

  return Math.max(0, Math.min(160, Math.round((value / target) * 100)));
}

function createCoachRecommendations(briefing: DailyBriefing, nutritionSummary: DailyNutritionSummary): CoachRecommendation[] {
  return [
    nutritionSummary.deltas.proteinRemaining > 20
      ? {
        id: "protein",
        title: "Protein heute aktiv schließen",
        body: `Es fehlen noch ca. ${formatNumber(nutritionSummary.deltas.proteinRemaining)} g Protein. Eine einfache, planbare Proteinquelle wäre heute der größte Hebel.`,
        prompt: `Heute fehlen mir noch ca. ${formatNumber(nutritionSummary.deltas.proteinRemaining)} g Protein. Zeig mir bitte 3 alltagstaugliche Optionen, gern auch vegetarisch, und ändere noch nichts am Plan.`
      }
      : {
        id: "protein-ok",
        title: "Protein ist stabil",
        body: "Protein ist gut abgedeckt. Der Rest des Tages darf unkompliziert bleiben.",
        prompt: "Mein Protein ist heute gut abgedeckt. Wie sollte ich den Rest des Tages beim Essen gestalten, ohne unnötig zu tracken?"
      },
    nutritionSummary.deltas.carbsRemaining > 60
      ? {
        id: "carbs",
        title: "Kohlenhydrate bewusst timen",
        body: `Es fehlen noch ca. ${formatNumber(nutritionSummary.deltas.carbsRemaining)} g Kohlenhydrate. Rund um Training oder Regeneration nicht zu aggressiv sparen.`,
        prompt: `Heute fehlen mir noch ca. ${formatNumber(nutritionSummary.deltas.carbsRemaining)} g Kohlenhydrate. Was empfiehlst du zeitlich und konkret für Snacks oder Mahlzeiten? Bitte erst beraten, nichts speichern.`
      }
      : {
        id: "carbs-ok",
        title: "Carbs flexibel halten",
        body: "Kohlenhydrate sind solide abgedeckt. Weitere Carbs eher nach Training, Hunger und Abendplanung dosieren.",
        prompt: "Meine Kohlenhydrate sind heute solide abgedeckt. Wie entscheide ich den Rest des Tages pragmatisch nach Hunger, Training und Ziel?"
      },
    briefing.workouts.length > 0
      ? {
        id: "training-fueling",
        title: "Training mit Fueling absichern",
        body: "Vor der Einheit leicht verdaulich essen, danach Protein plus Kohlenhydrate einplanen.",
        prompt: "Berücksichtige mein heutiges Training und gib mir eine konkrete Fueling-Strategie vor und nach der Einheit. Keine Planänderung ohne Bestätigung."
      }
      : {
        id: "restday",
        title: "Ruhigen Tag nutzen",
        body: "Ohne geplante Einheit sind Protein, Gemüse und ein ruhiger Abend wichtiger als perfektes Makro-Feintuning.",
        prompt: "Heute ist eher ruhig. Was ist die sinnvollste Ernährung und Regeneration, damit ich meinem Ziel näherkomme?"
      }
  ];
}
