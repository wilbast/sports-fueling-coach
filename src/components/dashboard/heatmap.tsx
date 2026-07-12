"use client";

import Link from "next/link";
import type { DashboardData } from "@/domain/dashboard/types";
import { CardHeading, DashboardCard } from "@/components/dashboard/dashboard-card";

export function TrainingHeatmap({ days }: { days: DashboardData["calendar"] }) {
  return (
    <DashboardCard>
      <CardHeading title="Trainingskalender" subtitle="Belastung der letzten fünf Wochen" info="Jedes Feld steht für einen Tag. Die Farbe zeigt Belastung und Intensität." />
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[560px] grid-flow-col grid-rows-7 gap-2" role="grid" aria-label="Trainingskalender der letzten fünf Wochen">
          {days.map((day) => (
            <Link key={day.date} href={`/training?date=${day.date}`} role="gridcell" aria-label={`${formatDate(day.date)}, Belastung ${day.load}`} title={`${formatDate(day.date)} · Last ${day.load}`} className="h-8 rounded-sm border border-white/5 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]" style={{ backgroundColor: intensityColor(day.intensity) }} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[0.68rem] text-[#6B7280]"><span>Ruhe</span>{["rest", "easy", "moderate", "hard"].map((intensity) => <span key={intensity} className="h-3 w-3 rounded-sm" style={{ backgroundColor: intensityColor(intensity as DashboardData["calendar"][number]["intensity"]) }} />)}<span>Hoch</span></div>
    </DashboardCard>
  );
}

function intensityColor(intensity: DashboardData["calendar"][number]["intensity"]) {
  return { rest: "#172033", easy: "#14532D", moderate: "#1D4ED8", hard: "#B45309" }[intensity];
}
function formatDate(value: string) { return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`)); }
