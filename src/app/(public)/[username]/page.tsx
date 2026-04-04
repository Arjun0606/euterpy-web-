import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import GetToKnowMe from "@/components/profile/GetToKnowMe";
import RecordShelf from "@/components/profile/RecordShelf";
import ShelfCard from "@/components/profile/ShelfCard";
import FollowButton from "@/components/ui/FollowButton";
import QuickSearch from "@/components/profile/QuickSearch";
import Stars from "@/components/ui/Stars";

function artwork(url: string | null, size = 500): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, album_count")
    .eq("username", username)
    .single();

  if (!profile) return { title: "Profile Not Found" };

  const name = profile.display_name || profile.username;

  return {
    title: `${name} (@${profile.username})`,
    description: `${profile.album_count} albums rated${profile.bio ? `. ${profile.bio}` : ""} — on Euterpy.`,
    openGraph: {
      title: `${name} (@${profile.username}) — Euterpy`,
      description: `${profile.album_count} albums rated${profile.bio ? `. ${profile.bio}` : ""}`,
      images: [
        {
          url: `/api/og/profile/${profile.username}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

async function getProfile(username: string) {
  const supabase = await createClient();

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) return null;

  // Get to Know Me
  const { data: getToKnowMe } = await supabase
    .from("get_to_know_me")
    .select("*, albums(*)")
    .eq("user_id", profile.id)
    .order("position");

  // Album ratings
  const { data: ratings } = await supabase
    .from("ratings")
    .select("*, albums(*)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  // Song ratings
  const { data: songRatings } = await supabase
    .from("song_ratings")
    .select("*, songs(*)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  // Shelves with first 4 items for preview
  const { data: shelves } = await supabase
    .from("shelves")
    .select(`
      *,
      items:shelf_items(
        id, item_type, position, note,
        albums(apple_id, title, artist_name, artwork_url),
        songs(apple_id, title, artist_name, artwork_url)
      )
    `)
    .eq("user_id", profile.id)
    .order("is_favorites", { ascending: false })
    .order("created_at", { ascending: false });

  // Sort shelf items by position and limit to 4 for preview
  const shelvesWithItems = (shelves || []).map((shelf: any) => ({
    ...shelf,
    items: (shelf.items || [])
      .sort((a: any, b: any) => a.position - b.position)
      .slice(0, 4),
  }));

  return {
    profile,
    getToKnowMe: getToKnowMe || [],
    ratings: ratings || [],
    songRatings: songRatings || [],
    shelves: shelvesWithItems,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await getProfile(username);
  if (!data) notFound();

  const { profile, getToKnowMe, ratings, songRatings, shelves } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* ====== Profile Header ====== */}
        <div className="flex items-start gap-5 mb-8">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center text-2xl text-muted shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              profile.username[0].toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold truncate">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-accent text-sm">@{profile.username}</p>
            <div className="mt-2">
              <FollowButton targetUserId={profile.id} />
            </div>
            {profile.bio && (
              <p className="text-muted mt-2 text-sm leading-relaxed">
                {profile.bio}
              </p>
            )}
            <div className="flex gap-4 mt-3 text-sm text-muted">
              <span>
                <strong className="text-foreground">
                  {profile.album_count}
                </strong>{" "}
                albums
              </span>
              <span>
                <strong className="text-foreground">
                  {profile.follower_count}
                </strong>{" "}
                followers
              </span>
              <span>
                <strong className="text-foreground">
                  {profile.following_count}
                </strong>{" "}
                following
              </span>
            </div>

            {/* Stats link */}
            <a
              href={`/${profile.username}/stats`}
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-muted hover:text-accent hover:border-accent transition-colors"
            >
              <span>📊</span> View Stats
            </a>
          </div>
        </div>

        {/* ====== Search + Rate (inline) ====== */}
        <QuickSearch userId={profile.id} onDone={() => {}} />

        {/* ====== GET TO KNOW ME — Hero Carousel ====== */}
        <GetToKnowMe items={getToKnowMe} username={profile.username} />

        {/* ====== Shelves ====== */}
        {shelves.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
              Shelves
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shelves.map((shelf: any) => (
                <ShelfCard
                  key={shelf.id}
                  shelf={shelf}
                  username={profile.username}
                />
              ))}
            </div>
          </div>
        )}

        {/* ====== Album Collection — Record Shelf ====== */}
        <RecordShelf ratings={ratings} title="Collection" />

        {/* ====== Song Ratings ====== */}
        {songRatings.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
              Songs
            </h2>
            <div className="space-y-1">
              {songRatings.map((rating: any) => {
                const song = rating.songs;
                return (
                  <div
                    key={rating.id}
                    className="flex items-center gap-4 p-3 -mx-3 rounded-lg hover:bg-card-hover transition-colors"
                  >
                    <div className="w-10 h-10 rounded bg-card border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {song?.artwork_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artwork(song.artwork_url, 80)!}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-border">♪</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {song?.title}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {song?.artist_name}
                        {song?.album_name && (
                          <span className="text-muted/40">
                            {" · "}
                            {song.album_name}
                          </span>
                        )}
                      </p>
                    </div>
                    <Stars score={rating.score} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====== Footer ====== */}
        <div className="text-center pt-8 border-t border-border">
          <p className="text-xs text-muted/40">
            Joined{" "}
            {new Date(profile.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
