import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl, getAppleMusicCharts } from "@/lib/apple-music/client";
import Link from "next/link";
import Stars from "@/components/ui/Stars";
import LikeButton from "@/components/ui/LikeButton";
import HomeSearch from "./HomeSearch";
import OnThisDay from "@/components/feed/OnThisDay";
import { getOnThisDayMemory } from "@/lib/memories";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

function art(url: string | null, size = 100): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late night";
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Current user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  // Following list
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = follows?.map((f) => f.following_id) || [];

  // On-this-day memory — surfaces one item from the user's own past
  // (a year ago, 6 months ago, etc). Returns null on fresh profiles.
  const memory = await getOnThisDayMemory(supabase, user.id);

  // === DATA FETCHING ===

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // The Pulse window — 7 days, so the strip is always populated in early days.
  // As the platform grows we can shrink this back to 24h or 6h.
  const pulseWindow = weekAgo;

  // ALBUM OF THE DAY — the daily fallback for the hero.
  // Picked deterministically: the album that's been collected most in the past 24h,
  // ties broken by overall popularity. Falls back to the top Apple Music chart album.
  let albumOfTheDay: any = null;
  {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: hotAlbums } = await supabase
      .from("albums")
      .select("apple_id, title, artist_name, artwork_url, editorial_notes, album_type, genre_names, rating_count, average_rating, record_label")
      .gt("rating_count", 0)
      .gte("updated_at", dayAgo)
      .order("rating_count", { ascending: false })
      .limit(1);
    if (hotAlbums && hotAlbums.length > 0) {
      albumOfTheDay = hotAlbums[0];
    } else {
      // Fall back to Apple Music's top chart album
      const charts = await getAppleMusicCharts(1);
      if (charts.length > 0) {
        const a = charts[0];
        albumOfTheDay = {
          apple_id: a.id,
          title: a.attributes.name,
          artist_name: a.attributes.artistName,
          artwork_url: a.attributes.artwork?.url || null,
          editorial_notes: a.attributes.editorialNotes?.standard || a.attributes.editorialNotes?.short || null,
          genre_names: a.attributes.genreNames || [],
          rating_count: 0,
          record_label: a.attributes.recordLabel || null,
        };
        // Strip HTML from editorial notes if present
        if (albumOfTheDay.editorial_notes) {
          albumOfTheDay.editorial_notes = String(albumOfTheDay.editorial_notes).replace(/<[^>]*>/g, "").trim();
        }
      }
    }
  }

  // THE PULSE — most recent intentional acts platform-wide, last 6 hours.
  // The heartbeat. Six bubbles. Refreshes on page load.
  type PulseAct = {
    id: string;
    kind: "story" | "list" | "chart" | "lyric" | "mark" | "echo";
    created_at: string;
    actor: { username: string; display_name: string | null; avatar_url: string | null };
    href: string;
  };
  const pulse: PulseAct[] = [];
  {
    const [pStories, pLists, pCharts, pLyrics, pMarks, pEchoes] = await Promise.all([
      supabase
        .from("stories")
        .select("id, created_at, profiles(username, display_name, avatar_url)")
        .gte("created_at", pulseWindow)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("lists")
        .select("id, created_at, profiles(username, display_name, avatar_url)")
        .gte("created_at", pulseWindow)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("charts")
        .select("id, created_at, profiles(username, display_name, avatar_url)")
        .gte("created_at", pulseWindow)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("lyric_pins")
        .select("id, created_at, song_apple_id, profiles(username, display_name, avatar_url)")
        .gte("created_at", pulseWindow)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("stars")
        .select("id, created_at, kind, target_id, profiles(username, display_name, avatar_url)")
        .gte("created_at", pulseWindow)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("reposts")
        .select("id, created_at, kind, target_id, profiles(username, display_name, avatar_url)")
        .gte("created_at", pulseWindow)
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

    for (const s of (pStories.data || []) as any[]) {
      if (!s.profiles) continue;
      pulse.push({ id: `s-${s.id}`, kind: "story", created_at: s.created_at, actor: s.profiles, href: `/story/${s.id}` });
    }
    for (const l of (pLists.data || []) as any[]) {
      if (!l.profiles) continue;
      pulse.push({ id: `l-${l.id}`, kind: "list", created_at: l.created_at, actor: l.profiles, href: `/list/${l.id}` });
    }
    for (const c of (pCharts.data || []) as any[]) {
      if (!c.profiles) continue;
      pulse.push({ id: `c-${c.id}`, kind: "chart", created_at: c.created_at, actor: c.profiles, href: `/${c.profiles.username}/charts` });
    }
    for (const ly of (pLyrics.data || []) as any[]) {
      if (!ly.profiles) continue;
      pulse.push({ id: `ly-${ly.id}`, kind: "lyric", created_at: ly.created_at, actor: ly.profiles, href: `/song/${ly.song_apple_id}` });
    }
    for (const m of (pMarks.data || []) as any[]) {
      if (!m.profiles) continue;
      const href =
        m.kind === "story" ? `/story/${m.target_id}` :
        m.kind === "list" ? `/list/${m.target_id}` :
        `/${m.profiles.username}`;
      pulse.push({ id: `m-${m.id}`, kind: "mark", created_at: m.created_at, actor: m.profiles, href });
    }
    for (const e of (pEchoes.data || []) as any[]) {
      if (!e.profiles) continue;
      const href =
        e.kind === "story" ? `/story/${e.target_id}` :
        e.kind === "list" ? `/list/${e.target_id}` :
        `/${e.profiles.username}`;
      pulse.push({ id: `e-${e.id}`, kind: "echo", created_at: e.created_at, actor: e.profiles, href });
    }
    pulse.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // STORY OF THE WEEK — the magazine cover.
  // Take the most-marked story from the past 7 days.
  // If there's no marks anywhere, fall back to the most recent story.
  // If there are zero stories ever, render a beautiful empty state CTA.
  let storyOfTheWeek: any = null;
  {
    // Pull recent stories from the past 7 days
    const { data: recentStories } = await supabase
      .from("stories")
      .select("id, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, created_at, profiles(id, username, display_name, avatar_url)")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(40);

    if (recentStories && recentStories.length > 0) {
      // Fetch mark counts for those stories in one query
      const ids = recentStories.map((s: any) => s.id);
      const { data: markRows } = await supabase
        .from("stars")
        .select("target_id")
        .eq("kind", "story")
        .in("target_id", ids);
      const counts = new Map<string, number>();
      for (const row of (markRows || []) as any[]) {
        counts.set(row.target_id, (counts.get(row.target_id) || 0) + 1);
      }
      // Pick the story with the highest mark count, ties broken by recency
      const ranked = recentStories.map((s: any) => ({ story: s, marks: counts.get(s.id) || 0 }));
      ranked.sort((a, b) => b.marks - a.marks || new Date(b.story.created_at).getTime() - new Date(a.story.created_at).getTime());
      storyOfTheWeek = { ...ranked[0].story, _marks: ranked[0].marks };
    } else {
      // No stories in the past week — fall back to the most recent story ever
      const { data: anyStory } = await supabase
        .from("stories")
        .select("id, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, created_at, profiles(id, username, display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (anyStory) storyOfTheWeek = { ...anyStory, _marks: 0 };
    }
  }

  // 3. The Charts — top 10 this week (numbered)
  const { data: trendingAlbums } = await supabase
    .from("albums")
    .select("apple_id, title, artist_name, artwork_url, average_rating, rating_count, album_type")
    .gt("rating_count", 0)
    .gte("updated_at", weekAgo)
    .order("rating_count", { ascending: false })
    .order("average_rating", { ascending: false })
    .limit(10);

  // 4. Friends doing intentional things — stories, lists, charts, lyric pins, reposts
  // Only pulls if you follow people, otherwise empty
  let friendStories: any[] = [];
  let friendLists: any[] = [];
  let friendCharts: any[] = [];
  let friendLyrics: any[] = [];
  let friendReposts: any[] = [];
  if (followingIds.length > 0) {
    const [s, l, c, ly, rp] = await Promise.all([
      supabase
        .from("stories")
        .select("id, created_at, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, profiles(username, display_name, avatar_url)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("lists")
        .select("id, created_at, title, subtitle, profiles(username, display_name, avatar_url), items:list_items(target_artwork_url, position)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("charts")
        .select("id, created_at, period_label, profiles(username, display_name, avatar_url), items:chart_items(position, target_title, target_artwork_url)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("lyric_pins")
        .select("id, created_at, lyric, song_apple_id, song_title, song_artist, song_artwork_url, profiles(username, display_name, avatar_url)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("reposts")
        .select("id, created_at, kind, target_id, comment, profiles(username, display_name, avatar_url)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    friendStories = s.data || [];
    friendLists = l.data || [];
    friendCharts = c.data || [];
    friendLyrics = ly.data || [];
    friendReposts = rp.data || [];
  }

  // Hydrate reposted content (we have target_id but not the content)
  type RepostHydrated = { repost: any; type: "story" | "list" | "chart" | "lyric"; data: any };
  const hydratedReposts: RepostHydrated[] = [];
  if (friendReposts.length > 0) {
    const storyIds = friendReposts.filter((r) => r.kind === "story").map((r) => r.target_id);
    const listIds = friendReposts.filter((r) => r.kind === "list").map((r) => r.target_id);
    const chartIds = friendReposts.filter((r) => r.kind === "chart").map((r) => r.target_id);
    const lyricIds = friendReposts.filter((r) => r.kind === "lyric").map((r) => r.target_id);

    const [hs, hl, hc, hly] = await Promise.all([
      storyIds.length > 0
        ? supabase.from("stories").select("id, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, profiles(username, display_name, avatar_url)").in("id", storyIds)
        : Promise.resolve({ data: [] as any[] }),
      listIds.length > 0
        ? supabase.from("lists").select("id, title, subtitle, profiles(username, display_name, avatar_url), items:list_items(target_artwork_url, position)").in("id", listIds)
        : Promise.resolve({ data: [] as any[] }),
      chartIds.length > 0
        ? supabase.from("charts").select("id, period_label, created_at, profiles(username, display_name, avatar_url), items:chart_items(position, target_title)").in("id", chartIds)
        : Promise.resolve({ data: [] as any[] }),
      lyricIds.length > 0
        ? supabase.from("lyric_pins").select("id, lyric, song_apple_id, song_title, song_artist, song_artwork_url, profiles(username, display_name, avatar_url)").in("id", lyricIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const storyMap = new Map((hs.data || []).map((s: any) => [s.id, s]));
    const listMap = new Map((hl.data || []).map((l: any) => [l.id, l]));
    const chartMap = new Map((hc.data || []).map((c: any) => [c.id, c]));
    const lyricMap = new Map((hly.data || []).map((l: any) => [l.id, l]));

    for (const r of friendReposts) {
      const target =
        r.kind === "story" ? storyMap.get(r.target_id) :
        r.kind === "list" ? listMap.get(r.target_id) :
        r.kind === "chart" ? chartMap.get(r.target_id) :
        lyricMap.get(r.target_id);
      if (target) hydratedReposts.push({ repost: r, type: r.kind, data: target });
    }
  }


  // 7. Curators worth following
  const { data: activeCurators } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, album_count")
    .gt("album_count", 0)
    .neq("id", user.id)
    .order("album_count", { ascending: false })
    .limit(8);

  // 8. Apple Music charts fallback (for cold start)
  let appleMusicCharts: any[] = [];
  if (!trendingAlbums || trendingAlbums.length < 5) {
    const charts = await getAppleMusicCharts(10);
    appleMusicCharts = charts.map((a) => ({
      apple_id: a.id,
      title: a.attributes.name,
      artist_name: a.attributes.artistName,
      artwork_url: a.attributes.artwork?.url || null,
    }));
  }

  // Merge friend feed — intentional content only
  type FriendItem =
    | { type: "story"; data: any; date: string; repost?: any }
    | { type: "list"; data: any; date: string; repost?: any }
    | { type: "chart"; data: any; date: string; repost?: any }
    | { type: "lyric"; data: any; date: string; repost?: any };
  const friendFeed: FriendItem[] = [];
  for (const s of friendStories) friendFeed.push({ type: "story", data: s, date: s.created_at });
  for (const l of friendLists) friendFeed.push({ type: "list", data: l, date: l.created_at });
  for (const c of friendCharts) friendFeed.push({ type: "chart", data: c, date: c.created_at });
  for (const ly of friendLyrics) friendFeed.push({ type: "lyric", data: ly, date: ly.created_at });
  // Reposts surface as the same kind of card but with a "reposted by X" attribution band
  for (const hr of hydratedReposts) {
    friendFeed.push({ type: hr.type, data: hr.data, date: hr.repost.created_at, repost: hr.repost });
  }
  friendFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const firstName = (profile?.display_name || profile?.username || "").split(" ")[0];

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

      {/* Greeting */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">{greeting()}</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">
          {firstName ? <>Hello, <span className="italic text-accent">{firstName}.</span></> : <>What does your taste <span className="italic text-accent">say about you?</span></>}
        </h1>
      </div>

      {/* Search */}
      <HomeSearch />

      {/* === ON THIS DAY — personal memory hero === */}
      {/* Quietly surfaces one item from the user's own past. Skipped on
          fresh accounts (no fake content) and on accounts with no
          history at the lookback windows we check. */}
      {memory && <OnThisDay memory={memory} />}

      {/* === STORY OF THE WEEK — the magazine cover === */}
      {/* === DAILY HERO ===
          Story of the Week if any story has marks; otherwise Album of the Day.
          Same slot, daily cadence, never empty. */}
      {storyOfTheWeek && storyOfTheWeek._marks > 0 ? (
        <section className="mb-20 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <Link href={`/story/${storyOfTheWeek.id}`} className="block group relative overflow-hidden">
            {storyOfTheWeek.target_artwork_url && (
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={art(storyOfTheWeek.target_artwork_url, 1600)!} alt="" className="w-full h-full object-cover opacity-30 blur-3xl scale-150" />
                <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/85 to-background" />
              </div>
            )}

            <div className="relative max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-24 lg:py-32">
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-8">— Story of the week</p>

              {storyOfTheWeek.headline && (
                <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-tighter leading-[0.9] mb-10 group-hover:text-accent transition-colors max-w-4xl">
                  {storyOfTheWeek.headline}
                </h2>
              )}

              <blockquote className="relative pl-8 sm:pl-12 border-l-2 border-accent mb-10 max-w-3xl">
                <p className="font-display italic text-xl sm:text-2xl lg:text-3xl leading-[1.4] tracking-tight text-zinc-200 line-clamp-5">
                  &ldquo;{storyOfTheWeek.body.length > 320 ? storyOfTheWeek.body.slice(0, 320).trimEnd() + "…" : storyOfTheWeek.body}&rdquo;
                </p>
              </blockquote>

              <div className="flex items-center gap-4 max-w-3xl">
                <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-base text-zinc-500 overflow-hidden shrink-0">
                  {storyOfTheWeek.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storyOfTheWeek.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    storyOfTheWeek.profiles?.username?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-zinc-200">
                    {storyOfTheWeek.profiles?.display_name || storyOfTheWeek.profiles?.username}
                  </p>
                  <p className="text-xs text-zinc-600">
                    on <span className="italic text-zinc-400">{storyOfTheWeek.target_title}</span>
                    {storyOfTheWeek.target_artist && storyOfTheWeek.kind !== "artist" && (
                      <span className="text-zinc-700"> · {storyOfTheWeek.target_artist}</span>
                    )}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold whitespace-nowrap">
                  Marked {storyOfTheWeek._marks}
                </span>
              </div>
            </div>
          </Link>
        </section>
      ) : albumOfTheDay ? (
        <section className="mb-20 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <div className="relative overflow-hidden">
            {albumOfTheDay.artwork_url && (
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={art(albumOfTheDay.artwork_url, 1600)!} alt="" className="w-full h-full object-cover opacity-30 blur-3xl scale-150" />
                <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/85 to-background" />
              </div>
            )}

            <div className="relative max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-24 lg:py-32">
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-8">
                — Album of the day · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </p>

              <Link href={`/album/${albumOfTheDay.apple_id}`} className="group block">
                <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-16">
                  <div className="w-64 sm:w-80 lg:w-96 aspect-square rounded-2xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)] shrink-0 border border-white/[0.08] group-hover:scale-[1.02] transition-transform duration-700">
                    {albumOfTheDay.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={art(albumOfTheDay.artwork_url, 900)!} alt={albumOfTheDay.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl text-zinc-700">♪</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 lg:pt-4">
                    <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-tighter leading-[0.88] mb-6 group-hover:text-accent transition-colors">
                      {albumOfTheDay.title}
                    </h2>
                    <p className="font-display italic text-2xl sm:text-3xl lg:text-4xl text-zinc-400 mb-8">{albumOfTheDay.artist_name}</p>

                    {albumOfTheDay.editorial_notes && (
                      <p className="editorial italic text-base sm:text-lg lg:text-xl text-zinc-300 leading-relaxed line-clamp-4 max-w-2xl mb-6">
                        {albumOfTheDay.editorial_notes}
                      </p>
                    )}

                    {albumOfTheDay.rating_count > 0 && (
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                        In <span className="text-accent">{albumOfTheDay.rating_count}</span> {albumOfTheDay.rating_count === 1 ? "collection" : "collections"} today
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* === THE PULSE — recent intentional acts from the whole platform === */}
      {pulse.length > 0 ? (
        <section className="mb-12">
          <div className="flex items-baseline gap-2 mb-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
            </span>
            <p className="text-[10px] uppercase tracking-[0.22em] text-accent font-semibold">The pulse · this week</p>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
            {pulse.slice(0, 12).map((act) => {
              const verb =
                act.kind === "story" ? "wrote a story" :
                act.kind === "list" ? "made a list" :
                act.kind === "chart" ? "published a chart" :
                act.kind === "lyric" ? "pinned a lyric" :
                act.kind === "mark" ? "marked something" :
                "echoed something";
              return (
                <Link key={act.id} href={act.href}
                  className="shrink-0 w-36 lg:w-40 group bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-colors text-center">
                  <div className="w-12 h-12 rounded-full bg-background border border-border mx-auto mb-2 overflow-hidden flex items-center justify-center text-xs text-zinc-600">
                    {act.actor.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={act.actor.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : act.actor.username[0].toUpperCase()}
                  </div>
                  <p className="text-[10px] font-medium truncate">
                    {act.actor.display_name || act.actor.username}
                  </p>
                  <p className="text-[9px] text-zinc-700 truncate italic mt-0.5">{verb}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mb-12">
          <div className="flex items-baseline gap-2 mb-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-700" />
            </span>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-700 font-semibold">The pulse · quiet</p>
          </div>
          <div className="border border-dashed border-border rounded-2xl py-8 px-6 text-center">
            <p className="font-display italic text-xl text-zinc-500 mb-2">The room is quiet.</p>
            <p className="text-[11px] text-zinc-700 max-w-xs mx-auto">
              When people write stories, pin lyrics, or publish charts, you&apos;ll see them here in real time.
            </p>
          </div>
        </section>
      )}

      {/* === FROM YOUR FRIENDS — the heart of the home feed === */}
      {friendFeed.length > 0 && (
        <section className="mb-20">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-1">— The room</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">From your friends.</h2>
          </div>
          <div className="space-y-6">
            {friendFeed.slice(0, 12).map((entry) => {
              const author = entry.data.profiles;
              const reposter = entry.repost?.profiles;
              const repostBand = entry.repost && reposter ? (
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.04]">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  <p className="text-[11px] text-zinc-500">
                    <Link href={`/${reposter.username}`} className="font-medium text-zinc-300 hover:text-accent transition-colors">
                      {reposter.display_name || reposter.username}
                    </Link>
                    <span className="text-zinc-600"> reposted</span>
                  </p>
                  {entry.repost.comment && (
                    <p className="editorial italic text-[11px] text-zinc-400 ml-2 truncate">&ldquo;{entry.repost.comment}&rdquo;</p>
                  )}
                </div>
              ) : null;
              const headerLine = (
                <div className="flex items-center gap-2.5 mb-3">
                  <Link href={`/${author?.username}`} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-zinc-600 shrink-0 overflow-hidden">
                    {author?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (author?.username?.[0]?.toUpperCase() || "?")}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/${author?.username}`} className="text-sm font-medium hover:text-accent transition-colors">
                      {author?.display_name || author?.username}
                    </Link>
                    <span className="text-[10px] text-zinc-700"> · {entry.type === "story" ? "wrote a story" : entry.type === "list" ? "made a list" : entry.type === "chart" ? "published a chart" : "pinned a lyric"}</span>
                  </div>
                </div>
              );

              if (entry.type === "story") {
                const s = entry.data;
                const cover = s.target_artwork_url ? art(s.target_artwork_url, 200) : null;
                const preview = s.body.length > 200 ? s.body.slice(0, 200).trimEnd() + "…" : s.body;
                return (
                  <Link key={`story-${s.id}`} href={`/story/${s.id}`} className="block group bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors">
                    {repostBand}
                    {headerLine}
                    <div className="flex gap-4">
                      {cover && (
                        <div className={`${s.kind === "artist" ? "rounded-full" : "rounded-md"} w-14 h-14 overflow-hidden border border-white/[0.06] shrink-0`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {s.headline && <p className="font-display text-xl tracking-tight leading-tight line-clamp-2 group-hover:text-accent transition-colors mb-1">{s.headline}</p>}
                        <p className="text-[10px] text-zinc-700 mb-2">on <span className="italic">{s.target_title}</span>{s.target_artist && s.kind !== "artist" && ` · ${s.target_artist}`}</p>
                        <p className="editorial text-xs text-zinc-400 leading-relaxed line-clamp-3">{preview}</p>
                      </div>
                    </div>
                  </Link>
                );
              }

              if (entry.type === "list") {
                const l = entry.data;
                const previewItems = ((l.items || []) as any[]).sort((a, b) => a.position - b.position).slice(0, 4);
                return (
                  <Link key={`list-${l.id}`} href={`/list/${l.id}`} className="block group bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors">
                    {repostBand}
                    {headerLine}
                    {previewItems.length > 0 && (
                      <div className="grid grid-cols-4 gap-1 mb-3 max-w-xs">
                        {previewItems.map((it: any, i: number) => {
                          const cv = it.target_artwork_url ? art(it.target_artwork_url, 200) : null;
                          return (
                            <div key={i} className="aspect-square rounded-md overflow-hidden bg-background border border-white/[0.04]">
                              {cv && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cv} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="font-display text-xl tracking-tight leading-tight group-hover:text-accent transition-colors line-clamp-2">{l.title}</p>
                    {l.subtitle && <p className="text-xs text-zinc-500 italic editorial line-clamp-1 mt-1">{l.subtitle}</p>}
                  </Link>
                );
              }

              if (entry.type === "chart") {
                const ch = entry.data;
                const sortedItems = [...((ch.items || []) as any[])].sort((a, b) => a.position - b.position).slice(0, 5);
                return (
                  <Link key={`chart-${ch.id}`} href={`/${author?.username}/charts`} className="block group bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors">
                    {repostBand}
                    {headerLine}
                    <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-1">— Ten right now</p>
                    <p className="font-display text-xl tracking-tight italic mb-3 group-hover:text-accent transition-colors">{ch.period_label || new Date(ch.created_at).toLocaleString("en-US", { month: "long", year: "numeric" })}</p>
                    <div className="space-y-1.5">
                      {sortedItems.map((it: any) => (
                        <div key={it.position} className="flex items-center gap-2 text-xs">
                          <span className="font-display tracking-tight text-zinc-700 w-5 text-right tabular-nums">{String(it.position).padStart(2, "0")}</span>
                          <span className="text-zinc-300 truncate">{it.target_title}</span>
                        </div>
                      ))}
                      {((ch.items || []) as any[]).length > 5 && (
                        <p className="text-[10px] text-zinc-700 mt-2 pl-7">...and {((ch.items || []) as any[]).length - 5} more</p>
                      )}
                    </div>
                  </Link>
                );
              }

              if (entry.type === "lyric") {
                const ly = entry.data;
                return (
                  <Link key={`lyric-${ly.id}`} href={`/song/${ly.song_apple_id}`} className="block group bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors">
                    {repostBand}
                    {headerLine}
                    <p className="font-display italic text-xl sm:text-2xl tracking-tight leading-[1.25] text-zinc-100 mb-4 line-clamp-3 group-hover:text-white transition-colors">
                      &ldquo;{ly.lyric}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                      {ly.song_artwork_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ly.song_artwork_url.replace("{w}", "120").replace("{h}", "120")} alt="" className="w-6 h-6 rounded object-cover" />
                      )}
                      <span className="truncate"><span className="text-zinc-400">{ly.song_title}</span> · {ly.song_artist}</span>
                    </div>
                  </Link>
                );
              }

              return null;
            })}
          </div>
        </section>
      )}

      {/* Empty state if no follows */}
      {friendFeed.length === 0 && followingIds.length === 0 && (
        <section className="mb-20">
          <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
            <p className="font-display text-3xl mb-2">Your friend feed is empty.</p>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-5">
              Follow people whose taste you trust. Their stories, lists, charts, and lyrics will live here.
            </p>
            <Link href="/discover" className="inline-block px-6 py-2.5 bg-accent text-white rounded-full text-xs font-medium hover:bg-accent-hover transition-colors">
              Find people to follow →
            </Link>
          </div>
        </section>
      )}

      {/* === THE CHARTS — single editorial flourish === */}
      {((trendingAlbums && trendingAlbums.length > 0) || appleMusicCharts.length > 0) && (
        <section className="mb-20">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-1">Issue №{Math.floor((Date.now() / (1000 * 60 * 60 * 24 * 7))) % 100}</p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight">The Charts.</h2>
            </div>
            <Link href="/discover" className="text-[11px] text-accent hover:underline">See all →</Link>
          </div>
          <ol className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10 border-y border-white/[0.04]">
            {(trendingAlbums && trendingAlbums.length > 0 ? trendingAlbums : appleMusicCharts).slice(0, 10).map((album: any, i: number) => (
              <li key={album.apple_id} className="border-b border-white/[0.04] lg:[&:nth-last-child(2)]:border-b-0 last:border-b-0">
                <Link href={`/album/${album.apple_id}`} className="flex items-center gap-4 py-4 group hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors">
                  <span className="font-display text-3xl sm:text-4xl tracking-tighter text-zinc-700 group-hover:text-accent transition-colors w-10 sm:w-12 tabular-nums shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-card border border-border shrink-0">
                    {album.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={art(album.artwork_url, 120)!} alt="" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium truncate group-hover:text-accent transition-colors">{album.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{album.artist_name}</p>
                  </div>
                  {album.rating_count > 0 && (
                    <span className="hidden sm:inline text-[11px] text-zinc-600 shrink-0 tabular-nums">
                      {album.rating_count} {album.rating_count === 1 ? "collector" : "collectors"}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* === CURATORS === */}
      {activeCurators && activeCurators.length > 0 && (
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Curators worth following</p>
            <Link href="/people" className="text-[11px] text-accent hover:underline">See all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {activeCurators.map((c: any) => (
              <Link key={c.id} href={`/${c.username}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-colors text-center">
                <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-lg text-zinc-600 mx-auto mb-2 overflow-hidden">
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : c.username[0].toUpperCase()}
                </div>
                <p className="font-medium text-sm truncate">
                  {c.display_name || c.username}
                </p>
                <p className="text-[11px] text-accent truncate italic">@{c.username}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

// ===== Reusable section components =====

function Section({ title, linkHref, children }: { title: string; linkHref?: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="flex items-baseline justify-between mb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
        {linkHref && <Link href={linkHref} className="text-[11px] text-accent hover:underline">See all →</Link>}
      </div>
      {children}
    </section>
  );
}

function Scroller({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
      {children}
    </div>
  );
}

function AlbumCard({ album }: { album: any }) {
  return (
    <Link href={`/album/${album.apple_id}`} className="shrink-0 w-32 sm:w-36 group">
      <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-zinc-700 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10 relative">
        {album.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art(album.artwork_url, 300)!} alt={album.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
        )}
        {album.album_type === "ep" && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">EP</div>
        )}
        {album.album_type === "single" && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">SINGLE</div>
        )}
      </div>
      <p className="text-xs font-medium truncate">{album.title}</p>
      <p className="text-[11px] text-zinc-600 truncate">{album.artist_name}</p>
    </Link>
  );
}
