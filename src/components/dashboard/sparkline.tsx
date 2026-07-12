"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="h-9 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.8} dot={false} isAnimationActive animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
