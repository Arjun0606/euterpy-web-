"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  data: Record<string, number>;
  label: string;
}

export default function TopArtistsChart({ data, label }: Props) {
  const sorted = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">
        Top Artists by {label}
      </h2>

      <div style={{ width: "100%", height: sorted.length * 44 + 20 }}>
        <ResponsiveContainer>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#ededed", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              width={140}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "8px",
                color: "#ededed",
                fontSize: "13px",
              }}
              formatter={(value: any) => [`${value} ${label.toLowerCase()}`, ""]}
              cursor={{ fill: "rgba(255,20,147,0.05)" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {sorted.map((_, index) => (
                <Cell
                  key={index}
                  fill={index === 0 ? "#FF1493" : "#FF149366"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
