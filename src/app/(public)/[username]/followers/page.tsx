import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FollowList from "@/components/profile/FollowList";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `Followers of @${username}` };
}

export default async function FollowersPage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .single();
  if (!profile) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: follows } = await supabase
    .from("follows")
    .select("follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio, album_count)")
    .eq("following_id", profile.id)
    .order("created_at", { ascending: false });

  const followers = (follows || []).map((f: any) => f.follower).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <Link href={`/${profile.username}`} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors uppercase tracking-[0.18em]">
          ← @{profile.username}
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mt-3">
          Followers <span className="text-zinc-600">· {followers.length}</span>
        </h1>
      </div>

      <FollowList users={followers} currentUserId={user?.id || null} emptyMessage={`@${profile.username} has no followers yet.`} />
    </div>
  );
}
