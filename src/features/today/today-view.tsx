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
import type { DailyNutritionSummary, MealLog, MealLogCategory } from "@/domain/nutrition/logs";
import { sourceLabel } from "@/domain/nutrition/logs";
import { ExternalActivityList, type ExternalActivitySummary } from "@/features/activities/external-activities";
import { CoachRecommendationButton } from "@/features/coach/coach-recommendation-button";

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
  tomorrowHint?: string;
  manualForecastCalories?: number;
  onManualForecastCaloriesChange?: (calories?: number) => void;
  fuelingQuickAdd?: React.ReactNode;
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
  tomorrowHint,
  manualForecastCalories,
  onManualForecastCaloriesChange,
  fuelingQuickAdd
}: TodayViewProps) {
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
        <div className="grid gap-3 md:grid-cols-3">
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
        </div>
      </Panel>

      <section className="mb-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Heute gegessen</h2>
            <Pill tone={nutritionLogs.length > 0 ? "green" : "neutral"}>
              {nutritionLogs.length} Einträge
            </Pill>
          </div>
          {nutritionLogsError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{nutritionLogsError}</p>
          ) : nutritionLogsLoading ? (
            <p className="rounded-xl bg-canvas px-3 py-2 text-sm text-muted">Mahlzeiten werden geladen...</p>
          ) : nutritionLogs.length === 0 ? (
            <p className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
              Noch nichts geloggt. Nutze die Fueling-Kacheln oder den Chat, um Essen, Snacks oder Getränke für heute zu speichern.
            </p>
          ) : (
            <div className="grid gap-2">
              {nutritionLogs.map((log) => (
                <article key={log.id} className="rounded-xl border border-line px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{log.name}</p>
                        <Pill tone={log.manuallyConfirmed ? "green" : log.source === "ai_estimate" ? "amber" : "blue"}>
                          {sourceLabel(log.source, log.manuallyConfirmed)}
                        </Pill>
                        <Pill tone="neutral">{mealLogCategoryLabel(log.category)}</Pill>
                        {log.isMainMeal ? <Pill tone="green">Hauptmahlzeit</Pill> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {log.time ? `${log.time} · ` : ""}{log.description ?? "ohne Beschreibung"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink">{formatNumber(log.values.calories)} kcal</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
                    <span>{formatNumber(log.values.proteinGrams)} g Protein</span>
                    <span>{formatNumber(log.values.carbohydrateGrams)} g Kohlenhydrate</span>
                    <span>{formatNumber(log.values.fatGrams ?? 0)} g Fett</span>
                  </div>
                </article>
              ))}
            </div>
          )}
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
          {createCoachRecommendations(briefing, nutritionSummary).map((recommendation) => (
            <div key={recommendation} className="rounded-xl bg-canvas px-3 py-3 text-sm leading-6 text-muted">
              {recommendation}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Geplante Sporteinheiten</h2>
            <Pill tone="green">{briefing.workouts.length} Einheiten</Pill>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-coach-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Heute wichtig</h2>
          </div>
          <div className="space-y-2">
            {briefing.priorities.slice(0, 3).map((priority) => (
              <div key={priority} className="flex items-start gap-3 rounded-xl bg-canvas px-3 py-3 text-sm text-muted">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-coach-600" aria-hidden="true" />
                <span>{priority}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="bg-coach-50">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-coach-700">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-ink">Coach-Hinweis</h2>
                <Pill tone="green">aktiv</Pill>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{briefing.coachHint}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-coach-700">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Regelbasierte Empfehlung
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {briefing.coachCards.map((card, index) => {
          const Icon = index === 0 ? Flame : index === 1 ? Wheat : ShieldCheck;

          return (
            <div key={card.title} className="rounded-2xl border border-line bg-white p-4">
              <Icon
                className={index === 0 ? "h-5 w-5 text-effort-medium" : index === 1 ? "h-5 w-5 text-amber-700" : "h-5 w-5 text-coach-600"}
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-semibold text-ink">{card.title}</p>
              <p className="mt-1 text-sm leading-5 text-muted">{card.body}</p>
            </div>
          );
        })}
      </section>
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

function mealLogCategoryLabel(category: MealLogCategory): string {
  const labels: Record<MealLogCategory, string> = {
    breakfast: "Frühstück",
    lunch: "Mittagessen",
    dinner: "Abendessen",
    snack: "Snack",
    drink: "Getränk"
  };

  return labels[category];
}

function createCoachRecommendations(briefing: DailyBriefing, nutritionSummary: DailyNutritionSummary): string[] {
  const recommendations = [
    nutritionSummary.deltas.proteinRemaining > 20
      ? `Protein priorisieren: Plane noch eine einfache Proteinquelle ein, ca. ${formatNumber(nutritionSummary.deltas.proteinRemaining)} g fehlen bis zum Ziel.`
      : "Protein ist gut abgedeckt. Halte den Rest des Tages eher unkompliziert und vermeide unnötiges Nachsteuern.",
    nutritionSummary.deltas.carbsRemaining > 60
      ? `Kohlenhydrate bewusst setzen: Es fehlen noch ca. ${formatNumber(nutritionSummary.deltas.carbsRemaining)} g, besonders relevant rund um Training oder Regeneration.`
      : "Kohlenhydrate sind für heute solide abgedeckt. Weitere Carbs eher nach Hunger, Einheit und Abendplanung dosieren.",
    briefing.workouts.length > 0
      ? "Trainingstag: Vor der Einheit leicht verdaulich essen, danach Protein plus Kohlenhydrate einplanen."
      : "Ohne geplante Einheit: Protein und Gemüse als Anker, Energieaufnahme entspannt am Hunger ausrichten."
  ];

  return recommendations;
}
