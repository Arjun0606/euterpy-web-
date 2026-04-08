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

  // 3. The Charts — top 10 this week (numbered)
  const { data: trendingAlbums } = await supabase
    .from("albums")
    .select("apple_id, title, artist_name, artwork_url, average_rating, rating_count, album_type")
    .gt("rating_count", 0)
    .gte("updated_at", weekAgo)
    .order("rating_count", { ascending: false })
    .order("average_rating", { ascending: false })
    .limit(10);

  // Featured review — most-loved review this month with substantial body
  const { data: featuredReviews } = await supabase
    .from("reviews")
    .select("id, title, body, score, created_at, profiles(username, display_name, avatar_url), albums(apple_id, title, artist_name, artwork_url)")
    .gte("created_at", monthAgo)
    .not("body", "is", null)
    .order("upvotes", { ascending: false })
    .limit(5);
  const featuredReview = (featuredReviews || []).find((r: any) => r.body && r.body.length > 80 && r.albums) || null;

  // 4. Activity from people you follow (ratings + reviews)
  const { data: feedItems } = await supabase
    .from("feed_items")
    .select(`
      id, created_at,
      actor:profiles!feed_items_actor_id_fkey(username, display_name, avatar_url),
      rating:ratings!feed_items_rating_id_fkey(
        id, score, reaction, created_at, ownership, like_count,
        album:albums(id, apple_id, title, artist_name, artwork_url, album_type)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  let followedReviews: any[] = [];
  if (followingIds.length > 0) {
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles(username, display_name, avatar_url), albums(apple_id, title, artist_name, artwork_url), songs(apple_id, title, artist_name, artwork_url)")
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(10);
    followedReviews = data || [];
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

  // Merge personal feed
  const allFeedEntries: { type: "rating" | "review"; data: any; date: string }[] = [];
  for (const item of (feedItems || []) as any[]) {
    if (!item.actor || !item.rating || !item.rating.album) continue;
    allFeedEntries.push({ type: "rating", data: item, date: item.created_at });
  }
  for (const review of followedReviews) {
    allFeedEntries.push({ type: "review", data: review, date: review.created_at });
  }
  allFeedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                    <Stars score={Number(heroAlbum.average_rating)} />
                    <span className="text-xs text-zinc-500">{Number(heroAlbum.average_rating).toFixed(1)} · {heroAlbum.rating_count} {heroAlbum.rating_count === 1 ? "rating" : "ratings"}</span>
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
                  {album.average_rating && (
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <Stars score={Number(album.average_rating)} size="sm" />
                      <span className="text-[11px] text-zinc-600 tabular-nums">{Number(album.average_rating).toFixed(1)}</span>
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* === FEATURED REVIEW — magazine pull-quote === */}
      {featuredReview && featuredReview.albums && (
        <section className="mb-20">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">— Critic's voice</p>
          <Link href={`/album/${(featuredReview.albums as any).apple_id}`} className="block group">
            <blockquote className="relative pl-8 sm:pl-12 border-l-2 border-accent">
              <p className="font-display italic text-2xl sm:text-4xl leading-[1.2] tracking-tight text-zinc-100 line-clamp-5 group-hover:text-white transition-colors">
                &ldquo;{featuredReview.body}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-6">
                <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-xs text-zinc-500 overflow-hidden shrink-0">
                  {(featuredReview.profiles as any)?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(featuredReview.profiles as any).avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : ((featuredReview.profiles as any)?.username?.[0]?.toUpperCase() || "?")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-300">
                    {(featuredReview.profiles as any)?.display_name || (featuredReview.profiles as any)?.username}
                  </p>
                  <p className="text-[11px] text-zinc-600 truncate">
                    on <span className="italic">{(featuredReview.albums as any).title}</span> by {(featuredReview.albums as any).artist_name}
                  </p>
                </div>
                <Stars score={featuredReview.score} size="sm" />
              </div>
            </blockquote>
          </Link>
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

      {/* === FROM PEOPLE YOU FOLLOW === */}
      {allFeedEntries.length > 0 && (
        <section className="mb-14">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">From people you follow</p>
          <div className="space-y-3">
            {allFeedEntries.slice(0, 10).map((entry) => {
              if (entry.type === "rating") {
                const item = entry.data;
                const actor = item.actor;
                const rating = item.rating;
                const album = rating?.album;
                return (
                  <div key={`r-${item.id}`} className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-zinc-700 transition-colors">
                    <Link href={`/${actor.username}`} className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-zinc-600 shrink-0 overflow-hidden">
                      {actor.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : actor.username[0].toUpperCase()}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <Link href={`/${actor.username}`} className="font-medium hover:text-accent transition-colors">{actor.display_name || actor.username}</Link>
                        <span className="text-zinc-600"> rated </span>
                        <Link href={`/album/${album.apple_id}`} className="font-medium hover:text-accent transition-colors">{album.title}</Link>
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">{album.artist_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Stars score={rating.score} />
                      </div>
                      {rating.reaction && <p className="editorial text-sm text-zinc-300 mt-2">&ldquo;{rating.reaction}&rdquo;</p>}
                      <div className="mt-2"><LikeButton ratingId={rating.id} initialCount={rating.like_count || 0} /></div>
                    </div>
                    <Link href={`/album/${album.apple_id}`} className="w-14 h-14 rounded-lg bg-card border border-border overflow-hidden shrink-0">
                      {album.artwork_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art(album.artwork_url, 112)!} alt="" className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center text-xs text-border">♪</div>}
                    </Link>
                  </div>
                );
              }

              const review = entry.data;
              const reviewItem = review.albums || review.songs;
              const isAlbum = !!review.albums;
              const author = review.profiles;
              return (
                <div key={`rv-${review.id}`} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/${author?.username}`} className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-zinc-600 shrink-0 overflow-hidden">
                      {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : author?.username?.[0]?.toUpperCase() || "?"}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/${author?.username}`} className="text-sm font-medium hover:text-accent transition-colors">{author?.display_name || author?.username}</Link>
                      <span className="text-zinc-600 text-xs"> reviewed</span>
                    </div>
                    <Stars score={review.score} />
                  </div>
                  <Link href={isAlbum ? `/album/${reviewItem?.apple_id}` : `/song/${reviewItem?.apple_id}`} className="flex items-center gap-3 mb-3 hover:opacity-80">
                    {reviewItem?.artwork_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={art(reviewItem.artwork_url, 80)!} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{reviewItem?.title}</p>
                      <p className="text-xs text-zinc-600">{reviewItem?.artist_name}</p>
                    </div>
                  </Link>
                  {review.title && <p className="font-display text-lg mb-2">{review.title}</p>}
                  <p className="editorial text-sm text-zinc-300 line-clamp-3">{review.body}</p>
                </div>
              );
            })}
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
                <div className="flex items-center gap-1.5 mt-1">
                  <Stars score={Number(album.average_rating)} size="sm" />
                  <span className="text-[10px] text-zinc-600">({album.rating_count})</span>
                </div>
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

function AlbumCard({ album, showRating = false }: { album: any; showRating?: boolean }) {
  return (
    <Link href={`/album/${album.apple_id}`} className="shrink-0 w-32 sm:w-36 group">
      <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-zinc-700 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10 relative">
        {album.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art(album.artwork_url, 300)!} alt={album.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
        )}
        {/* Type badge */}
        {album.album_type === "ep" && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">EP</div>
        )}
        {album.album_type === "single" && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">SINGLE</div>
        )}
      </div>
      <p className="text-xs font-medium truncate">{album.title}</p>
      <p className="text-[11px] text-zinc-600 truncate">{album.artist_name}</p>
      {showRating && album.average_rating && (
        <p className="text-[11px] text-accent mt-0.5">★ {Number(album.average_rating).toFixed(1)}</p>
      )}
    </Link>
  );
}
