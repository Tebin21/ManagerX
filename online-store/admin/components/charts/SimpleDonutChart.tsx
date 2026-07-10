"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#2563eb", "#f43f5e", "#f59e0b", "#10b981", "#64748b"];

export function SimpleDonutChart({ data }: { data: { label: string; value: number }[] }) {
  const nonZero = data.filter((d) => d.value > 0);
  if (nonZero.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-muted">No data yet</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={nonZero} dataKey="value" nameKey="label" innerRadius={45} outerRadius={70} paddingAngle={2}>
          {nonZero.map((entry, i) => (
            <Cell key={entry.label} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
