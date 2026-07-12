"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData, DashboardRange } from "@/domain/dashboard/types";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HeroCard } from "@/components/dashboard/hero-card";
import { PerformanceCard } from "@/components/dashboard/performance-card";
import { CoachCard } from "@/components/dashboard/coach-card";
import { SectionHeading } from "@/components/dashboard/dashboard-card";
import { HrvChart, RecoveryChart, SleepChart, StressHeatmap } from "@/components/dashboard/recovery-charts";
import { PaceChart, TrainingLoadChart, TrainingMixChart, WeeklyDistanceChart } from "@/components/dashboard/training-charts";
import { CalorieChart, MacroChart, ProteinChart } from "@/components/dashboard/nutrition-charts";
import { GarminCard } from "@/components/dashboard/garmin-card";
import { GoalCard } from "@/components/dashboard/goal-card";
import { TrainingHeatmap } from "@/components/dashboard/heatmap";

export function DashboardView() {
  const [range, setRange] = useState<DashboardRange>("7d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (nextRange: DashboardRange, keepData = false) => {
    setLoading(true);
    setError(null);
    if (!keepData) setData(null);
    try {
      const response = await fetch(`/api/dashboard?range=${nextRange}`, { cache: "no-store" });
      const result = await response.json() as DashboardData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Dashboard konnte nicht geladen werden.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(range); }, [loadDashboard, range]);

  return (
    <DashboardLayout range={range} onRangeChange={setRange} loading={loading}>
      {error ? <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-[#7F1D1D] bg-[#2A1117] px-4 py-3 text-sm text-[#FCA5A5]" role="alert"><span>{error}</span><button type="button" onClick={() => void loadDashboard(range, true)} className="min-h-9 rounded-md border border-[#991B1B] px-3 font-semibold text-white">Erneut laden</button></div> : null}
      {!data ? <DashboardSkeleton /> : (
        <div className={loading ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <HeroCard hero={data.hero} />

          <section className="mt-5" aria-labelledby="cockpit-title">
            <SectionHeading eyebrow="Performance Cockpit" title="Die vier Signale" detail="Verdichtet, trendbasiert und direkt zu den Details verlinkt." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.scores.map((metric, index) => <PerformanceCard key={metric.id} metric={metric} index={index} />)}</div>
          </section>

          <section className="mt-5"><CoachCard coach={data.coach} /></section>

          <section className="mt-8" aria-labelledby="recovery-title">
            <SectionHeading eyebrow="Recovery & Health" title="Erholung im Kontext" detail="Einzelwerte werden erst im Zusammenspiel zu einer belastbaren Entscheidung." />
            <div className="grid gap-4 xl:grid-cols-2"><RecoveryChart data={data.health} /><SleepChart data={data.health} /><HrvChart data={data.health} /><StressHeatmap values={data.stressByHour} /></div>
          </section>

          <section className="mt-8" aria-labelledby="training-title">
            <SectionHeading eyebrow="Training" title="Belastung und Entwicklung" detail="Umfang, Intensitätsmix und Pace ohne dekorative Datenfülle." />
            <div className="grid gap-4 xl:grid-cols-2"><TrainingLoadChart data={data.training} /><WeeklyDistanceChart data={data.training} /><TrainingMixChart data={data.trainingMix} /><PaceChart data={data.pace} /></div>
          </section>

          <section className="mt-8" aria-labelledby="nutrition-title">
            <SectionHeading eyebrow="Fueling" title="Energie für den Plan" detail="Aufnahme, Verbrauch und Makros werden als alltagstaugliche Orientierung dargestellt." />
            <div className="grid gap-4 xl:grid-cols-2"><CalorieChart data={data.nutrition} /><MacroChart data={data.nutrition} /><div className="xl:col-span-2"><ProteinChart data={data.nutrition} /></div></div>
          </section>

          <section className="mt-8" aria-labelledby="garmin-title">
            <SectionHeading eyebrow="Garmin Highlights" title="Leistungsmarker" detail="Die wichtigsten Signale aus Training und Regeneration, jeweils mit Trend." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.garmin.map((item, index) => <GarminCard key={item.label} item={item} index={index} />)}</div>
          </section>

          <section className="mt-8" aria-labelledby="goals-title">
            <SectionHeading eyebrow="Ziele" title="Fortschritt ohne Rauschen" detail="Nur Ziele, die Training, Wettkampf oder Fueling tatsächlich steuern." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.goals.map((goal, index) => <GoalCard key={goal.label} goal={goal} index={index} />)}</div>
          </section>

          <section className="mt-8"><TrainingHeatmap days={data.calendar} /></section>
          <p className="mt-5 text-center text-xs text-[#64748B]">Dashboard-Vorschau mit typisierten Mockdaten · Echte Datenquellen werden im nächsten Integrationsschritt angebunden.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
