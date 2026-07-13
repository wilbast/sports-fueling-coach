"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, HeartPulse, Route, Timer } from "lucide-react";
import { Pill } from "@/components/ui";
import type { DailyPerformanceSnapshot } from "@/domain/performance/types";

export type ExternalActivitySummary = {
  id: string;
  sourceProvider: string;
  sourceActivityId: string;
  name: string;
  sportType: string;
  startDate: string;
  startDateLocal?: string | null;
  distanceMeters?: number | null;
  calories?: number | null;
  garminDailyTotalCalories?: number | null;
  garminDailyActiveCalories?: number | null;
  movingTimeSeconds?: number | null;
  elapsedTimeSeconds?: number | null;
  averageHeartrate?: number | null;
  relativeEffort?: number | null;
  trainingLoad?: number | null;
  averagePaceSecondsPerKm?: number | null;
};

type UseExternalActivitiesResult = {
  activities: ExternalActivitySummary[];
  activitiesByDate: Record<string, ExternalActivitySummary[]>;
  isLoading: boolean;
  error: string | null;
  garminDailyEnergyByDate: Record<string, { totalCalories: number | null; activeCalories: number | null; restingCalories: number | null }>;
  performanceByDate: Record<string, DailyPerformanceSnapshot>;
};

export function useExternalActivities(startDate: string, endDate: string): UseExternalActivitiesResult {
  const [activities, setActivities] = useState<ExternalActivitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [garminDailyEnergyByDate, setGarminDailyEnergyByDate] = useState<UseExternalActivitiesResult["garminDailyEnergyByDate"]>({});
  const [performanceByDate, setPerformanceByDate] = useState<UseExternalActivitiesResult["performanceByDate"]>({});

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ start: startDate, end: endDate });
        const response = await fetch(`/api/activities?${params.toString()}`);
        if (!response.ok) throw new Error("Aktivitäten konnten nicht geladen werden.");
        const result = await response.json() as {
          activities?: ExternalActivitySummary[];
          garminDailyEnergyByDate?: UseExternalActivitiesResult["garminDailyEnergyByDate"];
          performanceByDate?: UseExternalActivitiesResult["performanceByDate"];
        };

        if (!cancelled) {
          setActivities(result.activities ?? []);
          setGarminDailyEnergyByDate(result.garminDailyEnergyByDate ?? {});
          setPerformanceByDate(result.performanceByDate ?? {});
        }
      } catch {
        if (!cancelled) {
          setError("Importierte Aktivitäten konnten gerade nicht geladen werden.");
          setActivities([]);
          setGarminDailyEnergyByDate({});
          setPerformanceByDate({});
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (startDate && endDate) {
      void loadActivities();
    }

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const activitiesByDate = useMemo(() => {
    return activities.reduce<Record<string, ExternalActivitySummary[]>>((groups, activity) => {
      const date = activityDateKey(activity);
      groups[date] = [...(groups[date] ?? []), activity];

      return groups;
    }, {});
  }, [activities]);

  return {
    activities,
    activitiesByDate,
    isLoading,
    error,
    garminDailyEnergyByDate,
    performanceByDate
  };
}

type ExternalActivityListProps = {
  activities: ExternalActivitySummary[];
  isLoading?: boolean;
  error?: string | null;
  emptyText?: string;
};

export function ExternalActivityList({
  activities,
  isLoading = false,
  error = null,
  emptyText = "Keine importierte Aktivität an diesem Tag."
}: ExternalActivityListProps) {
  if (isLoading) {
    return <div className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">Aktivitäten werden geladen...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</div>;
  }

  if (activities.length === 0) {
    return <div className="rounded-xl bg-canvas px-3 py-3 text-sm text-muted">{emptyText}</div>;
  }

  return (
    <div className="grid gap-2">
      {activities.map((activity) => (
        <ExternalActivityCard key={`${activity.sourceProvider}-${activity.sourceActivityId}`} activity={activity} />
      ))}
    </div>
  );
}

function ExternalActivityCard({ activity }: { activity: ExternalActivitySummary }) {
  const intensity = inferActivityIntensity(activity);

  return (
    <article className="rounded-xl border border-line bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-700">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="amber">{providerLabel(activity.sourceProvider)}</Pill>
              <span className="text-xs font-semibold text-muted">{sportLabel(activity.sportType)}</span>
            </div>
            <h3 className="mt-2 font-semibold text-ink">{activity.name}</h3>
            <p className="mt-1 text-xs text-muted">{formatActivityTime(activity)}</p>
          </div>
        </div>
        <Pill tone={intensity.tone}>{intensity.label}</Pill>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Metric icon={Route} label="Länge" value={formatDistance(activity.distanceMeters)} />
        <Metric icon={Gauge} label="Ø Pace" value={formatPace(activity.averagePaceSecondsPerKm)} />
        <Metric icon={Activity} label="Gesamt-kcal" value={formatDailyCalories(activity)} />
        <Metric icon={Timer} label="Dauer" value={formatDuration(activity.movingTimeSeconds ?? activity.elapsedTimeSeconds)} />
        <Metric icon={HeartPulse} label="Ø Puls" value={formatHeartRate(activity.averageHeartrate)} />
        <Metric icon={Gauge} label="Trainingslast" value={formatTrainingLoad(activity.trainingLoad)} />
        <Metric icon={Gauge} label="Intensität" value={intensity.detail} />
      </div>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function activityDateKey(activity: ExternalActivitySummary): string {
  return (activity.startDateLocal ?? activity.startDate).slice(0, 10);
}

function inferActivityIntensity(activity: ExternalActivitySummary): { label: string; detail: string; tone: "green" | "amber" | "red" | "neutral" } {
  const effort = activity.relativeEffort ?? activity.trainingLoad;
  if (typeof effort === "number" && Number.isFinite(effort)) {
    const detail = activity.relativeEffort != null ? `RE ${Math.round(effort)}` : `Last ${Math.round(effort)}`;
    if (effort >= 80) return { label: "hart", detail, tone: "red" };
    if (effort >= 35) return { label: "moderat", detail, tone: "amber" };

    return { label: "locker", detail, tone: "green" };
  }

  const heartRate = activity.averageHeartrate;
  if (typeof heartRate === "number" && Number.isFinite(heartRate)) {
    if (heartRate >= 160) return { label: "hart", detail: `${Math.round(heartRate)} bpm`, tone: "red" };
    if (heartRate >= 140) return { label: "moderat", detail: `${Math.round(heartRate)} bpm`, tone: "amber" };

    return { label: "locker", detail: `${Math.round(heartRate)} bpm`, tone: "green" };
  }

  return { label: "unbewertet", detail: "keine Daten", tone: "neutral" };
}

function formatDistance(value?: number | null): string {
  if (!value) return "offen";

  return `${(value / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "offen";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return `${hours}:${String(rest).padStart(2, "0")} h`;
}

function formatCalories(value: number | null | undefined, activity?: ExternalActivitySummary): string {
  if (value) return `${Math.round(value).toLocaleString("de-DE")} kcal`;
  if (!activity) return "offen";

  const estimate = estimateCalories(activity);

  return estimate > 0 ? `ca. ${Math.round(estimate).toLocaleString("de-DE")} kcal` : "offen";
}

function formatDailyCalories(activity: ExternalActivitySummary): string {
  const total = activity.garminDailyTotalCalories;
  const active = activity.calories;
  if (typeof total === "number" && total > 0) {
    const totalLabel = `${Math.round(total).toLocaleString("de-DE")} kcal`;
    return typeof active === "number" && active > 0
      ? `${totalLabel} · ${Math.round(active).toLocaleString("de-DE")} aktiv`
      : totalLabel;
  }
  const activityCalories = formatCalories(active, activity);
  return activityCalories === "offen" ? "noch offen" : `Gesamt offen · ${activityCalories} aktiv`;
}

function formatPace(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "offen";
  const rounded = Math.round(value);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")} min/km`;
}

function formatTrainingLoad(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value).toLocaleString("de-DE")
    : "offen";
}

function estimateCalories(activity: ExternalActivitySummary): number {
  const distanceKm = (activity.distanceMeters ?? 0) / 1000;
  if (activity.sportType.toLowerCase().includes("run") && distanceKm > 0) {
    return distanceKm * 75;
  }

  const minutes = (activity.movingTimeSeconds ?? activity.elapsedTimeSeconds ?? 0) / 60;
  if (minutes > 0) {
    return minutes * 8;
  }

  return 0;
}

function formatHeartRate(value?: number | null): string {
  return value ? `${Math.round(value)} bpm` : "offen";
}

function formatActivityTime(activity: ExternalActivitySummary): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(activity.startDateLocal ?? activity.startDate));
}

function providerLabel(provider: string): string {
  if (provider === "strava") return "Strava";

  return provider;
}

function sportLabel(sport: string): string {
  const lower = sport.toLowerCase();
  if (lower.includes("run")) return "Laufen";
  if (lower.includes("ride") || lower.includes("bike")) return "Radfahren";
  if (lower.includes("swim")) return "Schwimmen";
  if (lower.includes("workout")) return "Workout";

  return sport;
}
