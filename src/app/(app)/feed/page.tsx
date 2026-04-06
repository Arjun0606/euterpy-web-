import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Link from "next/link";
import Stars from "@/components/ui/Stars";
import LikeButton from "@/components/ui/LikeButton";
import HomeSearch from "./HomeSearch";

export const metadata = { title: "Home" };

function art(url: string | null, size = 100): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get feed: ratings from followed users
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
    .limit(50);

  // Get latest reviews from people the user follows
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = follows?.map((f) => f.following_id) || [];

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

  // Get latest reviews from everyone (for the "latest" section)
  const { data: latestReviews } = await supabase
    .from("reviews")
    .select("*, profiles(username, display_name, avatar_url), albums(apple_id, title, artist_name, artwork_url), songs(apple_id, title, artist_name, artwork_url)")
    .order("created_at", { ascending: false })
    .limit(5);

  // Merge feed: interleave ratings and reviews by date
  const allFeedEntries: { type: "rating" | "review"; data: any; date: string }[] = [];

  for (const item of (feedItems || []) as any[]) {
    if (!item.actor || !item.rating || !item.rating.album) continue;
    allFeedEntries.push({ type: "rating", data: item, date: item.created_at });
  }

  for (const review of followedReviews) {
    allFeedEntries.push({ type: "review", data: review, date: review.created_at });
  }

  allFeedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
      {/* Search bar */}
      <HomeSearch />

      {/* Latest Reviews */}
      {latestReviews && latestReviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-muted mb-4">Latest Reviews</h2>
          <div className="space-y-3">
            {latestReviews.slice(0, 3).map((review: any) => {
              const item = review.albums || review.songs;
              const isAlbum = !!review.albums;
              const author = review.profiles;
              return (
                <Link
                  key={review.id}
                  href={isAlbum ? `/album/${item?.apple_id}` : `/song/${item?.apple_id}`}
                  className="block bg-card border border-border rounded-xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-muted shrink-0">
                      {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        author?.username?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{author?.display_name || author?.username}</span>
                      <span className="text-muted text-xs"> reviewed </span>
                      <span className="text-sm font-medium">{item?.title}</span>
                    </div>
                    <Stars score={review.score} />
                  </div>
                  {review.title && <p className="text-sm font-medium mb-1">{review.title}</p>}
                  <p className="text-sm text-muted line-clamp-2">{review.body}</p>
                  {review.is_loved && (
                    <p className="text-xs text-accent mt-2">❤️ Users love this</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Combined Feed */}
      <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
        {allFeedEntries.length > 0 ? "Your Feed" : ""}
      </h2>

      {allFeedEntries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">🎵</p>
          <p className="text-muted mb-2">Your feed is empty.</p>
          <p className="text-sm text-muted/60">
            <Link href="/search" className="text-accent hover:underline">Search for music</Link>
            {" "}to rate, or{" "}
            <Link href="/discover" className="text-accent hover:underline">discover people</Link>
            {" "}to follow.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allFeedEntries.map((entry) => {
            if (entry.type === "rating") {
              const item = entry.data;
              const actor = item.actor;
              const rating = item.rating;
              const album = rating?.album;

              return (
                <div key={`r-${item.id}`} className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border hover:border-zinc-700 transition-colors">
                  <Link href={`/${actor.username}`} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-sm text-muted shrink-0 overflow-hidden">
                    {actor.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      actor.username[0].toUpperCase()
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <Link href={`/${actor.username}`} className="font-medium hover:text-accent transition-colors">
                        {actor.display_name || actor.username}
                      </Link>
                      <span className="text-muted"> rated </span>
                      <Link href={`/album/${album.apple_id}`} className="font-medium hover:text-accent transition-colors">
                        {album.title}
                      </Link>
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
                      <p className="text-sm text-muted/80 mt-2 italic">&ldquo;{rating.reaction}&rdquo;</p>
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

            // Review feed entry
            const review = entry.data;
            const reviewItem = review.albums || review.songs;
            const isAlbum = !!review.albums;
            const author = review.profiles;

            return (
              <div key={`rv-${review.id}`} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/${author?.username}`} className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-muted shrink-0 overflow-hidden">
                    {author?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      author?.username?.[0]?.toUpperCase() || "?"
                    )}
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

                {review.title && <p className="text-sm font-semibold mb-1">{review.title}</p>}
                <p className="text-sm text-muted line-clamp-3">{review.body}</p>
                {review.is_loved && <p className="text-xs text-accent mt-2">❤️ Users love this</p>}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
