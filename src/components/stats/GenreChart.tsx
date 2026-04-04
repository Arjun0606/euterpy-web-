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
}

const COLORS = [
  "#FF1493",
  "#FF69B4",
  "#DB7093",
  "#C71585",
  "#FF1493CC",
  "#FF69B4CC",
  "#DB7093CC",
  "#C71585CC",
  "#FF149999",
  "#FF69B499",
];

export default function GenreChart({ data }: Props) {
  const sorted = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({ genre, count }));

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-muted mb-6">
        Songs by Genre
      </h2>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart
            data={sorted}
            margin={{ top: 0, right: 0, left: 0, bottom: 60 }}
          >
            <XAxis
              dataKey="genre"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
              allowDecimals={false}
              label={{
                value: "Songs",
                angle: -90,
                position: "insideLeft",
                fill: "#a1a1aa",
                fontSize: 12,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: "8px",
                color: "#ededed",
                fontSize: "13px",
              }}
              formatter={(value: any) => [`${value} songs`, ""]}
              cursor={{ fill: "rgba(255,20,147,0.05)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {sorted.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
