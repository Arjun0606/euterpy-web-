import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl, getAppleMusicCharts } from "@/lib/apple-music/client";
import Link from "next/link";
import Stars from "@/components/ui/Stars";
import PeopleSearch from "@/components/profile/PeopleSearch";

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

  // Apple Music charts — REAL data from Apple's catalog
  const appleCharts = await getAppleMusicCharts(12);
  const appleAlbums = appleCharts.map((a) => ({
    apple_id: a.id,
    title: a.attributes.name,
    artist_name: a.attributes.artistName,
    artwork_url: a.attributes.artwork?.url || null,
  }));

  // Country-of-the-day — rotates daily, gives Discover a global pulse
  const COUNTRIES = [
    { code: "jp", name: "Japan", flag: "🇯🇵" },
    { code: "br", name: "Brazil", flag: "🇧🇷" },
    { code: "kr", name: "Korea", flag: "🇰🇷" },
    { code: "fr", name: "France", flag: "🇫🇷" },
    { code: "ng", name: "Nigeria", flag: "🇳🇬" },
    { code: "de", name: "Germany", flag: "🇩🇪" },
    { code: "mx", name: "Mexico", flag: "🇲🇽" },
    { code: "in", name: "India", flag: "🇮🇳" },
    { code: "se", name: "Sweden", flag: "🇸🇪" },
    { code: "gb", name: "United Kingdom", flag: "🇬🇧" },
    { code: "es", name: "Spain", flag: "🇪🇸" },
    { code: "au", name: "Australia", flag: "🇦🇺" },
    { code: "it", name: "Italy", flag: "🇮🇹" },
    { code: "ca", name: "Canada", flag: "🇨🇦" },
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const country = COUNTRIES[dayOfYear % COUNTRIES.length];
  const countryCharts = await getAppleMusicCharts(8, country.code);
  const countryAlbums = countryCharts.map((a) => ({
    apple_id: a.id,
    title: a.attributes.name,
    artist_name: a.attributes.artistName,
    artwork_url: a.attributes.artwork?.url || null,
  }));

  // Trending this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trending } = await supabase
    .from("albums")
    .select("*")
    .gt("rating_count", 0)
    .gte("updated_at", weekAgo)
    .order("rating_count", { ascending: false })
    .limit(8);

  // Recently active users
  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("*")
    .gt("album_count", 0)
    .order("updated_at", { ascending: false })
    .limit(8);

  // Latest stories
  const { data: latestStories } = await supabase
    .from("stories")
    .select("id, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, created_at, profiles(username, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(6);

  // Suggested users with similar taste
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
        const userOverlap: Record<string, { count: number; profile: any }> = {};
        for (const r of similar) {
          const uid = r.user_id;
          if (!userOverlap[uid]) userOverlap[uid] = { count: 0, profile: r.profiles };
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
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Explore</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">
          Discover what <span className="italic text-accent">moves you.</span>
        </h1>
      </div>

      {/* People search */}
      <PeopleSearch />

      {/* Apple Music Charts — real data from Apple */}
      {appleAlbums.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Trending Now</p>
            
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
            {appleAlbums.map((album: any) => (
              <Link key={album.apple_id} href={`/album/${album.apple_id}`} className="shrink-0 w-36 group">
                <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-zinc-700 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                  {album.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(album.artwork_url)!} alt={album.title} className="w-full h-full object-cover" />
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

      {/* Country of the day — rotates daily */}
      {countryAlbums.length > 0 && (
        <section className="mb-14">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-1">— Today, abroad</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
              <span className="mr-2">{country.flag}</span>Top in {country.name}.
            </h2>
            <p className="text-sm text-zinc-500 mt-1">A different country every day. Tomorrow, somewhere else.</p>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
            {countryAlbums.map((album: any) => (
              <Link key={album.apple_id} href={`/album/${album.apple_id}`} className="shrink-0 w-36 group">
                <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-accent/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                  {album.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(album.artwork_url)!} alt={album.title} className="w-full h-full object-cover" />
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

      {/* Trending This Week (community) */}
      {trending && trending.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Trending this week</p>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
            {trending.map((album: any) => (
              <Link key={album.apple_id} href={`/album/${album.apple_id}`} className="shrink-0 w-36 group">
                <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-zinc-700 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                  {album.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(album.artwork_url)!} alt={album.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{album.title}</p>
                <p className="text-[11px] text-zinc-500 truncate">{album.artist_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Stars score={Number(album.average_rating)} size="sm" />
                  <span className="text-[10px] text-zinc-600">({album.rating_count})</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Suggested for you */}
      {suggestedUsers.length > 0 && (
        <section className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">Curators with your taste</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {suggestedUsers.map((u: any) => (
              <Link key={u.id} href={`/${u.username}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-zinc-700 transition-colors text-center">
                <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-lg text-muted mx-auto mb-3 overflow-hidden">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : u.username[0].toUpperCase()}
                </div>
                <p className="font-medium text-sm truncate">{u.display_name || u.username}</p>
                <p className="text-[11px] text-accent">@{u.username}</p>
                <p className="text-[11px] text-zinc-500 mt-1">{u.overlap} in common</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Most-collected of all time */}
      {topAlbums && topAlbums.length > 0 && (
        <section className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">Most collected, all time</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {topAlbums.map((album: any) => (
              <Link key={album.id} href={`/album/${album.apple_id}`} className="group">
                <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-zinc-700 group-hover:shadow-2xl group-hover:shadow-accent/10">
                  {album.artwork_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(album.artwork_url)!} alt={album.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{album.title}</p>
                <p className="text-[11px] text-zinc-500 truncate">{album.artist_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Stars score={Number(album.average_rating)} size="sm" />
                  <span className="text-[10px] text-zinc-600">({album.rating_count})</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Active Curators */}
      {activeUsers && activeUsers.length > 0 && (
        <section className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">Active curators</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {activeUsers.map((u: any) => (
              <Link key={u.id} href={`/${u.username}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-zinc-700 transition-colors text-center">
                <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-lg text-muted mx-auto mb-2 overflow-hidden">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : u.username[0].toUpperCase()}
                </div>
                <p className="font-medium text-sm truncate">{u.display_name || u.username}</p>
                <p className="text-[11px] text-zinc-500">{u.album_count} albums</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest Stories */}
      {latestStories && latestStories.length > 0 && (
        <section className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">Latest stories</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {latestStories.map((story: any) => {
              const author = story.profiles;
              const cover = story.target_artwork_url ? art(story.target_artwork_url, 200) : null;
              const preview = story.body.length > 200 ? story.body.slice(0, 200).trimEnd() + "…" : story.body;
              return (
                <Link key={story.id} href={`/story/${story.id}`}
                  className="block bg-card border border-border rounded-xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-muted shrink-0 overflow-hidden">
                      {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : author?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{author?.display_name || author?.username}</span>
                      <p className="text-[10px] text-zinc-700">on {story.kind}</p>
                    </div>
                  </div>
                  {cover && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`${story.kind === "artist" ? "rounded-full" : "rounded"} w-10 h-10 overflow-hidden`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{story.target_title}</p>
                        {story.target_artist && story.kind !== "artist" && (
                          <p className="text-[11px] text-zinc-500">{story.target_artist}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {story.headline && <p className="font-display text-lg mb-2 line-clamp-2">{story.headline}</p>}
                  <p className="editorial text-sm text-zinc-300 line-clamp-3">{preview}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state — only if literally nothing exists */}
      {(!topAlbums || topAlbums.length === 0) && (!activeUsers || activeUsers.length === 0) && (
        <div className="text-center py-20">
          <p className="font-display text-3xl mb-3">A new beginning.</p>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">
            Be the first to rate an album. Your taste will start the movement.
          </p>
          <Link href="/search" className="inline-block mt-6 px-8 py-3 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent-hover transition-colors">
            Rate an album
          </Link>
        </div>
      )}
    </main>
  );
}
