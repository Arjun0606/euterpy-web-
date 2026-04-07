interface Props {
  ratings: { score: number }[];
}

export default function RatingDistributionBar({ ratings }: Props) {
  if (ratings.length === 0) return null;

  const dist = [0, 0, 0, 0, 0]; // index 0 = 1 star, index 4 = 5 stars
  for (const r of ratings) {
    const bucket = Math.round(r.score) - 1;
    if (bucket >= 0 && bucket <= 4) dist[bucket]++;
  }

  const max = Math.max(...dist, 1);

  return (
    <div className="mb-10">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">Rating Distribution</h2>
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = dist[star - 1];
          const pct = (count / max) * 100;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs text-muted w-8 text-right">{star}★</span>
              <div className="flex-1 h-5 bg-card rounded-full overflow-hidden border border-border/30">
                <div
                  className="h-full bg-accent/70 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                />
              </div>
              <span className="text-xs text-muted/40 w-8">{count}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted/30 mt-2 text-center">{ratings.length} {ratings.length === 1 ? "rating" : "ratings"}</p>
    </div>
  );
}
