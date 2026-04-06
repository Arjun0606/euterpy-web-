"use client";

interface Props {
  topGenre: string | null;
  topArtist: string | null;
  albumCount: number;
  songCount: number;
  avgRating: number;
  topDecade: string | null;
  dominantOwnership: string | null;
  superfanArtists: { name: string; count: number }[];
  highestRated: { title: string; artist: string; score: number } | null;
}

export default function TasteProfile({
  topGenre,
  topArtist,
  albumCount,
  songCount,
  avgRating,
  topDecade,
  dominantOwnership,
  superfanArtists,
  highestRated,
}: Props) {
  // Generate a taste description
  const parts: string[] = [];
  if (topGenre) parts.push(topGenre.toLowerCase());
  if (topDecade) parts.push(`${topDecade} era`);
  if (dominantOwnership === "vinyl") parts.push("vinyl collector");
  else if (dominantOwnership === "cd") parts.push("CD archivist");

  const harshness =
    avgRating >= 4.2 ? "generous" :
    avgRating >= 3.5 ? "balanced" :
    avgRating >= 2.8 ? "discerning" :
    "ruthless";

  const descriptor = parts.length > 0 ? parts.slice(0, 2).join(" · ") : "eclectic";

  return (
    <div className="mb-10">
      {/* Taste identity headline */}
      <div className="bg-gradient-to-br from-accent/[0.06] via-white/[0.02] to-transparent border border-white/[0.06] rounded-2xl p-5 sm:p-8 mb-6">
        <p className="text-[10px] uppercase tracking-widest text-muted/40 mb-3">Taste Profile</p>
        <h2 className="font-display text-xl sm:text-2xl mb-2 leading-snug">
          A <span className="text-accent">{harshness}</span> curator of {descriptor}
        </h2>
        <p className="text-xs sm:text-sm text-muted/60">
          {albumCount} albums · {songCount} songs · avg {avgRating.toFixed(1)}★
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Highest rated */}
        {highestRated && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted/40 mb-2">Highest Rated</p>
            <p className="text-sm font-medium truncate">{highestRated.title}</p>
            <p className="text-xs text-muted truncate">{highestRated.artist}</p>
            <p className="text-accent text-sm font-semibold mt-1">★ {highestRated.score}</p>
          </div>
        )}

        {/* Top artist */}
        {topArtist && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted/40 mb-2">Most Curated Artist</p>
            <p className="text-sm font-medium truncate">{topArtist}</p>
            <p className="text-xs text-muted mt-1">
              {superfanArtists.find((a) => a.name === topArtist)?.count || 0} albums rated
            </p>
          </div>
        )}
      </div>

      {/* Superfan artists */}
      {superfanArtists.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-widest text-muted/40 mb-3">Artist Deep Dives</p>
          <div className="flex flex-wrap gap-2">
            {superfanArtists.map((artist) => (
              <span
                key={artist.name}
                className="px-3 py-1.5 bg-card border border-border rounded-full text-xs"
              >
                <span className="font-medium">{artist.name}</span>
                <span className="text-muted ml-1.5">{artist.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
