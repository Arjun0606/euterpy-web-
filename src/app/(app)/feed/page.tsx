import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl, getAppleMusicCharts } from "@/lib/apple-music/client";
import Link from "next/link";
import Stars from "@/components/ui/Stars";
import LikeButton from "@/components/ui/LikeButton";
import HomeSearch from "./HomeSearch";

export const metadata = { title: "Home" };

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

  // Following list for the feed
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = follows?.map((f) => f.following_id) || [];

  // Followed activity
  const { data: feedItems } = await supabase
    .from("feed_items")
    .select(`
      id, created_at,
      actor:profiles!feed_items_actor_id_fkey(username, display_name, avatar_url),
      rating:ratings!feed_items_rating_id_fkey(
        id, score, reaction, created_at, ownership, like_count,
        album:albums(id, apple_id, title, artist_name, artwork_url)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Followed reviews
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

  // Trending this week — top rated albums in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trendingAlbums } = await supabase
    .from("albums")
    .select("apple_id, title, artist_name, artwork_url, average_rating, rating_count")
    .gt("rating_count", 0)
    .gte("updated_at", weekAgo)
    .order("rating_count", { ascending: false })
    .limit(10);

  // Top rated of all time (fallback if no trending)
  const { data: topAlbums } = await supabase
    .from("albums")
    .select("apple_id, title, artist_name, artwork_url, average_rating, rating_count")
    .gt("rating_count", 0)
    .order("average_rating", { ascending: false })
    .limit(10);

  const showcaseAlbums = (trendingAlbums && trendingAlbums.length > 0) ? trendingAlbums : topAlbums;

  // Apple Music charts — REAL data from Apple's catalog API
  // Used when our DB has fewer than 5 rated albums (cold start)
  let appleMusicCharts: any[] = [];
  if (!showcaseAlbums || showcaseAlbums.length < 5) {
    const charts = await getAppleMusicCharts(10);
    appleMusicCharts = charts.map((a) => ({
      apple_id: a.id,
      title: a.attributes.name,
      artist_name: a.attributes.artistName,
      artwork_url: a.attributes.artwork?.url || null,
      average_rating: null,
      rating_count: 0,
    }));
  }

  // Latest reviews from everyone
  const { data: latestReviews } = await supabase
    .from("reviews")
    .select("*, profiles(username, display_name, avatar_url), albums(apple_id, title, artist_name, artwork_url), songs(apple_id, title, artist_name, artwork_url)")
    .order("created_at", { ascending: false })
    .limit(4);

  // Active curators
  const { data: activeCurators } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, album_count")
    .gt("album_count", 0)
    .neq("id", user.id)
    .order("album_count", { ascending: false })
    .limit(6);

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

      {/* ===== Greeting ===== */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">{greeting()}</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">
          {firstName ? <>Hello, <span className="italic text-accent">{firstName}.</span></> : <>What are you <span className="italic text-accent">listening to?</span></>}
        </h1>
      </div>

      {/* Search bar */}
      <HomeSearch />

      {/* ===== Apple Music Charts (cold start fallback) ===== */}
      {appleMusicCharts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Trending Now</p>
            
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
            {appleMusicCharts.map((album: any) => (
              <Link key={album.apple_id} href={`/album/${album.apple_id}`} className="shrink-0 w-32 group">
                <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-zinc-700 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                  {album.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(album.artwork_url, 300)!} alt={album.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{album.title}</p>
                <p className="text-[11px] text-zinc-500 truncate">{album.artist_name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Trending This Week (community) ===== */}
      {showcaseAlbums && showcaseAlbums.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              {trendingAlbums && trendingAlbums.length > 0 ? "Trending this week" : "Top rated"}
            </p>
            <Link href="/discover" className="text-[11px] text-accent hover:underline">See all →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
            {showcaseAlbums.map((album: any) => (
              <Link key={album.apple_id} href={`/album/${album.apple_id}`} className="shrink-0 w-32 group">
                <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-zinc-700 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                  {album.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(album.artwork_url, 300)!} alt={album.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{album.title}</p>
                <p className="text-[11px] text-zinc-500 truncate">{album.artist_name}</p>
                {album.average_rating && (
                  <p className="text-[11px] text-accent mt-0.5">★ {Number(album.average_rating).toFixed(1)}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Your Feed (only if has activity) ===== */}
      {allFeedEntries.length > 0 && (
        <section className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">From people you follow</p>
          <div className="space-y-3">
            {allFeedEntries.map((entry) => {
              if (entry.type === "rating") {
                const item = entry.data;
                const actor = item.actor;
                const rating = item.rating;
                const album = rating?.album;

                return (
                  <div key={`r-${item.id}`} className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-zinc-700 transition-colors">
                    <Link href={`/${actor.username}`} className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-muted shrink-0 overflow-hidden">
                      {actor.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        actor.username[0].toUpperCase()
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <Link href={`/${actor.username}`} className="font-medium hover:text-accent transition-colors">{actor.display_name || actor.username}</Link>
                        <span className="text-muted"> rated </span>
                        <Link href={`/album/${album.apple_id}`} className="font-medium hover:text-accent transition-colors">{album.title}</Link>
                      </p>
                      <p className="text-xs text-muted mt-0.5">{album.artist_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Stars score={rating.score} />
                        {rating.ownership && rating.ownership !== "digital" && (
                          <span className="text-xs text-muted/40">
                            {rating.ownership === "vinyl" ? "🎵" : rating.ownership === "cd" ? "💿" : "📼"} {rating.ownership}
                          </span>
                        )}
                      </div>
                      {rating.reaction && (
                        <p className="editorial text-sm text-zinc-300 mt-2">&ldquo;{rating.reaction}&rdquo;</p>
                      )}
                      <div className="mt-2">
                        <LikeButton ratingId={rating.id} initialCount={rating.like_count || 0} />
                      </div>
                    </div>
                    <Link href={`/album/${album.apple_id}`} className="w-14 h-14 rounded-lg bg-card border border-border overflow-hidden shrink-0">
                      {album.artwork_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art(album.artwork_url, 112)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-border">♪</div>
                      )}
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
                    <Link href={`/${author?.username}`} className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-muted shrink-0 overflow-hidden">
                      {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : author?.username?.[0]?.toUpperCase() || "?"}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/${author?.username}`} className="text-sm font-medium hover:text-accent transition-colors">
                        {author?.display_name || author?.username}
                      </Link>
                      <span className="text-muted text-xs"> reviewed</span>
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
                      <p className="text-xs text-muted">{reviewItem?.artist_name}</p>
                    </div>
                  </Link>
                  {review.title && <p className="font-display text-lg mb-2">{review.title}</p>}
                  <p className="editorial text-sm text-zinc-300 line-clamp-3">{review.body}</p>
                  {review.is_loved && <p className="text-xs text-accent mt-3">❤ Users love this</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Latest Reviews ===== */}
      {latestReviews && latestReviews.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Latest reviews</p>
            <Link href="/discover" className="text-[11px] text-accent hover:underline">See all →</Link>
          </div>
          <div className="space-y-3">
            {latestReviews.map((review: any) => {
              const item = review.albums || review.songs;
              const isAlbum = !!review.albums;
              const author = review.profiles;
              return (
                <Link
                  key={review.id}
                  href={isAlbum ? `/album/${item?.apple_id}` : `/song/${item?.apple_id}`}
                  className="block bg-card border border-border rounded-xl p-5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-muted shrink-0 overflow-hidden">
                      {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : author?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{author?.display_name || author?.username}</span>
                      <span className="text-muted text-xs"> on </span>
                      <span className="text-sm font-medium">{item?.title}</span>
                    </div>
                    <Stars score={review.score} />
                  </div>
                  {review.title && <p className="font-display text-lg mb-2">{review.title}</p>}
                  <p className="editorial text-sm text-zinc-300 line-clamp-2">{review.body}</p>
                  {review.is_loved && <p className="text-xs text-accent mt-3">❤ Users love this</p>}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Curators to Follow ===== */}
      {activeCurators && activeCurators.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Curators worth following</p>
            <Link href="/discover" className="text-[11px] text-accent hover:underline">See all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeCurators.map((c: any) => (
              <Link key={c.id} href={`/${c.username}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-zinc-700 transition-colors text-center">
                <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-lg text-muted mx-auto mb-2 overflow-hidden">
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : c.username[0].toUpperCase()}
                </div>
                <p className="font-medium text-sm truncate">{c.display_name || c.username}</p>
                <p className="text-[11px] text-zinc-500">{c.album_count} albums</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
