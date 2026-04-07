"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  data: {
    under3: number;
    between3and5: number;
    over5: number;
  };
}

const COLORS = ["#FF1493", "#FF69B4", "#DB7093"];

export default function SongLengthPie({ data }: Props) {
  const chartData = [
    { name: "< 3 min", value: data.under3 },
    { name: "3–5 min", value: data.between3and5 },
    { name: "> 5 min", value: data.over5 },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) return null;

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">
        Song Length Distribution
      </h2>

      <div className="flex items-center gap-8">
        <div style={{ width: 200, height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  color: "#ededed",
                  fontSize: "13px",
                }}
                formatter={(value: any, name: any) => [
                  `${value} songs (${Math.round((value / total) * 100)}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-3">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index] }}
              />
              <div>
                <p className="text-sm text-foreground">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.value} songs · {Math.round((item.value / total) * 100)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
