import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Link from "next/link";
import Stars from "@/components/ui/Stars";

export const metadata = { title: "Home" };

function art(url: string | null, size = 100): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Get feed: reviews + ratings from followed users
  const { data: feedItems } = await supabase
    .from("feed_items")
    .select(`
      id, created_at,
      actor:profiles!feed_items_actor_id_fkey(username, display_name, avatar_url),
      rating:ratings!feed_items_rating_id_fkey(
        id, score, reaction, created_at, ownership,
        album:albums(id, apple_id, title, artist_name, artwork_url)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get latest reviews from everyone (for discovery)
  const { data: latestReviews } = await supabase
    .from("reviews")
    .select("*, profiles(username, display_name, avatar_url), albums(apple_id, title, artist_name, artwork_url), songs(apple_id, title, artist_name, artwork_url)")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/feed" className="font-display text-2xl shrink-0">Euterpy</Link>

          {/* Search bar */}
          <Link
            href="/search"
            className="flex-1 flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm text-muted/40 hover:border-accent/30 transition-colors"
          >
            <span>🔍</span> Search albums, songs, people...
          </Link>

          {/* Profile circle */}
          <Link
            href={`/${profile?.username || ""}`}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-sm text-muted shrink-0 hover:border-accent transition-colors"
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="font-medium">{profile?.username?.[0]?.toUpperCase() || "?"}</span>
            )}
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Latest Reviews (if any) */}
        {latestReviews && latestReviews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-muted mb-4">Latest Reviews</h2>
            <div className="space-y-3">
              {latestReviews.map((review: any) => {
                const item = review.albums || review.songs;
                const author = review.profiles;
                return (
                  <div key={review.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/${author?.username}`} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-muted shrink-0 hover:border-accent transition-colors">
                        {author?.username?.[0]?.toUpperCase() || "?"}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/${author?.username}`} className="text-sm font-medium hover:text-accent transition-colors">
                          {author?.display_name || author?.username}
                        </Link>
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
          {feedItems && feedItems.length > 0 ? "Your Feed" : ""}
        </h2>

        {!feedItems || feedItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl mb-2">🎵</p>
            <p className="text-muted mb-2">Your feed is empty.</p>
            <p className="text-sm text-muted/60">
              <Link href="/search" className="text-accent hover:underline">Search for music</Link>
              {" "}to rate, or follow people to see their activity.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {feedItems.map((item: any) => {
              const actor = item.actor;
              const rating = item.rating;
              const album = rating?.album;
              if (!actor || !rating || !album) return null;

              return (
                <div key={item.id} className="flex items-start gap-3 p-4 rounded-xl hover:bg-card-hover transition-colors">
                  <Link href={`/${actor.username}`} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-sm text-muted shrink-0">
                    {actor.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={actor.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
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
            })}
          </div>
        )}
      </main>
    </div>
  );
}
