"use client";

interface Props {
  totalMinutes: number;
  totalAlbums: number;
  totalSongs: number;
  genreMinutes: Record<string, number>;
}

export default function ListeningStats({
  totalMinutes,
  totalAlbums,
  totalSongs,
  genreMinutes,
}: Props) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  // Top genres by minutes
  const topGenreMinutes = Object.entries(genreMinutes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxGenreMinutes = topGenreMinutes[0]?.[1] || 1;

  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-muted mb-6">
        All Time
      </h2>

      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-3 sm:p-5 text-center">
          <p className="text-2xl sm:text-3xl font-semibold text-accent">
            {totalMinutes > 0 ? (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`) : "—"}
          </p>
          <p className="text-[10px] sm:text-xs text-muted mt-1">Minutes</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 sm:p-5 text-center">
          <p className="text-2xl sm:text-3xl font-semibold text-foreground">{totalAlbums}</p>
          <p className="text-[10px] sm:text-xs text-muted mt-1">Albums</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 sm:p-5 text-center">
          <p className="text-2xl sm:text-3xl font-semibold text-foreground">{totalSongs}</p>
          <p className="text-[10px] sm:text-xs text-muted mt-1">Songs</p>
        </div>
      </div>

      {/* 6. Minutes by genre */}
      {topGenreMinutes.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted mb-4">
            Minutes by Genre
          </h3>
          <div className="space-y-3">
            {topGenreMinutes.map(([genre, minutes]) => (
              <div key={genre}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{genre}</span>
                  <span className="text-muted tabular-nums">
                    {Math.round(minutes)}m
                  </span>
                </div>
                <div className="h-2 bg-card rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{
                      width: `${(minutes / maxGenreMinutes) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
