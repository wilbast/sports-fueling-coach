"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, HeartPulse, MessageCircle, RefreshCw } from "lucide-react";
import { PageHeader, Panel, Pill, StatCard } from "@/components/ui";

type GarminData = {
  range: { start: string; end: string };
  activities: Record<string, unknown>[];
  health: {
    daily: Record<string, unknown>[];
    sleep: Record<string, unknown>[];
    hrv: Record<string, unknown>[];
    recovery: Record<string, unknown>[];
    bodyMeasurements: Record<string, unknown>[];
  };
  warnings: string[];
};

type ViewTab = "health" | "activities";

export function GarminDataView() {
  const defaultEnd = isoDate(new Date());
  const [start, setStart] = useState(isoDate(addDays(new Date(), -13)));
  const [end, setEnd] = useState(defaultEnd);
  const [tab, setTab] = useState<ViewTab>("health");
  const [data, setData] = useState<GarminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/integrations/garmin/data?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const result = await response.json() as GarminData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Garmin-Daten konnten nicht geladen werden.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Garmin-Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [end, start]);

  useEffect(() => { void loadData(); }, [loadData]);

  const healthCount = useMemo(() => data
    ? Object.values(data.health).reduce((sum, rows) => sum + rows.length, 0)
    : 0, [data]);

  return (
    <div>
      <PageHeader
        eyebrow="Garmin"
        title="Gesundheit & Aktivitäten"
        description="Normalisierte Garmin-Daten für Training, Regeneration und Coach-Empfehlungen."
        action={
          <Link href="/coach" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-coach-100 hover:text-coach-700">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Coach fragen
          </Link>
        }
      />

      <Panel className="mb-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-sm font-medium text-ink">
            Von
            <input type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-coach-400" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Bis
            <input type="date" value={end} min={start} max={defaultEnd} onChange={(event) => setEnd(event.target.value)} className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-coach-400" />
          </label>
          <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-coach-600 px-4 text-sm font-semibold text-white transition hover:bg-coach-500 disabled:opacity-50">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
            Aktualisieren
          </button>
        </div>
      </Panel>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Aktivitäten" value={String(data?.activities.length ?? 0)} note="Garmin-Einheiten im Zeitraum" tone="blue" />
        <StatCard label="Gesundheitswerte" value={String(healthCount)} note="Normalisierte Tages- und Recovery-Datensätze" />
        <StatCard label="Zeitraum" value={data ? `${formatShortDate(data.range.start)}–${formatShortDate(data.range.end)}` : "–"} note="Aktive Auswahl" tone="amber" />
      </section>

      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1" role="tablist" aria-label="Garmin-Datenkategorie">
        <TabButton active={tab === "health"} onClick={() => setTab("health")} icon={HeartPulse} label="Gesundheit" count={healthCount} />
        <TabButton active={tab === "activities"} onClick={() => setTab("activities")} icon={Activity} label="Aktivitäten" count={data?.activities.length ?? 0} />
      </div>

      {error ? <div className="mb-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {data?.warnings.length ? <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">Einzelne Datenkategorien konnten nicht geladen werden: {data.warnings.join(" · ")}</div> : null}

      {loading && !data ? (
        <Panel><p className="text-sm text-muted">Garmin-Daten werden geladen...</p></Panel>
      ) : tab === "health" ? (
        <div className="grid gap-5">
          <DataTable title="Tagesgesundheit" rows={data?.health.daily ?? []} columns={dailyColumns} empty="Keine Tagesgesundheitsdaten im Zeitraum." />
          <DataTable title="Schlaf" rows={data?.health.sleep ?? []} columns={sleepColumns} empty="Keine Schlafdaten im Zeitraum." />
          <DataTable title="HRV" rows={data?.health.hrv ?? []} columns={hrvColumns} empty="Keine HRV-Daten im Zeitraum." />
          <DataTable title="Trainingsbelastung & Recovery" rows={data?.health.recovery ?? []} columns={recoveryColumns} empty="Keine Recovery-Daten im Zeitraum." />
          <DataTable title="Gewicht & Körperzusammensetzung" rows={data?.health.bodyMeasurements ?? []} columns={bodyColumns} empty="Keine Körpermessungen im Zeitraum." />
        </div>
      ) : (
        <DataTable title="Garmin-Aktivitäten" rows={data?.activities ?? []} columns={activityColumns} empty="Keine Garmin-Aktivitäten im Zeitraum." />
      )}
    </div>
  );
}

type Column = { key: string; label: string; format?: (value: unknown, row: Record<string, unknown>) => string };

function DataTable({ title, rows, columns, empty }: { title: string; rows: Record<string, unknown>[]; columns: Column[]; empty: string }) {
  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <Pill tone={rows.length ? "green" : "neutral"}>{rows.length}</Pill>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              <tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-2">{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${String(row.id ?? row.source_activity_id ?? row.date ?? row.measured_at ?? index)}-${index}`} className="border-t border-line">
                  {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-3 py-3 text-muted">{column.format ? column.format(row[column.key], row) : display(row[column.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: typeof Activity; label: string; count: number }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${active ? "bg-coach-50 text-coach-800" : "text-muted hover:text-ink"}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}<span className="text-xs">{count}</span></button>;
}

const dailyColumns: Column[] = [
  { key: "date", label: "Datum", format: dateValue }, { key: "steps", label: "Schritte" }, { key: "total_calories", label: "kcal gesamt", format: numberValue },
  { key: "active_calories", label: "kcal aktiv", format: numberValue }, { key: "resting_heart_rate", label: "Ruhepuls", format: numberValue },
  { key: "average_stress", label: "Stress", format: numberValue }, { key: "body_battery_start", label: "Body Battery Start", format: numberValue },
  { key: "body_battery_end", label: "Body Battery Ende", format: numberValue }, { key: "spo2_average", label: "SpO₂", format: numberValue },
  { key: "average_respiration", label: "Atmung", format: numberValue }
];
const sleepColumns: Column[] = [
  { key: "sleep_date", label: "Datum", format: dateValue }, { key: "duration_seconds", label: "Gesamt", format: durationValue },
  { key: "deep_sleep_seconds", label: "Tief", format: durationValue }, { key: "rem_sleep_seconds", label: "REM", format: durationValue },
  { key: "light_sleep_seconds", label: "Leicht", format: durationValue }, { key: "awake_seconds", label: "Wach", format: durationValue },
  { key: "sleep_score", label: "Score", format: numberValue }, { key: "average_hrv", label: "Ø HRV", format: numberValue }, { key: "average_stress", label: "Ø Stress", format: numberValue }
];
const hrvColumns: Column[] = [
  { key: "date", label: "Datum", format: dateValue }, { key: "nightly_average", label: "Nacht Ø", format: numberValue },
  { key: "weekly_average", label: "Woche Ø", format: numberValue }, { key: "baseline_low", label: "Baseline min", format: numberValue },
  { key: "baseline_high", label: "Baseline max", format: numberValue }, { key: "status", label: "Status" }
];
const recoveryColumns: Column[] = [
  { key: "measured_at", label: "Zeitpunkt", format: dateTimeValue }, { key: "training_readiness", label: "Readiness", format: numberValue },
  { key: "recovery_time_seconds", label: "Recovery", format: durationValue }, { key: "training_status", label: "Status" },
  { key: "acute_load", label: "Akute Last", format: numberValue }, { key: "load_ratio", label: "Load Ratio", format: decimalValue },
  { key: "vo2max_running", label: "VO₂max Lauf", format: decimalValue }, { key: "lactate_threshold_heart_rate", label: "Schwellenpuls", format: numberValue },
  { key: "ftp", label: "FTP", format: numberValue }, { key: "endurance_score", label: "Endurance", format: numberValue }
];
const bodyColumns: Column[] = [
  { key: "measured_at", label: "Zeitpunkt", format: dateTimeValue }, { key: "weight_kg", label: "Gewicht kg", format: decimalValue },
  { key: "bmi", label: "BMI", format: decimalValue }, { key: "body_fat_percent", label: "Körperfett %", format: decimalValue },
  { key: "body_water_percent", label: "Wasser %", format: decimalValue }, { key: "muscle_mass_kg", label: "Muskelmasse kg", format: decimalValue },
  { key: "visceral_fat", label: "Viszeralfett", format: decimalValue }, { key: "metabolic_age", label: "Metabolisches Alter", format: numberValue }
];
const activityColumns: Column[] = [
  { key: "start_date", label: "Start", format: dateTimeValue }, { key: "name", label: "Aktivität" }, { key: "sport_type", label: "Sport" },
  { key: "distance_meters", label: "Distanz km", format: (value) => typeof value === "number" ? (value / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 }) : "–" },
  { key: "moving_time_seconds", label: "Bewegungszeit", format: durationValue }, { key: "calories", label: "kcal", format: numberValue },
  { key: "average_heartrate", label: "Ø Puls", format: numberValue }, { key: "max_heartrate", label: "Max Puls", format: numberValue },
  { key: "average_pace_seconds_per_km", label: "Ø Pace", format: paceValue }, { key: "elevation_gain_meters", label: "Höhenmeter", format: numberValue },
  { key: "training_load", label: "Trainingslast", format: numberValue }, { key: "device_name", label: "Gerät" }
];

function display(value: unknown) { return value == null || value === "" ? "–" : typeof value === "object" ? JSON.stringify(value) : String(value); }
function numberValue(value: unknown) { return typeof value === "number" ? Math.round(value).toLocaleString("de-DE") : "–"; }
function decimalValue(value: unknown) { return typeof value === "number" ? value.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : "–"; }
function dateValue(value: unknown) { return typeof value === "string" ? formatShortDate(value) : "–"; }
function dateTimeValue(value: unknown) { return typeof value === "string" ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "–"; }
function durationValue(value: unknown) { if (typeof value !== "number") return "–"; const hours = Math.floor(value / 3600); const minutes = Math.round((value % 3600) / 60); return hours ? `${hours} h ${minutes} min` : `${minutes} min`; }
function paceValue(value: unknown) { if (typeof value !== "number" || value <= 0) return "–"; const minutes = Math.floor(value / 60); return `${minutes}:${String(Math.round(value % 60)).padStart(2, "0")} min/km`; }
function formatShortDate(value: string) { return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)); }
function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }

