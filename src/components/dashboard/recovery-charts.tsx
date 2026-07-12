"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/domain/dashboard/types";
import { CardHeading, DashboardCard } from "@/components/dashboard/dashboard-card";

const axis = { fill: "#6B7280", fontSize: 11 };
const tooltip = { backgroundColor: "#0B1220", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB" };

export function RecoveryChart({ data }: { data: DashboardData["health"] }) {
  return <ChartShell title="Recovery Trend" subtitle="Recovery, Body Battery und Readiness" info="Vergleicht die drei wichtigsten Regenerationssignale der letzten sieben Tage."><LineChart data={data}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis domain={[40, 100]} tick={axis} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={tooltip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="recovery" name="Recovery" stroke="#22C55E" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="bodyBattery" name="Body Battery" stroke="#2563EB" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="readiness" name="Readiness" stroke="#22D3EE" strokeWidth={1.5} dot={false} /></LineChart></ChartShell>;
}

export function SleepChart({ data }: { data: DashboardData["health"] }) {
  return <ChartShell title="Schlaf" subtitle="Dauer und Qualität" info="Schlafdauer in Stunden mit Schlafscore als zweite Skala."><BarChart data={data}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis yAxisId="hours" domain={[0, 10]} tick={axis} axisLine={false} tickLine={false} width={28} /><YAxis yAxisId="score" orientation="right" domain={[50, 100]} hide /><Tooltip contentStyle={tooltip} /><Bar yAxisId="hours" dataKey="sleepHours" name="Stunden" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={18} /><Line yAxisId="score" type="monotone" dataKey="sleepScore" name="Score" stroke="#22D3EE" strokeWidth={1.8} dot={false} /></BarChart></ChartShell>;
}

export function HrvChart({ data }: { data: DashboardData["health"] }) {
  return <ChartShell title="HRV & Ruhepuls" subtitle="Regeneration im Verhältnis" info="Eine steigende HRV bei stabilem oder sinkendem Ruhepuls ist meist ein positives Signal."><LineChart data={data}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis yAxisId="hrv" domain={[40, 60]} tick={axis} axisLine={false} tickLine={false} width={28} /><YAxis yAxisId="hr" orientation="right" domain={[45, 60]} tick={axis} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={tooltip} /><Line yAxisId="hrv" type="monotone" dataKey="hrv" name="HRV" stroke="#22C55E" strokeWidth={2} dot={false} /><Line yAxisId="hr" type="monotone" dataKey="restingHr" name="Ruhepuls" stroke="#F59E0B" strokeWidth={1.6} dot={false} /></LineChart></ChartShell>;
}

export function StressHeatmap({ values }: { values: number[] }) {
  return (
    <DashboardCard>
      <CardHeading title="Stress" subtitle="Tagesverlauf · 24 Stunden" info="Dunklere Felder zeigen Phasen mit höherem gemessenem Stress." />
      <div className="grid grid-cols-12 gap-1.5 sm:grid-cols-24" role="img" aria-label="Stressverlauf über 24 Stunden">
        {values.map((value, hour) => <div key={hour} title={`${hour}:00 · Stress ${value}`} className="aspect-square rounded-sm" style={{ backgroundColor: stressColor(value) }} />)}
      </div>
      <div className="mt-3 flex items-center justify-between text-[0.68rem] text-[#6B7280]"><span>00 Uhr</span><span>Niedrig</span><span>Hoch</span><span>23 Uhr</span></div>
    </DashboardCard>
  );
}

function ChartShell({ title, subtitle, info, children }: { title: string; subtitle: string; info: string; children: React.ReactElement }) {
  return <DashboardCard><CardHeading title={title} subtitle={subtitle} info={info} /><div className="h-56 w-full sm:h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></DashboardCard>;
}

function stressColor(value: number) {
  if (value < 20) return "#173B2C";
  if (value < 40) return "#166534";
  if (value < 55) return "#B45309";
  return "#B91C1C";
}
