import Link from "next/link";
import { getArtworkUrl } from "@/lib/apple-music/client";

interface AlbumLite {
  apple_id?: string;
  title: string;
  artist_name: string;
  artwork_url: string | null;
  release_date: string | null;
  genre_names: string[] | null;
}

interface Rating {
  id: string;
  score: number;
  reaction: string | null;
  ownership?: string | null;
  created_at?: string;
  albums: AlbumLite;
}

interface SongLite {
  apple_id?: string;
  title: string;
  artist_name: string;
  album_name: string | null;
  genre_names: string[] | null;
}

interface SongRating {
  id: string;
  created_at?: string;
  songs: SongLite;
}

interface Counts {
  stories: number;
  lyricPins: number;
  lists: number;
  charts: number;
  marksGiven: number;
  marksReceived: number;
  echoesGiven: number;
  echoesReceived: number;
}

interface Props {
  username: string;
  displayName: string;
  ratings: Rating[];
  songRatings: SongRating[];
  counts: Counts;
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

// Pick a poetic adjective for the headline based on the dominant genre + decade.
function tasteAdjective(genre: string | null, decade: string | null): string {
  if (!genre || !decade) return "an unrepeatable";
  const g = genre.toLowerCase();
  if (g.includes("rock")) return "a feedback-loving";
  if (g.includes("hip") || g.includes("rap")) return "a syllable-counting";
  if (g.includes("indie")) return "a basement-tape";
  if (g.includes("pop")) return "a hook-obsessed";
  if (g.includes("jazz")) return "a chord-changing";
  if (g.includes("electronic") || g.includes("dance")) return "a four-on-the-floor";
  if (g.includes("soul") || g.includes("r&b")) return "a slow-burn";
  if (g.includes("country")) return "a back-porch";
  if (g.includes("folk")) return "a campfire";
  if (g.includes("metal")) return "a downtuned";
  if (g.includes("classical")) return "a long-form";
  if (g.includes("ambient")) return "a slow-dissolving";
  if (g.includes("punk")) return "a three-chord";
  if (g.includes("alternative")) return "an overcast";
  if (g.includes("reggae")) return "a one-drop";
  if (g.includes("blues")) return "a twelve-bar";
  return "a deeply singular";
}

export default function IdentityStats({ username, displayName, ratings, songRatings, counts }: Props) {
  // === COMPUTE STATS ===

  // Top artists
  const artistCounts: Record<string, { count: number; cover: string | null; appleId?: string }> = {};
  for (const r of ratings) {
    const a = r.albums.artist_name;
    if (!artistCounts[a]) {
      artistCounts[a] = { count: 0, cover: r.albums.artwork_url, appleId: r.albums.apple_id };
    }
    artistCounts[a].count++;
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // Top genres
  const genreCounts: Record<string, number> = {};
  for (const r of ratings) {
    for (const g of r.albums.genre_names || []) {
      if (g === "Music") continue;
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topGenre = topGenres[0]?.[0] || null;
  const totalGenreCount = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;

  // Decades
  const decadeCounts: Record<string, number> = {};
  let earliestYear = Infinity;
  let latestYear = -Infinity;
  for (const r of ratings) {
    if (!r.albums.release_date) continue;
    const year = new Date(r.albums.release_date).getFullYear();
    if (isNaN(year)) continue;
    earliestYear = Math.min(earliestYear, year);
    latestYear = Math.max(latestYear, year);
    const decade = `${Math.floor(year / 10) * 10}s`;
    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
  }
  const topDecade =
    Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const decadeOrder = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
  const decadeMaxCount = Math.max(...Object.values(decadeCounts), 1);

  // Medium breakdown
  const mediumCounts: Record<string, number> = {
    vinyl: 0,
    cd: 0,
    cassette: 0,
    digital: 0,
  };
  for (const r of ratings) {
    const m = r.ownership || "digital";
    if (m in mediumCounts) mediumCounts[m]++;
  }
  const totalMediums = Object.values(mediumCounts).reduce((a, b) => a + b, 0) || 1;
  const topMediumEntry = Object.entries(mediumCounts).sort((a, b) => b[1] - a[1])[0];
  const topMedium = topMediumEntry && topMediumEntry[1] > 0 ? topMediumEntry[0] : null;

  // Loved
  const lovedCount = ratings.filter((r) => r.score >= 4).length;
  const lovedRatio = ratings.length > 0 ? Math.round((lovedCount / ratings.length) * 100) : 0;

  // Receipts
  const lovedAlbums = ratings.filter((r) => r.score >= 4);
  const lovedWithStories = lovedAlbums.filter((r) => r.reaction);
  const mostRecent = ratings[0] || null;
  const earliest = ratings[ratings.length - 1] || null;

  // Obsessions: artists with 3+ collected
  const obsessions = topArtists.filter(([, v]) => v.count >= 3);

  // Generate the headline sentence
  const adjective = tasteAdjective(topGenre, topDecade);
  let headline = "Your taste is still finding itself.";
  if (topGenre && topDecade) {
    headline = `You live in ${topDecade.replace("s", "s")} ${topGenre.toLowerCase()}.`;
  } else if (topGenre) {
    headline = `You live in ${topGenre.toLowerCase()}.`;
  } else if (topDecade) {
    headline = `You live in the ${topDecade}.`;
  }

  // Editorial signature paragraph
  const signatureBits: string[] = [];
  if (topGenre && topDecade) {
    signatureBits.push(`${displayName} is ${adjective} ${topGenre.toLowerCase()} listener with a foot in the ${topDecade}.`);
  } else if (topGenre) {
    signatureBits.push(`${displayName} is ${adjective} ${topGenre.toLowerCase()} listener.`);
  } else {
    signatureBits.push(`${displayName} is just getting started.`);
  }
  if (topArtists[0]) {
    signatureBits.push(`${topArtists[0][0]} is the most-collected artist in the room.`);
  }
  if (topMedium && topMedium !== "digital") {
    signatureBits.push(`Mostly on ${topMedium}.`);
  } else if (topMedium === "digital") {
    signatureBits.push(`A streaming-first collector.`);
  }
  if (counts.stories > 0) {
    signatureBits.push(
      `${counts.stories} ${counts.stories === 1 ? "story" : "stories"} written, ${counts.marksReceived} ${counts.marksReceived === 1 ? "mark" : "marks"} earned.`
    );
  }
  const signature = signatureBits.join(" ");

  if (ratings.length === 0 && counts.stories === 0 && counts.lyricPins === 0) {
    return (
      <div className="text-center py-32">
        <p className="font-display text-4xl mb-3">A blank page.</p>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
          When you collect albums, write stories, and pin lyrics, this page becomes your portrait.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-20 lg:space-y-24">

      {/* === SECTION 1 — THE HEADLINE === */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-6">— The thesis</p>
        <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-tighter leading-[0.92]">
          {headline.split(" ").slice(0, -2).join(" ")}{" "}
          <span className="italic text-accent">
            {headline.split(" ").slice(-2).join(" ")}
          </span>
        </h2>
      </section>

      {/* === SECTION 2 — THE NUMBERS === */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-8">— The numbers</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          <BigStat label="Albums" value={ratings.length} />
          <BigStat label="Stories" value={counts.stories} />
          <BigStat label="Lyrics" value={counts.lyricPins} />
          <BigStat label="Lists" value={counts.lists} />
          <BigStat label="Marks" value={counts.marksReceived} subtitle="received" />
          <BigStat label="Echoes" value={counts.echoesReceived} subtitle="received" />
        </div>
      </section>

      {/* === SECTION 3 — TOP ARTISTS === */}
      {topArtists.length > 0 && (
        <section>
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2">— The most collected</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">Your top artists.</h2>
          </div>
          <ol className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-12 border-y border-white/[0.04]">
            {topArtists.map(([artist, data], i) => (
              <li key={artist} className="border-b border-white/[0.04] lg:[&:nth-last-child(2)]:border-b-0 last:border-b-0">
                <div className="flex items-center gap-4 py-4">
                  <span className="font-display text-3xl sm:text-4xl tracking-tighter text-zinc-700 w-10 sm:w-12 tabular-nums shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {data.cover && (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-card border border-border shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={art(data.cover, 200)!} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-medium truncate">{artist}</p>
                    <p className="text-xs text-zinc-600">{data.count} {data.count === 1 ? "album" : "albums"}</p>
                  </div>
                  <span className="text-[11px] text-zinc-700 tabular-nums shrink-0">
                    {Math.round((data.count / ratings.length) * 100)}%
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* === SECTION 4 — TOP GENRES === */}
      {topGenres.length > 0 && (
        <section>
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2">— The sound</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">Your genres.</h2>
          </div>
          <div className="space-y-3">
            {topGenres.map(([genre, count], i) => {
              const pct = Math.round((count / totalGenreCount) * 100);
              return (
                <div key={genre} className="group">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-sm sm:text-base font-medium">
                      <span className="font-display text-zinc-700 tabular-nums mr-3">{String(i + 1).padStart(2, "0")}</span>
                      {genre}
                    </p>
                    <p className="text-[11px] text-zinc-600 tabular-nums">
                      {count} {count === 1 ? "album" : "albums"} · {pct}%
                    </p>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, opacity: 1 - (i * 0.08) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* === SECTION 5 — DECADES === */}
      {Object.keys(decadeCounts).length > 0 && (
        <section>
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2">— The eras</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">When you live, sonically.</h2>
            <p className="text-sm text-zinc-500 mt-2 italic editorial">
              {earliestYear !== Infinity && latestYear !== -Infinity
                ? `From ${earliestYear} to ${latestYear} · ${latestYear - earliestYear + 1} years of music`
                : ""}
            </p>
          </div>
          <div className="grid grid-cols-8 gap-2 sm:gap-3 items-end h-48">
            {decadeOrder.map((decade) => {
              const count = decadeCounts[decade] || 0;
              const heightPct = (count / decadeMaxCount) * 100;
              const isTop = decade === topDecade;
              return (
                <div key={decade} className="flex flex-col items-center justify-end h-full">
                  <p className="text-[10px] tabular-nums text-zinc-700 mb-1">{count > 0 ? count : ""}</p>
                  <div
                    className={`w-full rounded-t-md ${isTop ? "bg-accent" : "bg-white/[0.08]"} transition-all duration-700`}
                    style={{ height: `${heightPct}%`, minHeight: count > 0 ? 4 : 0 }}
                  />
                  <p className={`text-[10px] mt-2 ${isTop ? "text-accent font-semibold" : "text-zinc-600"}`}>
                    {decade.replace("s", "")}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* === SECTION 6 — OBSESSIONS === */}
      {obsessions.length > 0 && (
        <section>
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2">— The receipts</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">Your obsessions.</h2>
            <p className="text-sm text-zinc-500 mt-2 italic editorial">
              Artists you couldn&apos;t stop with. Three or more in your collection.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {obsessions.slice(0, 8).map(([artist, data]) => (
              <div key={artist} className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center">
                {data.cover && (
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-background border border-border mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={art(data.cover, 200)!} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-sm font-medium truncate w-full">{artist}</p>
                <p className="text-[11px] text-accent mt-1">{data.count} albums</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === SECTION 7 — HOW YOU COLLECT === */}
      {topMedium && (
        <section>
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2">— The format</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">How you collect.</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(["vinyl", "cd", "cassette", "digital"] as const).map((m) => {
              const count = mediumCounts[m];
              const pct = Math.round((count / totalMediums) * 100);
              const isTop = m === topMedium;
              const emoji = m === "vinyl" ? "💽" : m === "cd" ? "💿" : m === "cassette" ? "📼" : "🎧";
              return (
                <div
                  key={m}
                  className={`p-5 rounded-2xl border ${isTop ? "bg-accent/10 border-accent/40" : "bg-card border-border"}`}
                >
                  <p className="text-3xl mb-2">{emoji}</p>
                  <p className={`text-[10px] uppercase tracking-[0.18em] mb-1 ${isTop ? "text-accent" : "text-zinc-600"}`}>
                    {m === "digital" ? "Stream" : m}
                  </p>
                  <p className="font-display text-3xl tracking-tight">{count}</p>
                  <p className="text-[11px] text-zinc-700">{pct}%</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* === SECTION 8 — MARKS GIVEN/RECEIVED === */}
      <section>
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2">— The voice</p>
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight">Your social signal.</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SocialStat label="Marks given" value={counts.marksGiven} subtitle="how generous you are" />
          <SocialStat label="Marks received" value={counts.marksReceived} subtitle="how loved your work is" />
          <SocialStat label="Echoes given" value={counts.echoesGiven} subtitle="what you carry forward" />
          <SocialStat label="Echoes received" value={counts.echoesReceived} subtitle="what travels from you" />
        </div>
      </section>

      {/* === SECTION 9 — LOVED RATIO === */}
      {ratings.length > 0 && (
        <section>
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2">— The taste</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">How you choose.</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-8 sm:p-10">
            <p className="font-display text-6xl sm:text-7xl tracking-tighter mb-3">
              {lovedRatio}<span className="text-accent">%</span>
            </p>
            <p className="text-zinc-400 text-base">
              of your collection is <span className="text-accent">loved</span>.
            </p>
            <p className="text-xs text-zinc-600 mt-3 italic editorial">
              {lovedRatio >= 70
                ? "You only collect what you love. A discerning ear."
                : lovedRatio >= 40
                  ? "A balance of loved records and curiosities. The collector's instinct."
                  : lovedRatio >= 20
                    ? "Mostly exploration, occasional devotion. A wide net."
                    : "You collect first, fall in love later."}
            </p>
          </div>
        </section>
      )}

      {/* === SECTION 10 — THE ANCHORS === */}
      {(mostRecent || earliest || lovedWithStories.length > 0) && (
        <section>
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2">— The anchors</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">The moments that built you.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {earliest && earliest !== mostRecent && (
              <AnchorCard label="The first" album={earliest.albums} subtitle={earliest.created_at ? `Added ${new Date(earliest.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""} />
            )}
            {mostRecent && (
              <AnchorCard label="The latest" album={mostRecent.albums} subtitle={mostRecent.created_at ? `Added ${new Date(mostRecent.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""} />
            )}
            {lovedWithStories[0] && (
              <AnchorCard label="A loved one" album={lovedWithStories[0].albums} subtitle="With a note" />
            )}
          </div>
        </section>
      )}

      {/* === SECTION 11 — THE SIGNATURE === */}
      <section className="border-t border-white/[0.04] pt-16">
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-6">— The signature</p>
        <p className="font-display italic text-2xl sm:text-3xl lg:text-4xl leading-[1.4] tracking-tight text-zinc-200 max-w-4xl">
          {signature}
        </p>
        <p className="text-[11px] text-zinc-700 mt-8">
          A portrait of <Link href={`/${username}`} className="text-accent hover:underline">@{username}</Link>, generated entirely from intentional acts.
        </p>
      </section>

    </div>
  );
}

function BigStat({ label, value, subtitle }: { label: string; value: number; subtitle?: string }) {
  return (
    <div>
      <p className="font-display text-5xl sm:text-6xl tracking-tighter text-white tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mt-1">{label}</p>
      {subtitle && <p className="text-[10px] text-zinc-700 italic">{subtitle}</p>}
    </div>
  );
}

function SocialStat({ label, value, subtitle }: { label: string; value: number; subtitle: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <p className="font-display text-4xl sm:text-5xl tracking-tighter text-white tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-accent mt-2">{label}</p>
      <p className="text-[10px] text-zinc-700 italic mt-1">{subtitle}</p>
    </div>
  );
}

function AnchorCard({ label, album, subtitle }: { label: string; album: AlbumLite; subtitle: string }) {
  const cover = art(album.artwork_url, 400);
  const inner = (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors">
      <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-3">{label}</p>
      {cover && (
        <div className="aspect-square rounded-lg overflow-hidden bg-background border border-border mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={album.title} className="w-full h-full object-cover" />
        </div>
      )}
      <p className="text-sm font-medium truncate">{album.title}</p>
      <p className="text-xs text-zinc-500 truncate italic">{album.artist_name}</p>
      <p className="text-[10px] text-zinc-700 mt-2">{subtitle}</p>
    </div>
  );
  if (album.apple_id) {
    return <Link href={`/album/${album.apple_id}`}>{inner}</Link>;
  }
  return inner;
}
