import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Link from "next/link";
import Stars from "@/components/ui/Stars";

export const metadata = { title: "Discover" };

function art(url: string | null, size = 300): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Top rated albums (by community)
  const { data: topAlbums } = await supabase
    .from("albums")
    .select("*")
    .gt("rating_count", 0)
    .order("average_rating", { ascending: false })
    .limit(12);

  // Recently active users (who have rated recently)
  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("*")
    .gt("album_count", 0)
    .order("updated_at", { ascending: false })
    .limit(12);

  // Latest reviews
  const { data: latestReviews } = await supabase
    .from("reviews")
    .select("*, profiles(username, display_name, avatar_url), albums(apple_id, title, artist_name, artwork_url)")
    .order("created_at", { ascending: false })
    .limit(6);

  // People you might know (users with most mutual album ratings)
  let suggestedUsers: any[] = [];
  if (user) {
    const { data: myRatings } = await supabase
      .from("ratings")
      .select("album_id")
      .eq("user_id", user.id);

    if (myRatings && myRatings.length > 0) {
      const albumIds = myRatings.map((r) => r.album_id);
      const { data: similar } = await supabase
        .from("ratings")
        .select("user_id, profiles(id, username, display_name, avatar_url, album_count, bio)")
        .in("album_id", albumIds.slice(0, 50))
        .neq("user_id", user.id)
        .limit(50);

      if (similar) {
        // Count how many albums overlap per user
        const userOverlap: Record<string, { count: number; profile: any }> = {};
        for (const r of similar) {
          const uid = r.user_id;
          if (!userOverlap[uid]) {
            userOverlap[uid] = { count: 0, profile: r.profiles };
          }
          userOverlap[uid].count++;
        }
        suggestedUsers = Object.values(userOverlap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map((u) => ({ ...u.profile, overlap: u.count }));
      }
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-display text-3xl mb-8">Discover</h1>

      {/* People You Might Like */}
      {suggestedUsers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
            People With Similar Taste
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {suggestedUsers.map((user: any) => (
              <Link
                key={user.id}
                href={`/${user.username}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-zinc-700 transition-all duration-200 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-xl text-muted mx-auto mb-2">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.username[0].toUpperCase()
                  )}
                </div>
                <p className="font-medium text-sm truncate">{user.display_name || user.username}</p>
                <p className="text-xs text-accent">@{user.username}</p>
                <p className="text-xs text-muted mt-1">{user.overlap} albums in common</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Active Users */}
      {activeUsers && activeUsers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
            Active Curators
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible">
            {activeUsers.map((u: any) => (
              <Link
                key={u.id}
                href={`/${u.username}`}
                className="shrink-0 w-[140px] sm:w-auto bg-card border border-border rounded-xl p-4 hover:border-zinc-700 transition-all duration-200 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-lg text-muted mx-auto mb-2">
                  {u.username[0].toUpperCase()}
                </div>
                <p className="font-medium text-sm truncate">{u.display_name || u.username}</p>
                <p className="text-xs text-muted">{u.album_count} albums</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top Rated Albums */}
      {topAlbums && topAlbums.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
            Top Rated Albums
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {topAlbums.map((album: any) => (
              <Link
                key={album.id}
                href={`/album/${album.apple_id}`}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-card border border-border mb-2 transition-all group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-accent/10">
                  {album.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={art(album.artwork_url)!}
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-border">♪</div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{album.title}</p>
                <p className="text-xs text-muted truncate">{album.artist_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Stars score={Number(album.average_rating)} size="sm" />
                  <span className="text-xs text-muted/40">({album.rating_count})</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest Reviews */}
      {latestReviews && latestReviews.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
            Latest Reviews
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {latestReviews.map((review: any) => {
              const album = review.albums;
              const author = review.profiles;
              return (
                <div key={review.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/${author?.username}`} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-muted shrink-0 hover:border-accent">
                      {author?.username?.[0]?.toUpperCase() || "?"}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/${author?.username}`} className="text-sm font-medium hover:text-accent">
                        {author?.display_name || author?.username}
                      </Link>
                    </div>
                    <Stars score={review.score} />
                  </div>
                  {album && (
                    <Link href={`/album/${album.apple_id}`} className="flex items-center gap-3 mb-3 hover:opacity-80">
                      {album.artwork_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art(album.artwork_url, 80)!} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{album.title}</p>
                        <p className="text-xs text-muted">{album.artist_name}</p>
                      </div>
                    </Link>
                  )}
                  {review.title && <p className="text-sm font-semibold mb-1">{review.title}</p>}
                  <p className="text-sm text-muted line-clamp-3">{review.body}</p>
                  {review.is_loved && <p className="text-xs text-accent mt-2">❤️ Users love this</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!topAlbums || topAlbums.length === 0) && (!activeUsers || activeUsers.length === 0) && (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">🧭</p>
          <p className="text-muted">Nothing to discover yet.</p>
          <p className="text-sm text-muted/60 mt-2">
            Be the first to <Link href="/search" className="text-accent hover:underline">rate an album</Link>.
          </p>
        </div>
      )}
    </main>
  );
}
