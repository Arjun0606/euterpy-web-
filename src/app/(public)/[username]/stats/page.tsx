import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatsView from "@/components/stats/StatsView";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s Stats`,
    description: `Music taste stats for @${username} on Euterpy.`,
  };
}

async function getStatsData(username: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) return null;

  // Get all album ratings with album data
  const { data: ratings } = await supabase
    .from("ratings")
    .select("*, albums(*)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  // Get all song ratings with song data
  const { data: songRatings } = await supabase
    .from("song_ratings")
    .select("*, songs(*)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return {
    profile,
    ratings: ratings || [],
    songRatings: songRatings || [],
  };
}

export default async function StatsPage({ params }: Props) {
  const { username } = await params;
  const data = await getStatsData(username);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <a
            href={`/${data.profile.username}`}
            className="text-accent text-sm hover:underline"
          >
            ← @{data.profile.username}
          </a>
          <h1 className="text-3xl font-display mt-2">
            {data.profile.display_name || data.profile.username}&apos;s Stats
          </h1>
          <p className="text-muted text-sm mt-1">
            {data.profile.album_count} albums · {data.songRatings.length} songs
            rated
          </p>
        </div>

        <StatsView
          ratings={JSON.parse(JSON.stringify(data.ratings))}
          songRatings={JSON.parse(JSON.stringify(data.songRatings))}
        />
      </div>
    </div>
  );
}
