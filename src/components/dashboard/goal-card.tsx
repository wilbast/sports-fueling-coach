"use client";

import type { DashboardData, DashboardTone } from "@/domain/dashboard/types";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ProgressRing } from "@/components/dashboard/progress-ring";

const colors: Record<DashboardTone, string> = { green: "#22C55E", blue: "#2563EB", amber: "#F59E0B", cyan: "#22D3EE", red: "#EF4444" };

export function GoalCard({ goal, index }: { goal: DashboardData["goals"][number]; index: number }) {
  return (
    <DashboardCard href={goal.href} ariaLabel={`${goal.label} öffnen`} delay={index * 0.04} className="p-4 sm:p-4">
      <div className="grid grid-cols-[88px_1fr] items-center gap-3">
        <div className="w-[88px]"><ProgressRing value={goal.progress} color={colors[goal.tone]} size="small" label={goal.label} /></div>
        <div className="min-w-0"><p className="text-xs font-medium text-[#9CA3AF]">{goal.label}</p><p className="mt-2 text-sm font-semibold text-white">{goal.value}</p><p className="mt-1 text-xs" style={{ color: colors[goal.tone] }}>{goal.progress}% erreicht</p></div>
      </div>
    </DashboardCard>
  );
}
