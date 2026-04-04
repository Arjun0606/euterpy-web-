import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Link from "next/link";

function artwork(url: string | null, size = 500): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export const metadata = {
  title: "Feed",
};

export default async function FeedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Middleware handles redirect
  }

  // Get feed items with full data
  const { data: feedItems } = await supabase
    .from("feed_items")
    .select(
      `
      id,
      created_at,
      actor:profiles!feed_items_actor_id_fkey(username, display_name, avatar_url),
      rating:ratings!feed_items_rating_id_fkey(
        id, score, reaction, created_at,
        album:albums(id, apple_id, title, artist_name, artwork_url)
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/feed">
            <h1 className="font-display text-2xl">Euterpy</h1>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/search" className="text-muted hover:text-foreground transition-colors">
              Search
            </Link>
            <Link href={`/${user.user_metadata?.username || ""}`} className="text-muted hover:text-foreground transition-colors">
              Profile
            </Link>
            <Link href="/settings" className="text-muted hover:text-foreground transition-colors">
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-6">
          Feed
        </h2>

        {!feedItems || feedItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted mb-2">Your feed is empty.</p>
            <p className="text-sm text-muted/60">
              Follow people or{" "}
              <Link href="/search" className="text-accent hover:underline">
                search for an album
              </Link>{" "}
              to log.
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
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-card-hover transition-colors"
                >
                  {/* Avatar */}
                  <Link
                    href={`/${actor.username}`}
                    className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-sm text-muted shrink-0"
                  >
                    {actor.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={actor.avatar_url}
                        alt={actor.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      actor.username[0].toUpperCase()
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <Link
                        href={`/${actor.username}`}
                        className="font-medium hover:text-accent transition-colors"
                      >
                        {actor.display_name || actor.username}
                      </Link>
                      <span className="text-muted"> rated </span>
                      <Link
                        href={`/album/${album.apple_id}`}
                        className="font-medium hover:text-accent transition-colors"
                      >
                        {album.title}
                      </Link>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {album.artist_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-accent text-sm">
                        {"★".repeat(Math.floor(rating.score))}
                        {rating.score % 1 !== 0 && "½"}
                      </span>
                    </div>
                    {rating.reaction && (
                      <p className="text-sm text-muted/80 mt-2 italic">
                        &ldquo;{rating.reaction}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Album Art */}
                  <Link
                    href={`/album/${album.apple_id}`}
                    className="w-14 h-14 rounded bg-card border border-border overflow-hidden shrink-0"
                  >
                    {album.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artwork(album.artwork_url, 112)!}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-border">
                        ♪
                      </div>
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
