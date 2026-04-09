import Link from "next/link";
import { getArtworkUrl } from "@/lib/apple-music/client";

interface AlbumLite {
  apple_id?: string;
  title: string;
  artist_name: string;
  artwork_url: string | null;
  release_date: string | null;
  genre_names: string[] | null;
  record_label?: string | null;
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

interface Story {
  id: string;
  headline: string | null;
  body: string;
  created_at: string;
  target_apple_id: string;
  target_title: string;
  target_artist: string | null;
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
  followers?: number;
  following?: number;
}

interface Props {
  username: string;
  displayName: string;
  ratings: Rating[];
  songRatings: SongRating[];
  stories?: Story[];
  mostMarkedStory?: Story | null;
  counts: Counts;
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

// Stopwords for vocabulary extraction — common English words filtered out
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "i", "me", "my", "myself",
  "we", "us", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "he", "him", "his", "himself", "she", "her", "hers",
  "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
  "these", "those", "am", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before",
  "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "once",
  "here", "there", "when", "where", "why", "how", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "now", "also", "as", "than", "like", "still",
  "really", "even", "much", "way", "back", "well", "get", "got", "go", "going", "gone", "want", "wanted", "make", "makes", "made",
  "see", "saw", "seen", "know", "knew", "known", "think", "thought", "say", "said", "tell", "told", "feel", "felt", "look", "looking",
  "looked", "find", "found", "give", "gave", "given", "take", "took", "taken", "come", "came", "first", "last", "next", "old",
  "new", "good", "great", "long", "little", "big", "small", "high", "right", "different", "another", "right", "thing", "things",
  "something", "anything", "nothing", "everything", "way", "people", "person", "time", "year", "day", "yeah", "yes", "kind", "sort",
  "lot", "lots", "since", "though", "although", "while", "until", "because", "due", "ever", "never", "always", "sometimes",
  "often", "song", "songs", "album", "albums", "track", "tracks", "music", "record", "records", "listen", "listening", "listened",
  "hear", "heard", "sound", "sounds",
]);

function extractVocabulary(stories: Story[]): { word: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const s of stories) {
    const text = `${s.headline || ""} ${s.body}`.toLowerCase();
    // Strip punctuation, split on whitespace
    const words = text.replace(/[^\w\s']/g, " ").split(/\s+/);
    for (const w of words) {
      const word = w.trim();
      if (word.length < 4) continue;
      if (STOPWORDS.has(word)) continue;
      if (/^\d+$/.test(word)) continue;
      counts[word] = (counts[word] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .filter((w) => w.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 24);
}

// Simple Shannon entropy for genre diversity
function shannonDiversity(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

// Compute longest consecutive-day streak from a list of timestamps
function longestStreak(timestamps: string[]): { days: number; endDate: Date | null } {
  if (timestamps.length === 0) return { days: 0, endDate: null };
  // Get unique day strings
  const dayStrings = new Set<string>();
  for (const t of timestamps) {
    const d = new Date(t);
    if (isNaN(d.getTime())) continue;
    dayStrings.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  const days = Array.from(dayStrings)
    .map((s) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m, d);
    })
    .sort((a, b) => a.getTime() - b.getTime());

  if (days.length === 0) return { days: 0, endDate: null };

  let longestRun = 1;
  let currentRun = 1;
  let longestEnd = days[0];
  let currentEnd = days[0];
  for (let i = 1; i < days.length; i++) {
    const diff = (days[i].getTime() - days[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentRun++;
      currentEnd = days[i];
    } else {
      currentRun = 1;
      currentEnd = days[i];
    }
    if (currentRun > longestRun) {
      longestRun = currentRun;
      longestEnd = currentEnd;
    }
  }
  return { days: longestRun, endDate: longestEnd };
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

export default function IdentityStats({
  username,
  displayName,
  ratings,
  songRatings: _songRatings,
  stories = [],
  mostMarkedStory = null,
  counts,
}: Props) {
  // === COMPUTE STATS ===

  // Top artists
  const artistData: Record<string, { count: number; cover: string | null; appleId?: string; ratings: Rating[] }> = {};
  for (const r of ratings) {
    const a = r.albums.artist_name;
    if (!artistData[a]) {
      artistData[a] = { count: 0, cover: r.albums.artwork_url, appleId: r.albums.apple_id, ratings: [] };
    }
    artistData[a].count++;
    artistData[a].ratings.push(r);
  }
  const topArtists = Object.entries(artistData)
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

  // Genre diversity (Shannon)
  const genreDiversity = shannonDiversity(Object.values(genreCounts));
  const genreDiversityLabel =
    genreDiversity >= 3.5 ? "remarkably wide"
    : genreDiversity >= 2.5 ? "wide"
    : genreDiversity >= 1.5 ? "focused"
    : "monomaniacal";

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
  const topDecade = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const decadeOrder = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
  const decadeMaxCount = Math.max(...Object.values(decadeCounts), 1);

  // Top artist per decade (ACT V data point)
  const artistByDecade: Record<string, { artist: string; count: number; cover: string | null; appleId?: string }> = {};
  for (const decade of decadeOrder) {
    const artistsInDecade: Record<string, { count: number; cover: string | null; appleId?: string }> = {};
    for (const r of ratings) {
      if (!r.albums.release_date) continue;
      const year = new Date(r.albums.release_date).getFullYear();
      if (isNaN(year)) continue;
      const d = `${Math.floor(year / 10) * 10}s`;
      if (d !== decade) continue;
      const a = r.albums.artist_name;
      if (!artistsInDecade[a]) artistsInDecade[a] = { count: 0, cover: r.albums.artwork_url, appleId: r.albums.apple_id };
      artistsInDecade[a].count++;
    }
    const top = Object.entries(artistsInDecade).sort((a, b) => b[1].count - a[1].count)[0];
    if (top && top[1].count >= 1) {
      artistByDecade[decade] = { artist: top[0], ...top[1] };
    }
  }

  // Average album age (years between release and date added)
  let totalAge = 0;
  let agedCount = 0;
  for (const r of ratings) {
    if (!r.albums.release_date || !r.created_at) continue;
    const releaseYear = new Date(r.albums.release_date).getFullYear();
    const addedYear = new Date(r.created_at).getFullYear();
    if (isNaN(releaseYear) || isNaN(addedYear)) continue;
    totalAge += addedYear - releaseYear;
    agedCount++;
  }
  const averageAlbumAge = agedCount > 0 ? Math.round(totalAge / agedCount) : null;

  // Top labels
  const labelCounts: Record<string, number> = {};
  for (const r of ratings) {
    if (!r.albums.record_label) continue;
    labelCounts[r.albums.record_label] = (labelCounts[r.albums.record_label] || 0) + 1;
  }
  const topLabels = Object.entries(labelCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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

  // === TIME SERIES ===
  // Group ratings by month for the growth sparkline
  const monthlyAdds: Record<string, number> = {};
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  const hourOfDayCounts = new Array(24).fill(0);
  const allTimestamps: string[] = [];
  const yearFirstAlbum: Record<string, Rating> = {};
  for (const r of ratings) {
    if (!r.created_at) continue;
    allTimestamps.push(r.created_at);
    const d = new Date(r.created_at);
    if (isNaN(d.getTime())) continue;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyAdds[monthKey] = (monthlyAdds[monthKey] || 0) + 1;
    dayOfWeekCounts[d.getDay()]++;
    hourOfDayCounts[d.getHours()]++;

    const yearKey = String(d.getFullYear());
    if (!yearFirstAlbum[yearKey] || new Date(r.created_at) < new Date(yearFirstAlbum[yearKey].created_at!)) {
      yearFirstAlbum[yearKey] = r;
    }
  }

  // Sparkline series (last 12 months)
  const monthsBack = 12;
  const sparklineData: { month: string; count: number }[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    sparklineData.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      count: monthlyAdds[key] || 0,
    });
  }
  const sparklineMax = Math.max(...sparklineData.map((d) => d.count), 1);
  const totalThisYear = ratings.filter((r) => r.created_at && new Date(r.created_at).getFullYear() === now.getFullYear()).length;

  // Day of week peak
  const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dowMax = Math.max(...dayOfWeekCounts, 1);
  const peakDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
  const peakDay = dowNames[peakDayIndex];

  // Hour of day peak
  let peakHour = 0;
  let peakHourCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourOfDayCounts[h] > peakHourCount) {
      peakHourCount = hourOfDayCounts[h];
      peakHour = h;
    }
  }
  const peakHourLabel =
    peakHour === 0 ? "midnight" :
    peakHour < 12 ? `${peakHour}am` :
    peakHour === 12 ? "noon" :
    `${peakHour - 12}pm`;
  const timeOfDayDescriptor =
    peakHour >= 5 && peakHour < 12 ? "morning person"
    : peakHour >= 12 && peakHour < 17 ? "afternoon collector"
    : peakHour >= 17 && peakHour < 22 ? "evening listener"
    : "late-night listener";

  // Longest streak
  const streak = longestStreak(allTimestamps);

  // Vocabulary
  const vocabulary = extractVocabulary(stories);

  // Reciprocity
  const reciprocity =
    counts.marksReceived > 0 ? counts.marksGiven / counts.marksReceived : null;
  const reciprocityLabel =
    reciprocity === null ? null
    : reciprocity > 2 ? "deeply generous"
    : reciprocity > 1.2 ? "generous"
    : reciprocity > 0.8 ? "balanced"
    : reciprocity > 0.4 ? "magnetic"
    : "deeply magnetic";

  // Story-to-collection ratio
  const storyToCollection =
    ratings.length > 0 && counts.stories > 0
      ? Math.round((ratings.length / counts.stories))
      : null;

  // Years on platform
  const yearsOnPlatform = Object.keys(yearFirstAlbum).sort();

  // Generate the headline sentence
  let headline = "Your taste is still finding itself.";
  if (topGenre && topDecade) {
    headline = `You live in ${topDecade.replace("s", "s")} ${topGenre.toLowerCase()}.`;
  } else if (topGenre) {
    headline = `You live in ${topGenre.toLowerCase()}.`;
  } else if (topDecade) {
    headline = `You live in the ${topDecade}.`;
  }
  const adjective = tasteAdjective(topGenre, topDecade);

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
  if (averageAlbumAge !== null && averageAlbumAge >= 15) {
    signatureBits.push(`A nostalgist — the average album in this collection is ${averageAlbumAge} years old.`);
  } else if (averageAlbumAge !== null && averageAlbumAge <= 2) {
    signatureBits.push(`A present-tense listener.`);
  }
  if (peakHour >= 22 || peakHour < 5) {
    signatureBits.push(`A late-night collector — peak ${peakHourLabel}.`);
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
    <div className="space-y-24 lg:space-y-28">

      {/* ============================================================ */}
      {/* === ACT I — THE THESIS === */}
      {/* ============================================================ */}
      <section>
        <ActLabel num="I" title="The thesis" />
        <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-tighter leading-[0.92]">
          {headline.split(" ").slice(0, -2).join(" ")}{" "}
          <span className="italic text-accent">
            {headline.split(" ").slice(-2).join(" ")}
          </span>
        </h2>
      </section>

      {/* ============================================================ */}
      {/* === ACT II — THE NUMBERS === */}
      {/* ============================================================ */}
      <section>
        <ActLabel num="II" title="The numbers" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
          <BigStat label="Albums" value={ratings.length} />
          <BigStat label="Stories" value={counts.stories} />
          <BigStat label="Lyrics" value={counts.lyricPins} />
          <BigStat label="Lists" value={counts.lists} />
          <BigStat label="Charts" value={counts.charts} />
          <BigStat label="Loved" value={lovedCount} subtitle={`of ${ratings.length}`} />
        </div>
        {(counts.followers !== undefined || counts.following !== undefined) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6 mt-8 pt-8 border-t border-white/[0.04]">
            <BigStat label="Followers" value={counts.followers || 0} />
            <BigStat label="Following" value={counts.following || 0} />
            <BigStat label="Marks given" value={counts.marksGiven} />
            <BigStat label="Marks received" value={counts.marksReceived} />
            <BigStat label="Echoes given" value={counts.echoesGiven} />
            <BigStat label="Echoes received" value={counts.echoesReceived} />
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* === ACT III — TOP ARTISTS === */}
      {/* ============================================================ */}
      {topArtists.length > 0 && (
        <section>
          <ActLabel num="III" title="The most collected" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-8">Your top artists.</h2>
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

      {/* ============================================================ */}
      {/* === ACT IV — THE SOUND === */}
      {/* ============================================================ */}
      {topGenres.length > 0 && (
        <section>
          <ActLabel num="IV" title="The sound" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-2">Your genres.</h2>
          {genreDiversity > 0 && (
            <p className="text-sm text-zinc-500 italic editorial mb-8">
              Genre diversity: <span className="text-accent">{genreDiversity.toFixed(1)}</span> — a {genreDiversityLabel} listener.
            </p>
          )}
          <div className="space-y-3 mb-12">
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

          {/* Top labels */}
          {topLabels.length > 0 && (
            <div className="border-t border-white/[0.04] pt-8">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-3">— Label loyalty</p>
              <div className="flex flex-wrap gap-2">
                {topLabels.map(([label, count]) => (
                  <span key={label} className="px-4 py-2 bg-card border border-border rounded-full text-xs">
                    <span className="text-zinc-300">{label}</span>
                    <span className="text-zinc-600 ml-2">· {count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* === ACT V — WHEN YOU LIVE === */}
      {/* ============================================================ */}
      {Object.keys(decadeCounts).length > 0 && (
        <section>
          <ActLabel num="V" title="The eras" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-2">When you live, sonically.</h2>
          <p className="text-sm text-zinc-500 italic editorial mb-8">
            {earliestYear !== Infinity && latestYear !== -Infinity
              ? `From ${earliestYear} to ${latestYear} · ${latestYear - earliestYear + 1} years of music`
              : ""}
          </p>
          <div className="grid grid-cols-8 gap-2 sm:gap-3 items-end h-48 mb-12">
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

          {averageAlbumAge !== null && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-8">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-2">Average album age when added</p>
              <p className="font-display text-5xl tracking-tighter">
                {averageAlbumAge}<span className="text-accent text-3xl ml-1">{averageAlbumAge === 1 ? "year" : "years"}</span>
              </p>
              <p className="text-xs text-zinc-500 mt-3 italic editorial">
                {averageAlbumAge >= 25
                  ? "A historian. You collect what was, not what is."
                  : averageAlbumAge >= 10
                    ? "A patient listener. You let albums age before you find them."
                    : averageAlbumAge >= 3
                      ? "A balanced collector — one foot in the present, one in the recent past."
                      : "A present-tense listener. You collect what's happening right now."}
              </p>
            </div>
          )}

          {/* Top artist per decade */}
          {Object.keys(artistByDecade).length > 1 && (
            <div className="border-t border-white/[0.04] pt-8">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-4">— Who anchors each era</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {decadeOrder.filter((d) => artistByDecade[d]).map((decade) => {
                  const data = artistByDecade[decade];
                  return (
                    <div key={decade} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                      {data.cover && (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-background border border-border shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={art(data.cover, 200)!} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-accent">{decade}</p>
                        <p className="text-sm font-medium truncate">{data.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* === ACT VI — WHEN YOU COLLECT === */}
      {/* ============================================================ */}
      {ratings.length >= 5 && allTimestamps.length > 0 && (
        <section>
          <ActLabel num="VI" title="The rhythm" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-2">When you collect.</h2>
          <p className="text-sm text-zinc-500 italic editorial mb-8">
            The shape of your year, your week, your day.
          </p>

          {/* Monthly sparkline */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-8">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">— Last 12 months</p>
              <p className="text-[11px] text-zinc-500">
                <span className="text-accent">{totalThisYear}</span> this year
              </p>
            </div>
            <div className="flex items-end gap-1 h-24">
              {sparklineData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    className={`w-full rounded-t-sm ${d.count > 0 ? "bg-accent/80" : "bg-white/[0.04]"} transition-all`}
                    style={{ height: `${(d.count / sparklineMax) * 100}%`, minHeight: d.count > 0 ? 3 : 2 }}
                    title={`${d.month}: ${d.count}`}
                  />
                  <p className="text-[9px] text-zinc-700 mt-1">{d.month[0]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Day of week */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-4">— By day of week</p>
              <div className="flex items-end gap-2 h-24 mb-3">
                {dayOfWeekCounts.map((c, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className={`w-full rounded-t ${i === peakDayIndex ? "bg-accent" : "bg-white/[0.08]"}`}
                      style={{ height: `${(c / dowMax) * 100}%`, minHeight: c > 0 ? 3 : 0 }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-between">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <p key={i} className={`text-[10px] flex-1 text-center ${i === peakDayIndex ? "text-accent font-semibold" : "text-zinc-700"}`}>
                    {d}
                  </p>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 italic mt-3">
                Peak: <span className="text-accent">{peakDay}</span>
              </p>
            </div>

            {/* Hour of day */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-2">— By hour of day</p>
              <p className="font-display text-4xl tracking-tighter mb-2">
                {peakHourLabel}
              </p>
              <p className="text-[11px] text-zinc-500 italic">
                Peak collecting hour. You&apos;re a <span className="text-accent">{timeOfDayDescriptor}</span>.
              </p>
            </div>
          </div>

          {/* Longest streak */}
          {streak.days > 1 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-2">— The longest streak</p>
              <p className="font-display text-5xl tracking-tighter">
                {streak.days}<span className="text-accent text-2xl ml-2">days</span>
              </p>
              {streak.endDate && (
                <p className="text-[11px] text-zinc-500 italic mt-2">
                  Ended {streak.endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* === ACT VII — OBSESSIONS === */}
      {/* ============================================================ */}
      {obsessions.length > 0 && (
        <section>
          <ActLabel num="VII" title="The receipts" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-2">Your obsessions.</h2>
          <p className="text-sm text-zinc-500 italic editorial mb-8">
            Artists you couldn&apos;t stop with. Three or more in your collection.
          </p>
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

      {/* ============================================================ */}
      {/* === ACT VIII — HOW YOU COLLECT === */}
      {/* ============================================================ */}
      {topMedium && (
        <section>
          <ActLabel num="VIII" title="The format" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-8">How you collect.</h2>
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

      {/* ============================================================ */}
      {/* === ACT IX — THE VOICE === */}
      {/* ============================================================ */}
      <section>
        <ActLabel num="IX" title="The voice" />
        <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-2">Your social signal.</h2>
        {reciprocity !== null && (
          <p className="text-sm text-zinc-500 italic editorial mb-8">
            You give <span className="text-accent">{reciprocity.toFixed(1)}</span> marks for every one you receive — a {reciprocityLabel} reader.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SocialStat label="Marks given" value={counts.marksGiven} subtitle="how generous you are" />
          <SocialStat label="Marks received" value={counts.marksReceived} subtitle="how loved your work is" />
          <SocialStat label="Echoes given" value={counts.echoesGiven} subtitle="what you carry forward" />
          <SocialStat label="Echoes received" value={counts.echoesReceived} subtitle="what travels from you" />
        </div>

        {/* The opening line — most-marked story pull quote */}
        {mostMarkedStory && mostMarkedStory.body && (
          <div className="mt-12 bg-card border border-border rounded-2xl p-8">
            <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-4">— Your most-marked story</p>
            {mostMarkedStory.headline && (
              <p className="font-display text-2xl tracking-tight mb-4">{mostMarkedStory.headline}</p>
            )}
            <blockquote className="border-l-2 border-accent pl-6">
              <p className="font-display italic text-lg sm:text-xl leading-relaxed text-zinc-300">
                &ldquo;{mostMarkedStory.body.slice(0, 240)}{mostMarkedStory.body.length > 240 ? "…" : ""}&rdquo;
              </p>
            </blockquote>
            <p className="text-[11px] text-zinc-600 italic mt-4">
              on <Link href={`/story/${mostMarkedStory.id}`} className="text-accent hover:underline">{mostMarkedStory.target_title}</Link>
            </p>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* === ACT X — HOW YOU CHOOSE === */}
      {/* ============================================================ */}
      {ratings.length > 0 && (
        <section>
          <ActLabel num="X" title="The taste" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-8">How you choose.</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    ? "A balance of loved records and curiosities."
                    : lovedRatio >= 20
                      ? "Mostly exploration, occasional devotion."
                      : "You collect first, fall in love later."}
              </p>
            </div>

            {storyToCollection !== null && (
              <div className="bg-card border border-border rounded-2xl p-8 sm:p-10">
                <p className="font-display text-6xl sm:text-7xl tracking-tighter mb-3">
                  1<span className="text-accent">/{storyToCollection}</span>
                </p>
                <p className="text-zinc-400 text-base">
                  You write about <span className="text-accent">1 in {storyToCollection}</span> albums you collect.
                </p>
                <p className="text-xs text-zinc-600 mt-3 italic editorial">
                  {storyToCollection <= 3
                    ? "A writer who collects."
                    : storyToCollection <= 10
                      ? "A collector who occasionally writes."
                      : "A quiet collector. The writing is rarer than the listening."}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* === ACT XI — THE VOCABULARY === */}
      {/* ============================================================ */}
      {vocabulary.length >= 8 && (
        <section>
          <ActLabel num="XI" title="The words" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-2">How you write about music.</h2>
          <p className="text-sm text-zinc-500 italic editorial mb-8">
            The words you reach for most across your stories. From {stories.length} {stories.length === 1 ? "story" : "stories"}.
          </p>
          <div className="bg-card border border-border rounded-2xl p-8 sm:p-12">
            <div className="flex flex-wrap gap-x-4 gap-y-2 items-baseline justify-center">
              {vocabulary.map((v, i) => {
                const max = vocabulary[0].count;
                const scale = 0.7 + (v.count / max) * 1.6;
                const opacity = 0.4 + (v.count / max) * 0.6;
                return (
                  <span
                    key={v.word}
                    className="font-display italic tracking-tight"
                    style={{
                      fontSize: `${scale}rem`,
                      opacity,
                      color: i < 3 ? "var(--color-accent, #FF1493)" : undefined,
                    }}
                  >
                    {v.word}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* === ACT XII — THE ANCHORS === */}
      {/* ============================================================ */}
      {(mostRecent || earliest || lovedWithStories.length > 0 || yearsOnPlatform.length >= 2) && (
        <section>
          <ActLabel num="XII" title="The anchors" />
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-8">The moments that built you.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

          {/* First album of each year */}
          {yearsOnPlatform.length >= 2 && (
            <div className="border-t border-white/[0.04] pt-8">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-4">— How you started each year</p>
              <div className="space-y-3">
                {yearsOnPlatform.reverse().map((year) => {
                  const r = yearFirstAlbum[year];
                  const cover = art(r.albums.artwork_url, 120);
                  return (
                    <div key={year} className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-b-0">
                      <span className="font-display text-3xl tracking-tighter text-zinc-700 w-16 tabular-nums shrink-0">{year}</span>
                      {cover && (
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-card border border-border shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.albums.title}</p>
                        <p className="text-xs text-zinc-500 truncate italic">{r.albums.artist_name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* === ACT XIII — THE SIGNATURE === */}
      {/* ============================================================ */}
      <section className="border-t border-white/[0.04] pt-16">
        <ActLabel num="XIII" title="The signature" />
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

function ActLabel({ num, title }: { num: string; title: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-6">
      Act {num} · {title}
    </p>
  );
}

function BigStat({ label, value, subtitle }: { label: string; value: number; subtitle?: string }) {
  return (
    <div>
      <p className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter text-white tabular-nums">
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
