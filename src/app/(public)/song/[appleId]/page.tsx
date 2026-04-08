import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getArtworkUrl, getSong as fetchSongFromApple } from "@/lib/apple-music/client";
import SongActions from "./SongActions";
import ReviewSection from "@/components/album/ReviewSection";
import Stars from "@/components/ui/Stars";

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

    const serviceClient = createServiceClient();
    const { data: inserted } = await serviceClient.from("songs").insert({
      apple_id: appleId,
      title: appleSong.attributes.name,
      artist_name: appleSong.attributes.artistName,
      album_name: appleSong.attributes.albumName,
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

  // Reviews for this song
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("song_id", song.id)
    .order("created_at", { ascending: false });

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
            <a
              href={song.apple_url || `https://music.apple.com/song/${appleId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mb-4 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <span>🎵</span> Listen
            </a>

            {/* Rating Summary */}
            {song.rating_count > 0 ? (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-semibold text-accent">
                  {Number(song.average_rating).toFixed(1)}
                </span>
                <span className="text-muted text-sm">
                  / 5 from {song.rating_count} {song.rating_count === 1 ? "rating" : "ratings"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted/40">Not yet rated</p>
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

        {/* Reviews */}
        <ReviewSection
          reviews={JSON.parse(JSON.stringify(reviews || []))}
          songId={song.id}
          userId={user?.id || null}
        />

        {/* Community Reactions */}
        <div>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">Community Reactions</h2>
          {(!ratings || ratings.length === 0) ? (
            <p className="text-muted/60 text-sm">No one has rated this song yet. Be the first.</p>
          ) : (
            <div className="space-y-3">
              {ratings.map((rating: any) => {
                const profile = rating.profiles;
                return (
                  <div key={rating.id} className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border">
                    <a
                      href={`/${profile?.username}`}
                      className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-muted shrink-0 hover:border-accent transition-colors"
                    >
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        profile?.username?.[0]?.toUpperCase() || "?"
                      )}
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a href={`/${profile?.username}`} className="font-medium text-sm hover:text-accent transition-colors">
                          {profile?.display_name || profile?.username}
                        </a>
                        <Stars score={rating.score} />
                      </div>
                      {rating.reaction && <p className="text-sm text-muted leading-relaxed">{rating.reaction}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
