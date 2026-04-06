import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import VinylCover from "@/components/ui/VinylCover";
import AlbumActions from "@/components/album/AlbumActions";
import TrackList from "@/components/album/TrackList";
import ReviewSection from "@/components/album/ReviewSection";
import RatingDistributionBar from "@/components/album/RatingDistributionBar";
import Stars from "@/components/ui/Stars";

interface Props {
  params: Promise<{ mbid: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mbid: appleId } = await params;
  const supabase = await createClient();

  const { data: album } = await supabase
    .from("albums")
    .select("title, artist_name, average_rating, rating_count")
    .eq("apple_id", appleId)
    .single();

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

  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("apple_id", appleId)
    .single();

  if (!album) return null;

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

  // Reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false });

  return {
    album,
    ratings: ratings || [],
    songRatings: songRatings || [],
    reviews: reviews || [],
    userId: user?.id || null,
  };
}

export default async function AlbumPage({ params }: Props) {
  const { mbid: appleId } = await params;
  const data = await getAlbumData(appleId);
  if (!data) notFound();

  const { album, ratings, songRatings, reviews, userId } = data;

  return (
    <div className="min-h-screen bg-background">
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

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 relative z-10">
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
            <h1 className="font-display text-3xl sm:text-4xl mb-2">
              {album.title}
            </h1>
            <p className="text-xl text-muted mb-2">{album.artist_name}</p>
            {album.release_date && (
              <p className="text-sm text-muted/60 mb-1">
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

            {/* Rating Summary */}
            {album.rating_count > 0 ? (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-semibold text-accent">
                  {Number(album.average_rating).toFixed(1)}
                </span>
                <span className="text-muted text-sm">
                  / 5 from {album.rating_count}{" "}
                  {album.rating_count === 1 ? "rating" : "ratings"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted/40">Not yet rated</p>
            )}

            {/* Listen on Apple Music */}
            <a
              href={album.apple_url || `https://music.apple.com/album/${appleId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <span>🎵</span> Listen on Apple Music
            </a>

            {/* Rate / Edit button */}
            <AlbumActions
              albumAppleId={appleId}
              albumDbId={album.id}
              albumTitle={album.title}
              artistName={album.artist_name}
              artworkUrl={album.artwork_url}
            />
          </div>
        </div>

        {/* Rating Distribution */}
        <RatingDistributionBar ratings={ratings.map((r: any) => ({ score: r.score }))} />

        {/* Track Listing */}
        <TrackList albumAppleId={appleId} songRatings={songRatings} />

        {/* Editorial Notes (from Apple Music) */}
        {album.editorial_notes && (
          <div className="mb-10">
            <h2 className="text-xs uppercase tracking-widest text-muted mb-3">About This Album</h2>
            <p className="text-sm text-muted/80 leading-relaxed">{album.editorial_notes}</p>
          </div>
        )}

        {/* Reviews */}
        <ReviewSection
          reviews={JSON.parse(JSON.stringify(reviews))}
          albumId={album.id}
          userId={userId}
        />

        {/* Community Reactions */}
        <div>
          <h2 className="text-xs uppercase tracking-widest text-muted mb-6">
            Community Reactions
          </h2>
          {ratings.length === 0 ? (
            <p className="text-muted/60 text-sm">
              No one has rated this album yet. Be the first.
            </p>
          ) : (
            <div className="space-y-3">
              {ratings.map((rating: any) => {
                const profile = rating.profiles;
                return (
                  <div
                    key={rating.id}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border"
                  >
                    <a
                      href={`/${profile?.username}`}
                      className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-muted shrink-0 hover:border-accent transition-colors"
                    >
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        profile?.username?.[0]?.toUpperCase() || "?"
                      )}
                    </a>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={`/${profile?.username}`}
                          className="font-medium text-sm hover:text-accent transition-colors"
                        >
                          {profile?.display_name || profile?.username}
                        </a>
                        <Stars score={rating.score} />
                      </div>
                      {rating.reaction && (
                        <p className="text-sm text-muted leading-relaxed">
                          {rating.reaction}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
