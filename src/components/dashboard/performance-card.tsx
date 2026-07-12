"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ScoreMetric } from "@/domain/dashboard/types";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { Sparkline } from "@/components/dashboard/sparkline";

const colors = { green: "#22C55E", blue: "#2563EB", amber: "#F59E0B", cyan: "#22D3EE", red: "#EF4444" };

export function PerformanceCard({ metric, index }: { metric: ScoreMetric; index: number }) {
  const positive = metric.change >= 0;
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;
  const color = colors[metric.tone];

  return (
    <DashboardCard href={metric.href} ariaLabel={`${metric.label} Details öffnen`} delay={0.04 * index}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{metric.label}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">7-Tage-Score</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-[#86EFAC]" : "text-[#FCA5A5]"}`}><TrendIcon className="h-4 w-4" aria-hidden="true" />{Math.abs(metric.change)}%</span>
      </div>
      <div className="mx-auto mt-1 w-36"><ProgressRing value={metric.score} color={color} size="small" label={metric.label} /></div>
      <Sparkline values={metric.trend} color={color} />
    </DashboardCard>
  );
}
