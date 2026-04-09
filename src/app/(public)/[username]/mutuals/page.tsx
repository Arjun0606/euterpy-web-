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
  return { title: `Mutuals with @${username}` };
}

/**
 * Mutuals — the people you and the profile owner both follow.
 * Only meaningful when the viewer is signed in AND viewing someone
 * else's profile. Otherwise renders a polite empty state.
 *
 * The previous version was a tiny inline row of avatars on the
 * profile header. This is the dedicated screen — magazine-grade
 * portraits of every shared connection, using the same FollowList
 * component as the followers / following pages so the visual
 * grammar is consistent.
 */
export default async function MutualsPage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .single();
  if (!profile) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  let mutuals: any[] = [];
  if (user && user.id !== profile.id) {
    // Step 1: who does the viewer follow?
    const { data: viewerFollows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const viewerFollowingIds = (viewerFollows || []).map((f) => f.following_id);

    if (viewerFollowingIds.length > 0) {
      // Step 2: which of those people also follow the profile owner?
      const { data: theyFollow } = await supabase
        .from("follows")
        .select("follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio, album_count)")
        .eq("following_id", profile.id)
        .in("follower_id", viewerFollowingIds);
      mutuals = (theyFollow || []).map((row: any) => row.profiles).filter(Boolean);
    }
  }

  const isViewingSelf = user?.id === profile.id;
  const isAnonymous = !user;

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="mb-10">
        <Link
          href={`/${profile.username}`}
          className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors uppercase tracking-[0.18em]"
        >
          ← @{profile.username}
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mt-3">
          Mutuals <span className="text-zinc-600">· {mutuals.length}</span>
        </h1>
        <p className="text-sm text-zinc-500 italic editorial mt-3 max-w-md">
          The people you and {profile.display_name || profile.username} both keep close.
        </p>
      </div>

      {isAnonymous ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="font-display text-2xl mb-3">Sign in to see your shared circle.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-accent text-white text-xs font-medium rounded-full hover:bg-accent-hover transition-colors"
          >
            Log in
          </Link>
        </div>
      ) : isViewingSelf ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="font-display text-2xl mb-2">This is your own page.</p>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Mutuals show up when you visit someone else&apos;s profile.
          </p>
        </div>
      ) : (
        <FollowList
          users={mutuals}
          currentUserId={user?.id || null}
          emptyMessage="No mutuals yet."
        />
      )}
    </div>
  );
}
