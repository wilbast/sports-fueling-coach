"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/domain/dashboard/types";
import { CardHeading, DashboardCard } from "@/components/dashboard/dashboard-card";

const axis = { fill: "#6B7280", fontSize: 11 };
const tooltip = { backgroundColor: "#0B1220", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB" };

export function TrainingLoadChart({ data }: { data: DashboardData["training"] }) {
  return <ChartCard title="Trainingsbelastung" subtitle="Akute und chronische Last" info="Akute Last reagiert auf die letzten Tage, chronische Last bildet den längerfristigen Belastungsunterbau."><AreaChart data={data}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={tooltip} /><Area type="monotone" dataKey="chronicLoad" name="Chronisch" stroke="#2563EB" fill="#2563EB" fillOpacity={0.1} strokeWidth={1.6} /><Area type="monotone" dataKey="acuteLoad" name="Akut" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.12} strokeWidth={2} /></AreaChart></ChartCard>;
}

export function WeeklyDistanceChart({ data }: { data: DashboardData["training"] }) {
  return <ChartCard title="Wochenkilometer" subtitle="Laufdistanz nach Tag" info="Zeigt abgeschlossene und geplante Laufkilometer der ausgewählten Woche."><BarChart data={data}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={tooltip} /><Bar dataKey="distanceKm" name="Kilometer" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={20} /></BarChart></ChartCard>;
}

export function TrainingMixChart({ data }: { data: DashboardData["trainingMix"] }) {
  return (
    <DashboardCard>
      <CardHeading title="Trainingsarten" subtitle="Verteilung im aktuellen Block" info="Die Verteilung hilft, lockere, intensive und ergänzende Belastung im Gleichgewicht zu halten." />
      <div className="grid items-center gap-3 sm:grid-cols-[180px_1fr]">
        <div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltip} /></PieChart></ResponsiveContainer></div>
        <div className="grid gap-2">{data.map((entry) => <div key={entry.name} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-[#D1D5DB]"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />{entry.name}</span><span className="font-semibold text-white">{entry.value}%</span></div>)}</div>
      </div>
    </DashboardCard>
  );
}

export function PaceChart({ data }: { data: DashboardData["pace"] }) {
  const formatted = data.map((point) => ({ ...point, easy: point.easy / 60, tenK: point.tenK / 60, halfMarathon: point.halfMarathon / 60 }));
  return <ChartCard title="Pace-Entwicklung" subtitle="GA1, 10 km und Halbmarathon" info="Geringere Werte bedeuten eine schnellere Pace. Mockwerte dienen nur zur Designprüfung."><LineChart data={formatted}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis domain={[4, 6]} reversed tick={axis} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={tooltip} formatter={(value: number) => `${value.toFixed(2)} min/km`} /><Line type="monotone" dataKey="easy" name="GA1" stroke="#22C55E" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="tenK" name="10 km" stroke="#EF4444" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="halfMarathon" name="HM" stroke="#2563EB" strokeWidth={1.5} dot={false} /></LineChart></ChartCard>;
}

function ChartCard({ title, subtitle, info, children }: { title: string; subtitle: string; info: string; children: React.ReactElement }) {
  return <DashboardCard><CardHeading title={title} subtitle={subtitle} info={info} /><div className="h-56 w-full sm:h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></DashboardCard>;
}
