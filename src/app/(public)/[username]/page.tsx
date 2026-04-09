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
    alternates: {
      types: {
        "application/json+oembed": `/api/oembed?url=${encodeURIComponent(`https://euterpy.com/${profile.username}`)}`,
      },
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
    { data: stories },
    { data: lyricPins },
    { data: lists },
    { data: charts },
    { data: badges },
  ] = await Promise.all([
    supabase.from("get_to_know_me").select("*, albums(*)").eq("user_id", profile.id).order("position"),
    supabase.from("ratings").select("id, score, reaction, ownership, created_at, albums(apple_id, title, artist_name, artwork_url, release_date, genre_names, record_label)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("song_ratings").select("*, songs(*)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("stories").select("id, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, is_pinned, created_at").eq("user_id", profile.id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("lyric_pins").select("*").eq("user_id", profile.id).order("position"),
    supabase.from("lists").select("id, title, subtitle, created_at, items:list_items(position, target_title, target_artwork_url)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("charts").select("id, period_label, created_at, items:chart_items(*)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("user_badges").select("*, badges(*)").eq("user_id", profile.id).order("is_displayed", { ascending: false }),
  ]);

  // Social counts for the stats portrait
  const ownedContentIds = [
    ...((stories || []).map((s: any) => s.id)),
    ...((lists || []).map((l: any) => l.id)),
    ...((charts || []).map((c: any) => c.id)),
    ...((lyricPins || []).map((l: any) => l.id)),
  ];

  const ownedStoryIds = (stories || []).map((s: any) => s.id);

  const [
    { count: marksGiven },
    { count: echoesGiven },
    { count: followerCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase.from("stars").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("reposts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  let marksReceived = 0;
  let echoesReceived = 0;
  let mostMarkedStoryId: string | null = null;
  if (ownedContentIds.length > 0) {
    const [{ count: m }, { count: e }] = await Promise.all([
      supabase.from("stars").select("id", { count: "exact", head: true }).in("target_id", ownedContentIds),
      supabase.from("reposts").select("id", { count: "exact", head: true }).in("target_id", ownedContentIds),
    ]);
    marksReceived = m || 0;
    echoesReceived = e || 0;

    if (ownedStoryIds.length > 0) {
      const { data: storyMarks } = await supabase
        .from("stars")
        .select("target_id")
        .eq("kind", "story")
        .in("target_id", ownedStoryIds);
      const storyMarkCounts: Record<string, number> = {};
      for (const row of (storyMarks || []) as { target_id: string }[]) {
        storyMarkCounts[row.target_id] = (storyMarkCounts[row.target_id] || 0) + 1;
      }
      const top = Object.entries(storyMarkCounts).sort((a, b) => b[1] - a[1])[0];
      if (top) mostMarkedStoryId = top[0];
    }
  }

  const mostMarkedStory = mostMarkedStoryId
    ? (stories || []).find((s: any) => s.id === mostMarkedStoryId) || null
    : null;

  const socialCounts = {
    stories: (stories || []).length,
    lyricPins: (lyricPins || []).length,
    lists: (lists || []).length,
    charts: (charts || []).length,
    marksGiven: marksGiven || 0,
    marksReceived,
    echoesGiven: echoesGiven || 0,
    echoesReceived,
    followers: followerCount || 0,
    following: followingCount || 0,
  };

  // Mutuals — when viewing someone else's profile, who do you both follow?
  let mutuals: any[] = [];
  if (user && user.id !== profile.id) {
    // Get who the viewer follows
    const { data: viewerFollows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const viewerFollowingIds = (viewerFollows || []).map((f) => f.following_id);

    if (viewerFollowingIds.length > 0) {
      // Find which of those people also follow the profile
      const { data: theyFollow } = await supabase
        .from("follows")
        .select("follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)")
        .eq("following_id", profile.id)
        .in("follower_id", viewerFollowingIds)
        .limit(8);
      mutuals = (theyFollow || []).map((row: any) => row.profiles).filter(Boolean);
    }
  }

  return {
    gated: false as const,
    profile,
    currentUserId: user?.id || null,
    getToKnowMe: getToKnowMe || [],
    ratings: ratings || [],
    songRatings: songRatings || [],
    stories: stories || [],
    lyricPins: lyricPins || [],
    lists: lists || [],
    charts: charts || [],
    badges: badges || [],
    mutuals,
    socialCounts,
    mostMarkedStory,
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
