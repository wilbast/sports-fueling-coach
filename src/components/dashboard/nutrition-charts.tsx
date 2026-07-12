"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/domain/dashboard/types";
import { CardHeading, DashboardCard } from "@/components/dashboard/dashboard-card";

const axis = { fill: "#6B7280", fontSize: 11 };
const tooltip = { backgroundColor: "#0B1220", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB" };

export function CalorieChart({ data }: { data: DashboardData["nutrition"] }) {
  return <ChartCard title="Kalorienbilanz" subtitle="Aufnahme und Tagesverbrauch" info="Vergleicht geloggte Energieaufnahme mit dem geschätzten Tagesverbrauch."><AreaChart data={data}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} width={38} /><Tooltip contentStyle={tooltip} /><Area type="monotone" dataKey="burnedKcal" name="Verbraucht" stroke="#2563EB" fill="#2563EB" fillOpacity={0.08} strokeWidth={1.8} /><Area type="monotone" dataKey="eatenKcal" name="Gegessen" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} /></AreaChart></ChartCard>;
}

export function MacroChart({ data }: { data: DashboardData["nutrition"] }) {
  return <ChartCard title="Makros" subtitle="Protein, Kohlenhydrate und Fett" info="Zeigt die tägliche Makroverteilung in Gramm."><BarChart data={data}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} width={30} /><Tooltip contentStyle={tooltip} /><Bar dataKey="protein" stackId="macro" name="Protein" fill="#22C55E" maxBarSize={22} /><Bar dataKey="carbs" stackId="macro" name="Carbs" fill="#2563EB" /><Bar dataKey="fat" stackId="macro" name="Fett" fill="#F59E0B" radius={[3, 3, 0, 0]} /></BarChart></ChartCard>;
}

export function ProteinChart({ data }: { data: DashboardData["nutrition"] }) {
  return <ChartCard title="Protein" subtitle="7-Tage-Verlauf mit Ziel" info="Protein wird gegen das aktuelle Tagesziel von 145 Gramm dargestellt."><LineChart data={data}><CartesianGrid stroke="#1F2937" vertical={false} /><XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} /><YAxis domain={[80, 180]} tick={axis} axisLine={false} tickLine={false} width={30} /><Tooltip contentStyle={tooltip} /><ReferenceLine y={145} stroke="#6B7280" strokeDasharray="4 4" label={{ value: "Ziel", fill: "#9CA3AF", fontSize: 10 }} /><Line type="monotone" dataKey="protein" name="Protein" stroke="#22C55E" strokeWidth={2} dot={false} /></LineChart></ChartCard>;
}

function ChartCard({ title, subtitle, info, children }: { title: string; subtitle: string; info: string; children: React.ReactElement }) {
  return <DashboardCard><CardHeading title={title} subtitle={subtitle} info={info} /><div className="h-56 w-full sm:h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></DashboardCard>;
}
