import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl, getAppleMusicCharts } from "@/lib/apple-music/client";
import Link from "next/link";
import Stars from "@/components/ui/Stars";
import LikeButton from "@/components/ui/LikeButton";
import HomeSearch from "./HomeSearch";

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

  // === DATA FETCHING ===

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Hero album of the week — top rated in last 7 days with most ratings
  const { data: heroAlbums } = await supabase
    .from("albums")
    .select("apple_id, title, artist_name, artwork_url, average_rating, rating_count, editorial_notes, album_type, genre_names")
    .gt("rating_count", 0)
    .gte("updated_at", weekAgo)
    .order("rating_count", { ascending: false })
    .order("average_rating", { ascending: false })
    .limit(1);
  const heroAlbum = heroAlbums?.[0] || null;

  // 2. New singles (album_type = 'single', last 30 days)
  const { data: newSingles } = await supabase
    .from("albums")
    .select("apple_id, title, artist_name, artwork_url, album_type")
    .eq("album_type", "single")
    .gte("created_at", monthAgo)
    .order("created_at", { ascending: false })
    .limit(10);

  // Latest stories — to give the home feed a writing pulse
  const { data: latestStories } = await supabase
    .from("stories")
    .select("id, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, created_at, profiles(username, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(6);

  // 3. The Charts — top 10 this week (numbered)
  const { data: trendingAlbums } = await supabase
    .from("albums")
    .select("apple_id, title, artist_name, artwork_url, average_rating, rating_count, album_type")
    .gt("rating_count", 0)
    .gte("updated_at", weekAgo)
    .order("rating_count", { ascending: false })
    .order("average_rating", { ascending: false })
    .limit(10);

  // 4. Friends doing intentional things — stories, lists, charts, lyric pins
  // Only pulls if you follow people, otherwise empty
  let friendStories: any[] = [];
  let friendLists: any[] = [];
  let friendCharts: any[] = [];
  let friendLyrics: any[] = [];
  if (followingIds.length > 0) {
    const [s, l, c, ly] = await Promise.all([
      supabase
        .from("stories")
        .select("id, created_at, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, profiles(username, display_name, avatar_url, is_verified, verified_label)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("lists")
        .select("id, created_at, title, subtitle, profiles(username, display_name, avatar_url, is_verified, verified_label), items:list_items(target_artwork_url, position)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("charts")
        .select("id, created_at, period_label, profiles(username, display_name, avatar_url, is_verified, verified_label), items:chart_items(position, target_title, target_artwork_url)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("lyric_pins")
        .select("id, created_at, lyric, song_apple_id, song_title, song_artist, song_artwork_url, profiles(username, display_name, avatar_url, is_verified, verified_label)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    friendStories = s.data || [];
    friendLists = l.data || [];
    friendCharts = c.data || [];
    friendLyrics = ly.data || [];
  }


  // 5. Hidden gems — high rating, low count
  const { data: hiddenGems } = await supabase
    .from("albums")
    .select("apple_id, title, artist_name, artwork_url, average_rating, rating_count, album_type")
    .gt("rating_count", 0)
    .lt("rating_count", 10)
    .gte("average_rating", 4)
    .order("average_rating", { ascending: false })
    .limit(10);

  // 7. Curators worth following
  const { data: activeCurators } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, album_count, is_verified, verified_label")
    .gt("album_count", 0)
    .neq("id", user.id)
    .order("album_count", { ascending: false })
    .limit(8);

  // Notable voices — verified accounts (legends, critics, artists)
  const { data: notableVoices } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, album_count, bio, is_verified, verified_label")
    .eq("is_verified", true)
    .neq("id", user.id)
    .order("updated_at", { ascending: false })
    .limit(6);

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
    | { type: "story"; data: any; date: string }
    | { type: "list"; data: any; date: string }
    | { type: "chart"; data: any; date: string }
    | { type: "lyric"; data: any; date: string };
  const friendFeed: FriendItem[] = [];
  for (const s of friendStories) friendFeed.push({ type: "story", data: s, date: s.created_at });
  for (const l of friendLists) friendFeed.push({ type: "list", data: l, date: l.created_at });
  for (const c of friendCharts) friendFeed.push({ type: "chart", data: c, date: c.created_at });
  for (const ly of friendLyrics) friendFeed.push({ type: "lyric", data: ly, date: ly.created_at });
  friendFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const firstName = (profile?.display_name || profile?.username || "").split(" ")[0];

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

      {/* Greeting */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">{greeting()}</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">
          {firstName ? <>Hello, <span className="italic text-accent">{firstName}.</span></> : <>What are you <span className="italic text-accent">listening to?</span></>}
        </h1>
      </div>

      {/* Search */}
      <HomeSearch />

      {/* === HERO ALBUM OF THE WEEK — magazine cover === */}
      {heroAlbum && (
        <section className="mb-20 -mx-5 sm:-mx-8">
          <Link href={`/album/${heroAlbum.apple_id}`} className="block group relative overflow-hidden">
            {/* Full-bleed blurred background */}
            {heroAlbum.artwork_url && (
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={art(heroAlbum.artwork_url, 1200)!} alt="" className="w-full h-full object-cover opacity-30 blur-3xl scale-150" />
                <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
              </div>
            )}

            <div className="relative px-5 sm:px-8 py-12 sm:py-16">
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-6">— Album of the week</p>

              <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-12">
                <div className="w-56 sm:w-64 aspect-square rounded-xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] shrink-0 border border-white/[0.06] group-hover:scale-[1.02] transition-transform duration-700">
                  {heroAlbum.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(heroAlbum.artwork_url, 700)!} alt={heroAlbum.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl text-zinc-700">♪</div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-2">
                  <h2 className="font-display text-5xl sm:text-7xl tracking-tighter leading-[0.9] mb-4 group-hover:text-accent transition-colors">
                    {heroAlbum.title}
                  </h2>
                  <p className="font-display italic text-2xl sm:text-3xl text-zinc-400 mb-6">{heroAlbum.artist_name}</p>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xs text-zinc-500">In {heroAlbum.rating_count} {heroAlbum.rating_count === 1 ? "collection" : "collections"}</span>
                  </div>
                  {heroAlbum.editorial_notes && (
                    <p className="editorial text-base sm:text-lg text-zinc-300 leading-relaxed line-clamp-4 max-w-xl">
                      {heroAlbum.editorial_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* === THE CHARTS — numbered top 10 === */}
      {((trendingAlbums && trendingAlbums.length > 0) || appleMusicCharts.length > 0) && (
        <section className="mb-20">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-1">Issue №{Math.floor((Date.now() / (1000 * 60 * 60 * 24 * 7))) % 100}</p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight">The Charts.</h2>
            </div>
            <Link href="/discover" className="text-[11px] text-accent hover:underline">See all →</Link>
          </div>
          <ol className="divide-y divide-white/[0.04] border-y border-white/[0.04]">
            {(trendingAlbums && trendingAlbums.length > 0 ? trendingAlbums : appleMusicCharts).slice(0, 10).map((album: any, i: number) => (
              <li key={album.apple_id}>
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

      {/* === LATEST STORIES — the writing pulse === */}
      {latestStories && latestStories.length > 0 && (
        <section className="mb-20">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-1">— The writing room</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Stories from today.</h2>
          </div>
          <div className="space-y-8">
            {latestStories.slice(0, 4).map((story: any) => {
              const author = story.profiles;
              const cover = story.target_artwork_url ? art(story.target_artwork_url, 200) : null;
              const preview = story.body.length > 220 ? story.body.slice(0, 220).trimEnd() + "…" : story.body;
              return (
                <Link key={story.id} href={`/story/${story.id}`} className="block group border-b border-white/[0.04] pb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs text-zinc-500 overflow-hidden shrink-0">
                      {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        author?.username?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      <span className="font-medium text-zinc-300">{author?.display_name || author?.username}</span>
                      <span className="text-zinc-700"> on {story.kind}</span>
                    </p>
                  </div>
                  <div className="flex gap-4">
                    {cover && (
                      <div className={`${story.kind === "artist" ? "rounded-full" : "rounded-md"} w-14 h-14 overflow-hidden border border-white/[0.06] shrink-0`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {story.headline && (
                        <h3 className="font-display text-xl sm:text-2xl tracking-tight leading-tight mb-2 group-hover:text-accent transition-colors">
                          {story.headline}
                        </h3>
                      )}
                      <p className="text-[11px] text-zinc-600 mb-2">
                        {story.target_title}
                        {story.target_artist && story.kind !== "artist" && <span> · {story.target_artist}</span>}
                      </p>
                      <p className="editorial text-sm text-zinc-400 leading-relaxed line-clamp-3">{preview}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* === NEW SINGLES === */}
      {newSingles && newSingles.length > 0 && (
        <Section title="New singles" linkHref="/discover">
          <Scroller>
            {newSingles.map((album: any) => <AlbumCard key={album.apple_id} album={album} />)}
          </Scroller>
        </Section>
      )}

      {/* === NOTABLE VOICES — verified accounts === */}
      {notableVoices && notableVoices.length > 0 && (
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Notable voices</p>
            <Link href="/discover" className="text-[11px] text-zinc-500 hover:text-accent transition-colors">See all →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
            {notableVoices.map((v: any) => (
              <Link key={v.id} href={`/${v.username}`} className="shrink-0 w-44 bg-card border border-border rounded-2xl p-4 hover:border-accent/40 transition-colors text-center group">
                <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center text-lg text-zinc-600 mx-auto mb-3 overflow-hidden">
                  {v.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : v.username[0].toUpperCase()}
                </div>
                <p className="font-medium text-sm truncate inline-flex items-center gap-1 justify-center">
                  {v.display_name || v.username}
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-accent inline" fill="currentColor"><path d="M12 2L14.39 5.42L18.5 4.83L17.91 8.94L21.33 11.33L17.91 13.72L18.5 17.83L14.39 17.24L12 20.66L9.61 17.24L5.5 17.83L6.09 13.72L2.67 11.33L6.09 8.94L5.5 4.83L9.61 5.42L12 2Z"/></svg>
                </p>
                <p className="text-[11px] text-accent truncate">{v.verified_label || "Verified"}</p>
                <p className="text-[10px] text-zinc-600 truncate mt-1">@{v.username}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* === FROM YOUR FRIENDS — intentional content only === */}
      {friendFeed.length > 0 && (
        <section className="mb-20">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">From your friends</p>
          <div className="space-y-6">
            {friendFeed.slice(0, 12).map((entry) => {
              const author = entry.data.profiles;
              const headerLine = (
                <div className="flex items-center gap-2.5 mb-3">
                  <Link href={`/${author?.username}`} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-zinc-600 shrink-0 overflow-hidden">
                    {author?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (author?.username?.[0]?.toUpperCase() || "?")}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/${author?.username}`} className="text-sm font-medium hover:text-accent transition-colors inline-flex items-center gap-1">
                      {author?.display_name || author?.username}
                      {author?.is_verified && (
                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-accent inline" fill="currentColor"><path d="M12 2L14.39 5.42L18.5 4.83L17.91 8.94L21.33 11.33L17.91 13.72L18.5 17.83L14.39 17.24L12 20.66L9.61 17.24L5.5 17.83L6.09 13.72L2.67 11.33L6.09 8.94L5.5 4.83L9.61 5.42L12 2Z"/></svg>
                      )}
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

      {/* === HIDDEN GEMS — magazine grid === */}
      {hiddenGems && hiddenGems.length > 0 && (
        <section className="mb-20">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-1">— Underrated</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Hidden gems.</h2>
            <p className="text-sm text-zinc-500 mt-1">High praise, few listeners. Be the one who found it first.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
            {hiddenGems.slice(0, 6).map((album: any) => (
              <Link key={album.apple_id} href={`/album/${album.apple_id}`} className="group">
                <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-3 group-hover:border-accent/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                  {album.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(album.artwork_url, 400)!} alt={album.title} className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>}
                </div>
                <p className="text-sm font-medium truncate">{album.title}</p>
                <p className="text-xs text-zinc-500 truncate">{album.artist_name}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{album.rating_count} {album.rating_count === 1 ? "collector" : "collectors"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* === CURATORS === */}
      {activeCurators && activeCurators.length > 0 && (
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Curators worth following</p>
            <Link href="/discover" className="text-[11px] text-accent hover:underline">See all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activeCurators.map((c: any) => (
              <Link key={c.id} href={`/${c.username}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-zinc-700 transition-colors text-center">
                <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-lg text-zinc-600 mx-auto mb-2 overflow-hidden">
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : c.username[0].toUpperCase()}
                </div>
                <p className="font-medium text-sm truncate">{c.display_name || c.username}</p>
                <p className="text-[11px] text-zinc-600">{c.album_count} albums</p>
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
