import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import IdentityStats from "@/components/stats/IdentityStats";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s portrait`,
    description: `A music identity portrait for @${username} on Euterpy.`,
  };
}

async function getStatsData(username: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .single();

  if (!profile) return null;

  const [
    { data: ratings },
    { data: songRatings },
    { count: storyCount },
    { count: lyricCount },
    { count: listCount },
    { count: chartCount },
    { count: marksGiven },
    { count: echoesGiven },
    storyIdsResp,
    listIdsResp,
    chartIdsResp,
    lyricIdsResp,
  ] = await Promise.all([
    supabase
      .from("ratings")
      .select("id, score, reaction, ownership, created_at, albums(apple_id, title, artist_name, artwork_url, release_date, genre_names)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("song_ratings")
      .select("id, created_at, songs(apple_id, title, artist_name, album_name, genre_names)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("lyric_pins").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("lists").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("charts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("stars").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("reposts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("stories").select("id").eq("user_id", profile.id),
    supabase.from("lists").select("id").eq("user_id", profile.id),
    supabase.from("charts").select("id").eq("user_id", profile.id),
    supabase.from("lyric_pins").select("id").eq("user_id", profile.id),
  ]);

  // Marks/echoes received: count rows in stars/reposts where target_id is one of the user's content
  const allOwnedIds = [
    ...((storyIdsResp.data || []).map((r) => r.id)),
    ...((listIdsResp.data || []).map((r) => r.id)),
    ...((chartIdsResp.data || []).map((r) => r.id)),
    ...((lyricIdsResp.data || []).map((r) => r.id)),
  ];

  let marksReceived = 0;
  let echoesReceived = 0;
  if (allOwnedIds.length > 0) {
    const [{ count: m }, { count: e }] = await Promise.all([
      supabase.from("stars").select("id", { count: "exact", head: true }).in("target_id", allOwnedIds),
      supabase.from("reposts").select("id", { count: "exact", head: true }).in("target_id", allOwnedIds),
    ]);
    marksReceived = m || 0;
    echoesReceived = e || 0;
  }

  return {
    profile,
    ratings: ratings || [],
    songRatings: songRatings || [],
    counts: {
      stories: storyCount || 0,
      lyricPins: lyricCount || 0,
      lists: listCount || 0,
      charts: chartCount || 0,
      marksGiven: marksGiven || 0,
      marksReceived,
      echoesGiven: echoesGiven || 0,
      echoesReceived,
    },
  };
}

export default async function StatsPage({ params }: Props) {
  const { username } = await params;
  const data = await getStatsData(username);
  if (!data) notFound();

  const displayName = data.profile.display_name || data.profile.username;

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <div className="mb-12 sm:mb-16">
        <Link href={`/${data.profile.username}`} className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-accent transition-colors">
          ← @{data.profile.username}
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mt-4">
          {displayName}&apos;s portrait.
        </h1>
        <p className="text-zinc-500 text-sm mt-3 italic editorial max-w-md">
          A magazine-grade reading of who they are, generated entirely from what they&apos;ve chosen.
        </p>
      </div>

      <IdentityStats
        username={data.profile.username}
        displayName={displayName}
        ratings={JSON.parse(JSON.stringify(data.ratings))}
        songRatings={JSON.parse(JSON.stringify(data.songRatings))}
        counts={data.counts}
      />
    </main>
  );
}
