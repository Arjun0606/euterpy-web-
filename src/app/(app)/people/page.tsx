import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PeopleSearch from "@/components/profile/PeopleSearch";

export const metadata = { title: "People" };
export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Who I follow
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = new Set((follows || []).map((f) => f.following_id));

  // === DATA FETCHES ===

  // Rising voices — users whose stories got the most marks in the past 7 days
  let risingVoices: any[] = [];
  {
    const { data: recentStories } = await supabase
      .from("stories")
      .select("id, user_id, profiles(id, username, display_name, avatar_url, bio)")
      .gte("created_at", weekAgo)
      .neq("user_id", user.id);

    if (recentStories && recentStories.length > 0) {
      const storyIds = recentStories.map((s: any) => s.id);
      const { data: marks } = await supabase
        .from("stars")
        .select("target_id")
        .eq("kind", "story")
        .in("target_id", storyIds);
      const markCounts = new Map<string, number>();
      for (const m of (marks || []) as any[]) {
        markCounts.set(m.target_id, (markCounts.get(m.target_id) || 0) + 1);
      }
      // Aggregate marks per user
      const userScores = new Map<string, { profile: any; marks: number }>();
      for (const s of recentStories as any[]) {
        const score = markCounts.get(s.id) || 0;
        if (score === 0) continue;
        const current = userScores.get(s.user_id);
        if (current) {
          current.marks += score;
        } else if (s.profiles) {
          userScores.set(s.user_id, { profile: s.profiles, marks: score });
        }
      }
      risingVoices = Array.from(userScores.values())
        .sort((a, b) => b.marks - a.marks)
        .slice(0, 8)
        .map((v) => ({ ...v.profile, _marks: v.marks }));
    }
  }

  // People with your taste — users who collected at least 3 albums you also collected
  let tasteMatches: any[] = [];
  {
    const { data: myRatings } = await supabase
      .from("ratings")
      .select("album_id")
      .eq("user_id", user.id);
    const myAlbumIds = (myRatings || []).map((r) => r.album_id).slice(0, 100);

    if (myAlbumIds.length > 0) {
      const { data: others } = await supabase
        .from("ratings")
        .select("user_id, profiles(id, username, display_name, avatar_url, bio)")
        .in("album_id", myAlbumIds)
        .neq("user_id", user.id)
        .limit(200);

      const overlaps = new Map<string, { count: number; profile: any }>();
      for (const r of (others || []) as any[]) {
        if (!r.profiles) continue;
        const cur = overlaps.get(r.user_id);
        if (cur) cur.count++;
        else overlaps.set(r.user_id, { count: 1, profile: r.profiles });
      }
      tasteMatches = Array.from(overlaps.values())
        .filter((o) => o.count >= 3)
        .sort((a, b) => b.count - a.count)
        .slice(0, 12)
        .map((o) => ({ ...o.profile, _overlap: o.count }));
    }
  }

  // Friends of friends — people followed by people you follow, that you don't follow
  let friendsOfFriends: any[] = [];
  if (followingIds.size > 0) {
    const { data: theirFollows } = await supabase
      .from("follows")
      .select("following_id, profiles!follows_following_id_fkey(id, username, display_name, avatar_url, bio)")
      .in("follower_id", Array.from(followingIds))
      .limit(200);

    const seen = new Map<string, { profile: any; count: number }>();
    for (const r of (theirFollows || []) as any[]) {
      if (!r.profiles) continue;
      if (r.following_id === user.id) continue;
      if (followingIds.has(r.following_id)) continue;
      const cur = seen.get(r.following_id);
      if (cur) cur.count++;
      else seen.set(r.following_id, { profile: r.profiles, count: 1 });
    }
    friendsOfFriends = Array.from(seen.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((v) => ({ ...v.profile, _mutuals: v.count }));
  }

  // Active curators — fallback when none of the above have content
  const { data: activeCurators } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, album_count")
    .gt("album_count", 0)
    .neq("id", user.id)
    .order("updated_at", { ascending: false })
    .limit(12);

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">— The room</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">
          People with <span className="italic text-accent">taste.</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-3 max-w-md">
          Music nerds, critics, friends, legends. The curators across the world building an identity here.
        </p>
      </div>

      {/* Search */}
      <PeopleSearch />

      {/* === RISING VOICES === */}
      {risingVoices.length > 0 && (
        <section className="mb-14">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-1">— This week</p>
            <h2 className="font-display text-3xl tracking-tight">Rising voices.</h2>
            <p className="text-sm text-zinc-500 mt-1">Writers whose stories are being marked the most right now.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {risingVoices.map((v: any) => (
              <PersonCard
                key={v.id}
                person={v}
                subtitle={`${v._marks} ${v._marks === 1 ? "mark" : "marks"} this week`}
              />
            ))}
          </div>
        </section>
      )}

      {/* === TASTE MATCH === */}
      {tasteMatches.length > 0 && (
        <section className="mb-14">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-1">— Your taste</p>
            <h2 className="font-display text-3xl tracking-tight">People who hear what you hear.</h2>
            <p className="text-sm text-zinc-500 mt-1">Curators with the most overlap with your collection.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasteMatches.map((v: any) => (
              <PersonCard
                key={v.id}
                person={v}
                subtitle={`${v._overlap} albums in common`}
              />
            ))}
          </div>
        </section>
      )}

      {/* === FRIENDS OF FRIENDS === */}
      {friendsOfFriends.length > 0 && (
        <section className="mb-14">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-1">— Mutuals</p>
            <h2 className="font-display text-3xl tracking-tight">Friends of friends.</h2>
            <p className="text-sm text-zinc-500 mt-1">People your follows already trust.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {friendsOfFriends.map((v: any) => (
              <PersonCard
                key={v.id}
                person={v}
                subtitle={`Followed by ${v._mutuals} you follow`}
              />
            ))}
          </div>
        </section>
      )}

      {/* === ACTIVE CURATORS — fallback === */}
      {activeCurators && activeCurators.length > 0 && tasteMatches.length === 0 && risingVoices.length === 0 && (
        <section className="mb-14">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-1">— Active</p>
            <h2 className="font-display text-3xl tracking-tight">Active curators.</h2>
            <p className="text-sm text-zinc-500 mt-1">People building their pages right now.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeCurators.map((v: any) => <PersonCard key={v.id} person={v} subtitle={`@${v.username}`} />)}
          </div>
        </section>
      )}

    </main>
  );
}

// Reusable card
function PersonCard({ person, subtitle }: { person: any; subtitle: string }) {
  return (
    <Link
      href={`/${person.username}`}
      className="group bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors flex items-center gap-4"
    >
      <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center text-base text-zinc-500 overflow-hidden shrink-0">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          person.username[0].toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate group-hover:text-accent transition-colors">
          {person.display_name || person.username}
        </p>
        <p className="text-[11px] text-accent truncate">@{person.username}</p>
        {person.bio && <p className="text-[11px] text-zinc-500 line-clamp-1 mt-1 italic editorial">{person.bio}</p>}
        <p className="text-[10px] text-zinc-700 mt-1">{subtitle}</p>
      </div>
    </Link>
  );
}
