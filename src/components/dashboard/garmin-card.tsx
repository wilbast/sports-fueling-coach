"use client";

import { Activity, ArrowDownRight, ArrowUpRight, BatteryCharging, Brain, Timer } from "lucide-react";
import type { DashboardData, DashboardTone } from "@/domain/dashboard/types";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Sparkline } from "@/components/dashboard/sparkline";

const colors: Record<DashboardTone, string> = { green: "#22C55E", blue: "#2563EB", amber: "#F59E0B", cyan: "#22D3EE", red: "#EF4444" };
const icons = [Activity, BatteryCharging, Brain, Timer];

export function GarminCard({ item, index }: { item: DashboardData["garmin"][number]; index: number }) {
  const Icon = icons[index % icons.length];
  const positive = item.label === "Recovery Time" ? item.change <= 0 : item.change >= 0;
  const TrendIcon = item.change >= 0 ? ArrowUpRight : ArrowDownRight;
  const color = colors[item.tone];
  return (
    <DashboardCard href="/garmin" ariaLabel={`${item.label} in Garmin öffnen`} delay={index * 0.04}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F2937]" style={{ color }}><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <span className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-[#86EFAC]" : "text-[#FCA5A5]"}`}><TrendIcon className="h-4 w-4" aria-hidden="true" />{Math.abs(item.change)}%</span>
      </div>
      <p className="mt-4 text-xs font-medium text-[#9CA3AF]">{item.label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
      <div className="mt-2"><Sparkline values={item.trend} color={color} /></div>
    </DashboardCard>
  );
}
