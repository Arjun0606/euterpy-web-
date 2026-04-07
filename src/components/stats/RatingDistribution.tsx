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
  songData: Record<string, number>;
  viewMode: "album" | "song";
}

const ALL_RATINGS = ["1", "2", "3", "4", "5"];

export default function RatingDistribution({
  albumData,
  songData,
  viewMode,
}: Props) {
  const activeData = viewMode === "album" ? albumData : songData;

  const chartData = ALL_RATINGS.map((rating) => ({
    rating: rating.includes(".5") ? `${rating}` : `${rating}.0`,
    count: activeData[rating] || 0,
    label: `★ ${rating}`,
  }));

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  // Average rating
  let totalScore = 0;
  let totalCount = 0;
  for (const [score, count] of Object.entries(activeData)) {
    totalScore += parseFloat(score) * count;
    totalCount += count;
  }
  const avgRating = totalCount > 0 ? (totalScore / totalCount).toFixed(2) : "—";

  if (totalCount === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          Rating Distribution ({viewMode === "album" ? "Albums" : "Songs"})
        </h2>
        <div className="text-right">
          <span className="text-2xl font-semibold text-accent">{avgRating}</span>
          <span className="text-xs text-muted ml-1">avg rating</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="rating"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
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
              labelFormatter={(label) => `★ ${label}`}
              cursor={{ fill: "rgba(255,20,147,0.05)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((entry, index) => {
                const intensity = entry.count / maxCount;
                return (
                  <Cell
                    key={index}
                    fill={`rgba(255, 20, 147, ${0.3 + intensity * 0.7})`}
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
