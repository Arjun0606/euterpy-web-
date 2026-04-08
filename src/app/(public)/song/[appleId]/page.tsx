import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getArtworkUrl, getSong as fetchSongFromApple } from "@/lib/apple-music/client";
import SongActions from "./SongActions";
import TellStoryButton from "@/components/story/TellStoryButton";
import StoriesSection from "@/components/story/StoriesSection";

interface Props {
  params: Promise<{ appleId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { appleId } = await params;
  const supabase = await createClient();

  const { data: song } = await supabase
    .from("songs")
    .select("title, artist_name, average_rating, rating_count")
    .eq("apple_id", appleId)
    .single();

  if (!song) return { title: "Song Not Found" };

  const ratingText = song.average_rating
    ? `Rated ${song.average_rating}/5 by ${song.rating_count} people`
    : "Not yet rated";

  return {
    title: `${song.title} by ${song.artist_name}`,
    description: `${ratingText} on Euterpy.`,
  };
}

function artwork(url: string | null, size = 500): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default async function SongPage({ params }: Props) {
  const { appleId } = await params;
  const supabase = await createClient();

  // Check DB first, if not found fetch from Apple Music and insert
  let { data: song } = await supabase
    .from("songs")
    .select("*")
    .eq("apple_id", appleId)
    .single();

  if (!song) {
    const appleSong = await fetchSongFromApple(appleId);
    if (!appleSong) notFound();

    const parentAlbumId = (appleSong as any).relationships?.albums?.data?.[0]?.id || null;

    const serviceClient = createServiceClient();
    const { data: inserted } = await serviceClient.from("songs").insert({
      apple_id: appleId,
      title: appleSong.attributes.name,
      artist_name: appleSong.attributes.artistName,
      album_name: appleSong.attributes.albumName,
      album_apple_id: parentAlbumId,
      duration_ms: appleSong.attributes.durationInMillis,
      artwork_url: appleSong.attributes.artwork.url,
      track_number: appleSong.attributes.trackNumber,
      genre_names: appleSong.attributes.genreNames,
      composer_name: appleSong.attributes.composerName || null,
      apple_url: appleSong.attributes.url || null,
    }).select().single();

    if (!inserted) notFound();
    song = inserted;
  }

  if (!song) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  // Song ratings with profiles
  const { data: ratings } = await supabase
    .from("song_ratings")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("song_id", song.id)
    .order("created_at", { ascending: false });

  // Stories about this song
  const { data: stories } = await supabase
    .from("stories")
    .select("id, headline, body, created_at, user_id, profiles(username, display_name, avatar_url, is_verified, verified_label)")
    .eq("kind", "song")
    .eq("target_apple_id", appleId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Friends wrote about this song
  let friendStories: any[] = [];
  if (user && stories && stories.length > 0) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const followingSet = new Set((follows || []).map((f) => f.following_id));
    friendStories = stories.filter((s: any) => followingSet.has(s.user_id));
  }

  const durationMin = song.duration_ms ? Math.floor(song.duration_ms / 60000) : null;
  const durationSec = song.duration_ms ? Math.floor((song.duration_ms % 60000) / 1000) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Anonymous visitor nav */}
      {!user && (
        <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
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

      {/* Blurred background */}
      {song.artwork_url && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artwork(song.artwork_url, 200)!}
            alt=""
            className="w-full h-[50vh] object-cover opacity-[0.06] blur-3xl scale-125"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 relative z-10">
        {/* Song Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-12">
          <div className="w-48 h-48 rounded-xl overflow-hidden bg-card border border-border shrink-0">
            {song.artwork_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artwork(song.artwork_url)!} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-border">♪</div>
            )}
          </div>

          <div className="text-center sm:text-left flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500/60 mb-1">Song</p>
            <h1 className="font-display text-3xl sm:text-4xl mb-2">{song.title}</h1>
            <p className="text-xl text-muted mb-1">{song.artist_name}</p>
            {song.album_name && (
              <p className="text-sm text-muted/60 mb-1">
                {song.album_apple_id ? (
                  <a href={`/album/${song.album_apple_id}`} className="hover:text-accent transition-colors">
                    {song.album_name}
                  </a>
                ) : (
                  song.album_name
                )}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted/40 mb-2 justify-center sm:justify-start">
              {song.track_number && <span>Track {song.track_number}</span>}
              {durationMin !== null && <span>{durationMin}:{String(durationSec).padStart(2, "0")}</span>}
              {song.genre_names?.length > 0 && (
                <span>{song.genre_names.filter((g: string) => g !== "Music").join(" · ")}</span>
              )}
            </div>
            {song.composer_name && (
              <p className="text-xs text-muted/30 mb-2">Written by {song.composer_name}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-3 justify-center sm:justify-start">
              <a
                href={song.apple_url || `https://music.apple.com/song/${appleId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <span>🎵</span> Listen
              </a>
              <TellStoryButton
                kind="song"
                appleId={appleId}
                title={song.title}
                artist={song.artist_name}
                artworkUrl={song.artwork_url}
              />
            </div>

            {/* Collection count */}
            {song.rating_count > 0 ? (
              <p className="text-sm text-zinc-500">
                In <span className="text-accent font-semibold">{song.rating_count}</span> {song.rating_count === 1 ? "collection" : "collections"}
              </p>
            ) : (
              <p className="text-sm text-muted/40">Not yet collected</p>
            )}

            <SongActions
              songAppleId={appleId}
              songDbId={song.id}
              songTitle={song.title}
              artistName={song.artist_name}
              albumName={song.album_name}
              artworkUrl={song.artwork_url}
            />
          </div>
        </div>

        {/* Friends wrote about this — social proof first */}
        {friendStories.length > 0 && (
          <StoriesSection
            stories={JSON.parse(JSON.stringify(friendStories))}
            title="Friends wrote about this"
          />
        )}

        {/* Stories about this song */}
        <StoriesSection
          stories={JSON.parse(JSON.stringify(stories || []))}
          title="Stories about this song"
          emptyState={
            <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
              <p className="font-display text-2xl mb-2">No one has written about this yet.</p>
              <p className="text-sm text-zinc-500 mb-5 max-w-sm mx-auto">
                Where were you when you first heard it? Tell its story.
              </p>
              <TellStoryButton
                kind="song"
                appleId={appleId}
                title={song.title}
                artist={song.artist_name}
                artworkUrl={song.artwork_url}
                variant="primary"
              />
            </div>
          }
        />

        {/* In their collections */}
        {ratings && ratings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">In their collections</h2>
            <div className="space-y-3">
              {ratings.filter((r: any) => r.reaction).slice(0, 12).map((rating: any) => {
                const profile = rating.profiles;
                return (
                  <div key={rating.id} className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
                    <a
                      href={`/${profile?.username}`}
                      className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-muted shrink-0 hover:border-accent transition-colors overflow-hidden"
                    >
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                      ) : (
                        profile?.username?.[0]?.toUpperCase() || "?"
                      )}
                    </a>
                    <div className="flex-1 min-w-0">
                      <a href={`/${profile?.username}`} className="font-medium text-sm hover:text-accent transition-colors block mb-1.5">
                        {profile?.display_name || profile?.username}
                      </a>
                      <p className="editorial text-sm text-zinc-300 leading-relaxed">&ldquo;{rating.reaction}&rdquo;</p>
                    </div>
                  </div>
                );
              })}
              {ratings.filter((r: any) => r.reaction).length === 0 && (
                <p className="text-zinc-600 text-sm">No one has written about this song yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Anonymous CTA banner */}
        {!user && (
          <div className="mt-16 mb-8 p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-accent/10 via-card to-card border border-border text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-accent/[0.08] rounded-full blur-[100px] -z-0 pointer-events-none" />
            <div className="relative z-10">
              <h3 className="font-display text-3xl sm:text-4xl tracking-tight mb-3 leading-tight">
                Got an opinion on <span className="italic text-accent">{song.title}</span>?
              </h3>
              <p className="editorial text-base text-zinc-400 mb-6 max-w-md mx-auto">
                Join Euterpy. Rate it, review it, add it to your shelf, and find people who hear what you hear.
              </p>
              <a href="/signup"
                className="inline-block px-10 py-3.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-all hover:shadow-2xl hover:shadow-accent/30">
                Start your shelf
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
