"use client";

// components/stats/StatChart.tsx

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { StatEntry } from "@/lib/types";

export default function StatChart({ entries, unit }: { entries: StatEntry[]; unit: string }) {
  if (entries.length < 2) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-4 text-center">
        <p className="text-sm text-[#6B7280]">Log at least two entries to see a trend chart.</p>
      </div>
    );
  }

  const chartData = entries.map((e) => ({
    date: new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: e.value,
  }));

  const values = entries.map((e) => e.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.15 || 5;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 mb-4">
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#F1F2F4" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[min - padding, max + padding]}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              formatter={(value: number) => [`${value} ${unit}`, ""]}
              labelStyle={{ color: "#1D2027", fontSize: 12 }}
              contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0D9488"
              strokeWidth={2}
              dot={{ fill: "#0D9488", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
