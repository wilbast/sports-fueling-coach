"use client";

import type { DashboardRange } from "@/domain/dashboard/types";

const ranges: Array<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "Heute" },
  { value: "7d", label: "7 Tage" },
  { value: "30d", label: "30 Tage" },
  { value: "90d", label: "90 Tage" },
  { value: "year", label: "Jahr" }
];

export function DashboardLayout({ children, range, onRangeChange, loading }: { children: React.ReactNode; range: DashboardRange; onRangeChange: (range: DashboardRange) => void; loading: boolean }) {
  return (
    <div className="dashboard-dark -mx-4 -mt-5 min-h-screen bg-[#0B1220] px-4 pb-16 pt-5 text-[#F9FAFB] sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#22C55E] shadow-[0_0_12px_rgba(34,197,94,0.7)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">Performance Cockpit · Mock-Vorschau</p>
          </div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Dein System auf einen Blick</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9CA3AF]">Recovery, Trainingsrealität, Fueling und Coach-Einordnung in einer ruhigen Ansicht.</p>
        </div>
        <div className="max-w-full overflow-x-auto pb-1" aria-label="Zeitraum auswählen">
          <div className="inline-flex min-w-max rounded-lg border border-[#1F2937] bg-[#111827] p-1">
            {ranges.map((item) => (
              <button key={item.value} type="button" onClick={() => onRangeChange(item.value)} disabled={loading} aria-pressed={range === item.value} className={`min-h-9 rounded-md px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${range === item.value ? "bg-[#2563EB] text-white" : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px]">{children}</div>
    </div>
  );
}
