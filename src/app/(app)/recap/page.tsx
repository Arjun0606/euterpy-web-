import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import RecapCard from "./RecapCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Year in Sound" };

function art(url: string | null, size = 400): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default async function RecapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/feed");

  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1).toISOString();

  const { data: ratings } = await supabase
    .from("ratings")
    .select("score, created_at, ownership, albums(apple_id, title, artist_name, artwork_url, genre_names)")
    .eq("user_id", user.id)
    .gte("created_at", yearStart)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  const validRatings = (ratings || []).filter((r: any) => r.albums);

  // Top albums (top 8)
  const topAlbums = validRatings.slice(0, 8).map((r: any) => ({
    apple_id: r.albums.apple_id,
    title: r.albums.title,
    artist: r.albums.artist_name,
    cover: art(r.albums.artwork_url),
  }));

  // Top artists by count
  const artistCounts: Record<string, number> = {};
  for (const r of validRatings as any[]) {
    const a = r.albums.artist_name;
    artistCounts[a] = (artistCounts[a] || 0) + 1;
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Top genres
  const genreCounts: Record<string, number> = {};
  for (const r of validRatings as any[]) {
    for (const g of r.albums.genre_names || []) {
      if (g === "Music") continue;
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // Medium breakdown
  const mediumCounts: Record<string, number> = {};
  for (const r of validRatings as any[]) {
    if (r.ownership) mediumCounts[r.ownership] = (mediumCounts[r.ownership] || 0) + 1;
  }
  const topMedium = Object.entries(mediumCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const totalCollected = validRatings.length;

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-2">Recap · {year}</p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-tight leading-none">
          Your year <span className="italic text-accent">in sound.</span>
        </h1>
        <p className="text-zinc-500 mt-3">A snapshot of who you became this year, musically.</p>
      </div>

      {totalCollected === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="font-display text-3xl mb-3">Nothing yet.</p>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">
            Add albums to your collection this year and your recap will fill in.
          </p>
          <a href="/search" className="inline-block mt-6 px-8 py-3 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent-hover transition-colors">
            Find something
          </a>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <Stat label="Collected" value={totalCollected.toString()} />
            <Stat label="Artists" value={Object.keys(artistCounts).length.toString()} />
            <Stat label="Genres" value={Object.keys(genreCounts).length.toString()} />
          </div>

          {/* Top albums */}
          {topAlbums.length > 0 && (
            <section className="mb-14">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">Your top albums</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {topAlbums.map((album, i) => (
                  <a key={album.apple_id} href={`/album/${album.apple_id}`} className="group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-accent/40 transition-all relative">
                      {album.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
                      )}
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-accent">
                        {i + 1}
                      </div>
                    </div>
                    <p className="text-sm font-medium truncate">{album.title}</p>
                    <p className="text-[11px] text-zinc-600 truncate">{album.artist}</p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Top artists */}
          {topArtists.length > 0 && (
            <section className="mb-14">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">Most-collected artists</p>
              <ol className="border-y border-white/[0.04] divide-y divide-white/[0.04]">
                {topArtists.map((artist, i) => (
                  <li key={artist.name} className="flex items-baseline gap-4 py-4">
                    <span className="font-display text-3xl sm:text-4xl tracking-tighter text-zinc-700 w-10 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-2xl sm:text-3xl tracking-tight flex-1 min-w-0 truncate">{artist.name}</span>
                    <span className="text-xs text-zinc-600 tabular-nums">{artist.count} {artist.count === 1 ? "album" : "albums"}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Genres + medium */}
          <section className="mb-14 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {topGenres.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Sound of your year</p>
                <p className="font-display text-2xl tracking-tight leading-tight">
                  {topGenres.join(" · ")}
                </p>
              </div>
            )}
            {topMedium && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">How you listened</p>
                <p className="font-display text-2xl tracking-tight capitalize">
                  Mostly {topMedium === "digital" ? "streamed" : topMedium}
                </p>
              </div>
            )}
          </section>

          {/* Share */}
          <RecapCard username={profile.username} year={year} />
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 text-center">
      <p className="font-display text-4xl sm:text-5xl text-accent tracking-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 mt-2">{label}</p>
    </div>
  );
}
