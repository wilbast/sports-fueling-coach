"use client";

import { Activity, Beef, Flame, Gauge, MoonStar } from "lucide-react";
import type { DashboardData } from "@/domain/dashboard/types";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ProgressRing } from "@/components/dashboard/progress-ring";

export function HeroCard({ hero }: { hero: DashboardData["hero"] }) {
  const metrics = [
    { icon: Gauge, label: "Readiness", value: `${hero.readiness}/100` },
    { icon: Flame, label: "Kalorien", value: `${hero.calorieCurrent.toLocaleString("de-DE")} / ${hero.calorieTarget.toLocaleString("de-DE")}` },
    { icon: Beef, label: "Protein", value: `${hero.proteinCurrent} / ${hero.proteinTarget} g` },
    { icon: Activity, label: "Training", value: hero.recommendedTraining }
  ];

  return (
    <DashboardCard className="overflow-hidden border-[#263449] bg-[#111827] p-0 sm:p-0">
      <div className="grid min-h-[310px] lg:grid-cols-[1fr_320px]">
        <div className="p-5 pb-4 sm:p-7 sm:pb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[#86EFAC]"><MoonStar className="h-4 w-4" aria-hidden="true" />Heute</div>
          <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">{hero.greeting}, Bastian.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#D1D5DB] sm:text-base">{hero.status}</p>
        </div>
        <div className="flex flex-col items-center justify-center border-y border-[#1F2937] bg-[#0F172A] px-8 py-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-y-0 lg:border-l">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">Recovery Score</p>
          <div className="w-44"><ProgressRing value={hero.recoveryScore} color="#22C55E" label="Recovery Score" /></div>
          <p className="text-sm font-medium text-[#86EFAC]">Sehr gute Ausgangslage</p>
        </div>
        <div className="p-5 pt-4 sm:p-7 sm:pt-4 lg:pt-0">
          <div className="grid gap-px overflow-hidden rounded-lg border border-[#1F2937] bg-[#1F2937] sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ icon: Icon, label, value }) => (
              <div key={label} className="min-w-0 bg-[#0F172A] px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[#9CA3AF]"><Icon className="h-4 w-4 text-[#60A5FA]" aria-hidden="true" />{label}</div>
                <p className="mt-2 truncate text-sm font-semibold text-white" title={value}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
