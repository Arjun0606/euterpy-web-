"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: Record<string, number>;
}

const LABELS: Record<string, string> = {
  vinyl: "Vinyl",
  cd: "CD",
  cassette: "Cassette",
  digital: "Digital",
};

const COLORS: Record<string, string> = {
  vinyl: "#FF1493",
  cd: "#FF69B4",
  cassette: "#DB7093",
  digital: "#52525b",
};

export default function OwnershipPie({ data }: Props) {
  const chartData = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: LABELS[type] || type,
      value: count,
      color: COLORS[type] || "#a1a1aa",
    }));

  if (chartData.length === 0) return null;

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-muted mb-6">
        How You Own It
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
                {chartData.map((item, index) => (
                  <Cell key={index} fill={item.color} />
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
                  `${value} albums (${Math.round((value / total) * 100)}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-3">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-sm text-foreground">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.value} albums · {Math.round((item.value / total) * 100)}
                  %
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
