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
  albumData: Record<string, number>;
  viewMode: "album" | "song";
}

export default function DecadeChart({ albumData, viewMode }: Props) {
  // Build from actual data — no hardcoded range
  const data = Object.entries(albumData)
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade.localeCompare(b.decade));

  if (data.length === 0) return null;

  // Find the dominant decade
  const topDecade = data.reduce((a, b) => (a.count > b.count ? a : b));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">
          Listening by Decade ({viewMode === "album" ? "Albums" : "Songs"})
        </h2>
        <div className="text-right">
          <span className="text-sm text-foreground">{topDecade.decade}</span>
          <span className="text-xs text-muted ml-1">most played</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="decade"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "8px",
                color: "#ededed",
                fontSize: "13px",
              }}
              formatter={(value: any) => [
                `${value} ${viewMode === "album" ? "albums" : "songs"}`,
                "",
              ]}
              cursor={{ fill: "rgba(255,20,147,0.05)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((entry, index) => {
                const isTop = entry.decade === topDecade.decade;
                return (
                  <Cell
                    key={index}
                    fill={isTop ? "#FF1493" : "#FF149366"}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
