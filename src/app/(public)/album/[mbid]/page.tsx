import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getArtworkUrl, getAlbum as fetchAlbumFromApple, getRelatedAlbums } from "@/lib/apple-music/client";
import VinylCover from "@/components/ui/VinylCover";
import AlbumActions from "@/components/album/AlbumActions";
import TrackList from "@/components/album/TrackList";
import EditorialNotes from "@/components/album/EditorialNotes";
import TellStoryButton from "@/components/story/TellStoryButton";
import StoriesSection from "@/components/story/StoriesSection";
import StreamingLinks from "@/components/music/StreamingLinks";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ mbid: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mbid: appleId } = await params;
  const supabase = await createClient();

  let { data: album } = await supabase
    .from("albums")
    .select("title, artist_name, average_rating, rating_count")
    .eq("apple_id", appleId)
    .single();

  // Fall back to Apple Music if not in DB yet
  if (!album) {
    const appleAlbum = await fetchAlbumFromApple(appleId);
    if (appleAlbum) {
      album = {
        title: appleAlbum.attributes.name,
        artist_name: appleAlbum.attributes.artistName,
        average_rating: null,
        rating_count: 0,
      };
    }
  }

  if (!album) return { title: "Album Not Found" };

  const ratingText = album.average_rating
    ? `Rated ${album.average_rating}/5 by ${album.rating_count} people`
    : "Not yet rated";

  return {
    title: `${album.title} by ${album.artist_name}`,
    description: `${ratingText} on Euterpy. Community reactions and ratings.`,
    openGraph: {
      title: `${album.title} by ${album.artist_name} — Euterpy`,
      description: `${ratingText}`,
      images: [{ url: `/api/og/album/${appleId}`, width: 1200, height: 630 }],
    },
  };
}

function artwork(url: string | null, size = 500): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

async function getAlbumData(appleId: string) {
  const supabase = await createClient();

  let { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("apple_id", appleId)
    .single();

  // If not in our DB, fetch from Apple Music and create it on demand
  if (!album) {
    const appleAlbum = await fetchAlbumFromApple(appleId);
    if (!appleAlbum) return null;

    const attrs = appleAlbum.attributes;
    const editorialText = attrs.editorialNotes?.standard || attrs.editorialNotes?.short || null;
    const artistAppleId = appleAlbum.relationships?.artists?.data?.[0]?.id || null;

    const serviceClient = createServiceClient();
    const { data: inserted } = await serviceClient
      .from("albums")
      .insert({
        apple_id: appleId,
        title: attrs.name,
        artist_name: attrs.artistName,
        artist_apple_id: artistAppleId,
        release_date: attrs.releaseDate || null,
        artwork_url: attrs.artwork.url,
        genre_names: attrs.genreNames,
        track_count: attrs.trackCount,
        editorial_notes: editorialText ? editorialText.replace(/<[^>]*>/g, "").trim() : null,
        record_label: attrs.recordLabel || null,
        copyright: attrs.copyright || null,
        apple_url: attrs.url || null,
        is_single: attrs.isSingle || false,
      })
      .select()
      .single();

    album = inserted;
    if (!album) return null;
  }

  // Backfill artist_apple_id if it was missing on a previously cached album
  if (album && !album.artist_apple_id) {
    const appleAlbum = await fetchAlbumFromApple(appleId);
    const artistAppleId = appleAlbum?.relationships?.artists?.data?.[0]?.id || null;
    if (artistAppleId) {
      const serviceClient = createServiceClient();
      await serviceClient.from("albums").update({ artist_apple_id: artistAppleId }).eq("id", album.id);
      album.artist_apple_id = artistAppleId;
    }
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Album ratings with profiles
  const { data: ratings } = await supabase
    .from("ratings")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false });

  // Song ratings for tracks in this album (by all users)
  const { data: songRatings } = await supabase
    .from("song_ratings")
    .select("*, songs!inner(apple_id, album_apple_id)")
    .eq("songs.album_apple_id", appleId);

  // Stories about this album
  const { data: stories } = await supabase
    .from("stories")
    .select("id, headline, body, created_at, user_id, profiles(username, display_name, avatar_url)")
    .eq("kind", "album")
    .eq("target_apple_id", appleId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Friends-wrote-about-this: stories whose author the current user follows
  let friendStories: any[] = [];
  if (user && stories && stories.length > 0) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const followingSet = new Set((follows || []).map((f) => f.following_id));
    friendStories = stories.filter((s: any) => followingSet.has(s.user_id));
  }

  // Related albums via MusicKit — Apple's "if you like this..." signal
  const relatedAlbums = await getRelatedAlbums(appleId, 6);

  return {
    album,
    ratings: ratings || [],
    songRatings: songRatings || [],
    stories: stories || [],
    friendStories,
    relatedAlbums,
    userId: user?.id || null,
  };
}

export default async function AlbumPage({ params }: Props) {
  const { mbid: appleId } = await params;
  const data = await getAlbumData(appleId);
  if (!data) notFound();

  const { album, ratings, songRatings, stories, friendStories, relatedAlbums, userId } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Anonymous visitor nav */}
      {!userId && (
        <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
            <a href="/" className="font-display text-xl tracking-tight">Euterpy</a>
            <div className="flex items-center gap-4">
              <a href="/login" className="text-sm text-zinc-400 hover:text-foreground transition-colors">Log in</a>
              <a href="/signup" className="text-sm bg-accent text-white px-4 py-2 rounded-full font-medium hover:bg-accent-hover transition-colors">
                Sign up
              </a>
            </div>
          </div>
        </nav>
      )}

      {/* Album art hero background — subtle, blurred */}
      {album.artwork_url && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artwork(album.artwork_url, 200)!}
            alt=""
            className="w-full h-[50vh] object-cover opacity-[0.06] blur-3xl scale-125"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12 relative z-10">
        {/* Album Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-12">
          {/* Vinyl Cover */}
          <div className="group">
            <VinylCover
              artworkUrl={album.artwork_url}
              title={album.title}
              size="xl"
              showVinyl={true}
            />
          </div>

          {/* Album Info */}
          <div className="text-center sm:text-left flex-1">
            {/* Type badge */}
            {album.album_type && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold mb-3">
                {album.album_type === "ep" ? "EP" : album.album_type === "compilation" ? "Compilation" : album.album_type === "single" ? "Single" : "Album"}
              </p>
            )}
            <h1 className="font-display text-4xl sm:text-6xl tracking-tight leading-none mb-3">
              {album.title}
            </h1>
            {album.artist_apple_id ? (
              <a
                href={`/artist/${album.artist_apple_id}`}
                className="text-xl text-zinc-300 mb-3 hover:text-accent transition-colors inline-block"
              >
                {album.artist_name}
              </a>
            ) : (
              <p className="text-xl text-zinc-300 mb-3">{album.artist_name}</p>
            )}
            {album.release_date && (
              <p className="text-sm text-zinc-500 mb-1">
                {new Date(album.release_date).getFullYear()}
              </p>
            )}
            {album.genre_names && album.genre_names.length > 0 && (
              <p className="text-xs text-muted/40 mb-1">
                {album.genre_names.filter((g: string) => g !== "Music").join(" · ")}
              </p>
            )}
            {album.record_label && (
              <p className="text-xs text-muted/30 mb-1">{album.record_label}{album.is_single ? " · Single" : ""}</p>
            )}
            {album.copyright && (
              <p className="text-[10px] text-muted/20 mb-4">{album.copyright}</p>
            )}
            {!album.record_label && !album.copyright && <div className="mb-4" />}

            {/* Collection count */}
            {album.rating_count > 0 ? (
              <p className="text-sm text-zinc-500">
                In <span className="text-accent font-semibold">{album.rating_count}</span> {album.rating_count === 1 ? "collection" : "collections"}
              </p>
            ) : (
              <p className="text-sm text-muted/40">Not yet collected</p>
            )}

            {/* Streaming links — Spotify, Apple Music, YouTube, Tidal, etc */}
            <StreamingLinks
              kind="album"
              appleId={appleId}
              appleUrl={album.apple_url}
              title={album.title}
              artist={album.artist_name}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <TellStoryButton
                kind="album"
                appleId={appleId}
                title={album.title}
                artist={album.artist_name}
                artworkUrl={album.artwork_url}
              />
            </div>

            {/* Collection actions */}
            <AlbumActions
              albumAppleId={appleId}
              albumDbId={album.id}
              albumTitle={album.title}
              artistName={album.artist_name}
              artworkUrl={album.artwork_url}
            />
          </div>
        </div>

        {/* Track Listing */}
        <TrackList albumAppleId={appleId} songRatings={songRatings} />

        {/* Editorial Notes (from Apple Music) */}
        {album.editorial_notes && <EditorialNotes text={album.editorial_notes} />}

        {/* Friends wrote about this — social proof, prioritized */}
        {friendStories.length > 0 && (
          <StoriesSection
            stories={JSON.parse(JSON.stringify(friendStories))}
            title="Friends wrote about this"
          />
        )}

        {/* Stories about this album — the heart of the page */}
        <StoriesSection
          stories={JSON.parse(JSON.stringify(stories))}
          title="Stories about this album"
          emptyState={
            <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
              <p className="font-display text-2xl mb-2">No one has written about this yet.</p>
              <p className="text-sm text-zinc-500 mb-5 max-w-sm mx-auto">
                What does it mean to you? Be the first to tell its story.
              </p>
              <TellStoryButton
                kind="album"
                appleId={appleId}
                title={album.title}
                artist={album.artist_name}
                artworkUrl={album.artwork_url}
                variant="primary"
              />
            </div>
          }
        />

        {/* Related albums — Apple's "if you like this" signal */}
        {relatedAlbums.length > 0 && (
          <div className="mb-14">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">— If you write about this, write about</p>
            <div className="flex gap-3 overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 no-scrollbar pb-2">
              {relatedAlbums.map((rel: any) => {
                const cover = rel.attributes.artwork?.url
                  ? rel.attributes.artwork.url.replace("{w}", "400").replace("{h}", "400")
                  : null;
                return (
                  <Link key={rel.id} href={`/album/${rel.id}`} className="shrink-0 w-32 sm:w-36 group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-accent/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt={rel.attributes.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{rel.attributes.name}</p>
                    <p className="text-[11px] text-zinc-600 truncate italic">{rel.attributes.artistName}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* In their collections — collectors with notes */}
        {ratings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">
              In their collections
            </h2>
            <div className="space-y-3">
              {ratings.filter((r: any) => r.reaction).slice(0, 12).map((rating: any) => {
                const profile = rating.profiles;
                const mediumLabel = rating.ownership === "vinyl" ? "💽 Vinyl"
                  : rating.ownership === "cd" ? "💿 CD"
                  : rating.ownership === "cassette" ? "📼 Cassette"
                  : rating.ownership === "digital" ? "🎧 Stream"
                  : null;
                return (
                  <div
                    key={rating.id}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border"
                  >
                    <a
                      href={`/${profile?.username}`}
                      className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-muted shrink-0 hover:border-accent transition-colors overflow-hidden"
                    >
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        profile?.username?.[0]?.toUpperCase() || "?"
                      )}
                    </a>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <a
                          href={`/${profile?.username}`}
                          className="font-medium text-sm hover:text-accent transition-colors"
                        >
                          {profile?.display_name || profile?.username}
                        </a>
                        {mediumLabel && (
                          <span className="text-[10px] text-zinc-600">{mediumLabel}</span>
                        )}
                      </div>
                      <p className="editorial text-sm text-zinc-300 leading-relaxed">
                        &ldquo;{rating.reaction}&rdquo;
                      </p>
                    </div>
                  </div>
                );
              })}
              {ratings.filter((r: any) => r.reaction).length === 0 && (
                <p className="text-zinc-600 text-sm">No one has written about this album yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Anonymous CTA banner */}
        {!userId && (
          <div className="mt-16 mb-8 p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-accent/10 via-card to-card border border-border text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-accent/[0.08] rounded-full blur-[100px] -z-0 pointer-events-none" />
            <div className="relative z-10">
              <h3 className="font-display text-3xl sm:text-4xl tracking-tight mb-3 leading-tight">
                What does <span className="italic text-accent">{album.title}</span> mean to you?
              </h3>
              <p className="editorial italic text-base text-zinc-400 mb-6 max-w-md mx-auto">
                Make a Euterpy page. Tell its story. Pin a lyric you carry. Share the link in your bio.
              </p>
              <a href="/signup"
                className="inline-block px-10 py-3.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-all hover:shadow-2xl hover:shadow-accent/30">
                Make your page
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
