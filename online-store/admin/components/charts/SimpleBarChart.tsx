"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SimpleBarChart({ data, dataKey = "value" }: { data: { label: string; value: number }[]; dataKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="currentColor" className="text-border" strokeOpacity={0.6} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted" tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
        />
        <Bar dataKey={dataKey} fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
