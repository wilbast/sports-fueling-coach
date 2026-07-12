"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

export function ProgressRing({ value, color, size = "large", label }: { value: number; color: string; size?: "small" | "large"; label?: string }) {
  const height = size === "large" ? 176 : 132;
  return (
    <div className="relative w-full" style={{ height }} role="img" aria-label={`${label ?? "Fortschritt"}: ${value} von 100`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="78%" outerRadius="100%" data={[{ value, fill: color }]} startAngle={90} endAngle={-270} barSize={size === "large" ? 11 : 8}>
          <RadialBar dataKey="value" background={{ fill: "#1F2937" }} cornerRadius={8} isAnimationActive animationDuration={900} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={size === "large" ? "text-4xl font-semibold text-white" : "text-3xl font-semibold text-white"}>{value}</span>
        <span className="mt-1 text-xs font-medium text-[#9CA3AF]">von 100</span>
      </div>
    </div>
  );
}
