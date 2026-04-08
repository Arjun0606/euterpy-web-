import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfilePage from "@/components/profile/ProfilePage";
import PrivateProfileGate from "@/components/profile/PrivateProfileGate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const description = profile.bio || `${name}'s music identity on Euterpy.`;

  return {
    title: `${name} — a music identity on Euterpy`,
    description,
    openGraph: {
      title: `${name} — a music identity on Euterpy`,
      description,
      images: [{ url: `/api/og/profile/${profile.username}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — a music identity on Euterpy`,
      description,
      images: [`/api/og/profile/${profile.username}`],
    },
  };
}

async function getFullProfile(username: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  if (!profile) return null;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  // Check if private profile should be gated
  if (profile.is_private && !isOwner) {
    // Check if current user follows this profile
    let isFollowing = false;
    let requestPending = false;

    if (user) {
      const { data: follow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .single();
      isFollowing = !!follow;

      if (!isFollowing) {
        const { data: request } = await supabase
          .from("follow_requests")
          .select("id")
          .eq("requester_id", user.id)
          .eq("target_id", profile.id)
          .eq("status", "pending")
          .single();
        requestPending = !!request;
      }
    }

    if (!isFollowing) {
      return { gated: true as const, profile, requestPending };
    }
  }

  const [
    { data: getToKnowMe },
    { data: ratings },
    { data: songRatings },
    { data: shelves },
    { data: stories },
    { data: lyricPins },
    { data: badges },
  ] = await Promise.all([
    supabase.from("get_to_know_me").select("*, albums(*)").eq("user_id", profile.id).order("position"),
    supabase.from("ratings").select("*, albums(*)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("song_ratings").select("*, songs(*)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("shelves").select(`*, items:shelf_items(id, item_type, position, note, albums(apple_id, title, artist_name, artwork_url), songs(apple_id, title, artist_name, artwork_url))`).eq("user_id", profile.id).order("is_favorites", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("stories").select("id, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, is_pinned, created_at").eq("user_id", profile.id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("lyric_pins").select("*").eq("user_id", profile.id).order("position"),
    supabase.from("user_badges").select("*, badges(*)").eq("user_id", profile.id).order("is_displayed", { ascending: false }),
  ]);

  const shelvesWithItems = (shelves || []).map((shelf: any) => ({
    ...shelf,
    items: (shelf.items || []).sort((a: any, b: any) => a.position - b.position).slice(0, 4),
  }));

  return {
    gated: false as const,
    profile,
    currentUserId: user?.id || null,
    getToKnowMe: getToKnowMe || [],
    ratings: ratings || [],
    songRatings: songRatings || [],
    shelves: shelvesWithItems,
    stories: stories || [],
    lyricPins: lyricPins || [],
    badges: badges || [],
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await getFullProfile(username);
  if (!data) notFound();

  if (data.gated) {
    return (
      <PrivateProfileGate
        profile={JSON.parse(JSON.stringify(data.profile))}
        requestPending={data.requestPending}
      />
    );
  }

  return (
    <ProfilePage
      data={JSON.parse(JSON.stringify(data))}
    />
  );
}
