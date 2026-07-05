import Link from "next/link";
import {
  Clock3,
  Flame,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Utensils,
  Wheat
} from "lucide-react";
import { PageHeader, Panel, Pill, StatCard } from "@/components/ui";
import type { DailyBriefing } from "@/domain/briefing/types";
import { ExternalActivityList, type ExternalActivitySummary } from "@/features/activities/external-activities";

type TodayViewProps = {
  briefing: DailyBriefing;
  calendar?: React.ReactNode;
  externalActivities?: ExternalActivitySummary[];
  externalActivitiesLoading?: boolean;
  externalActivitiesError?: string | null;
  manualForecastCalories?: number;
  onManualForecastCaloriesChange?: (calories?: number) => void;
};

export function TodayView({
  briefing,
  calendar,
  externalActivities = [],
  externalActivitiesLoading = false,
  externalActivitiesError = null,
  manualForecastCalories,
  onManualForecastCaloriesChange
}: TodayViewProps) {
  return (
    <div>
      <PageHeader
        eyebrow={briefing.dateLabel}
        title={briefing.greeting}
        description={briefing.lead}
        action={
          <Link
            href="/coach"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-coach-100 hover:text-coach-700"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Coach fragen
          </Link>
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

      <section className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              <h3 className="text-sm font-semibold text-ink">KCAL Forecast heute</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={manualForecastCalories ?? ""}
                onChange={(event) => onManualForecastCaloriesChange?.(parseOptionalNumber(event.target.value))}
                placeholder="z. B. 650"
                inputMode="numeric"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-coach-400"
                aria-label="KCAL Forecast für heute"
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
              Ohne Forecast nutzt der Coach geplante Aktivität, nach Strava-Sync die tatsächlichen KCAL.
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
