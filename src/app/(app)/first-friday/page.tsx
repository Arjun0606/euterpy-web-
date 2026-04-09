import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import {
  isFirstFriday,
  nextFirstFridayLabel,
  daysUntilNextFirstFriday,
  todayStartISO,
  tomorrowStartISO,
} from "@/lib/firstFriday";

export const metadata: Metadata = {
  title: "First Friday — Euterpy",
  description:
    "Once a month, everyone on Euterpy is invited to revisit their three. The whole room, on the same day.",
};

export const dynamic = "force-dynamic";

function art(url: string | null, size = 400): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

/**
 * /first-friday — the dedicated page for Euterpy's monthly ritual.
 *
 * Two states:
 *
 *   IS first friday today:
 *     - Hero: "Today is First Friday."
 *     - Friends section: every person you follow who updated their
 *       three today, with their three covers shown side by side.
 *     - The room section: a sample of recent updates from across
 *       the platform (people you don't follow), so the page never
 *       feels empty even on day one.
 *     - Explainer at the bottom for newcomers.
 *
 *   IS NOT first friday today:
 *     - Hero: "First Friday is [date]." with a countdown.
 *     - Explainer block, framed as a tradition the user can opt into.
 *     - A small "what changed last month" gallery of any updates
 *       from the most recent first friday — proof the ritual exists.
 */
export default async function FirstFridayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = isFirstFriday();

  // Following list — for the "friends today" section.
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = (follows || []).map((f) => f.following_id);

  // Friends who updated their three today (only if today is the day).
  let friendUpdates: any[] = [];
  if (today && followingIds.length > 0) {
    // Fetch every GTKM row updated today by someone the user follows.
    // Group them by user so we can render one card per friend with
    // all 3 covers in position order.
    const { data: rows } = await supabase
      .from("get_to_know_me")
      .select("user_id, position, updated_at, story, albums(apple_id, title, artist_name, artwork_url), profiles!get_to_know_me_user_id_fkey(username, display_name, avatar_url)")
      .in("user_id", followingIds)
      .gte("updated_at", todayStartISO())
      .lt("updated_at", tomorrowStartISO());

    const byUser = new Map<string, any>();
    for (const row of (rows || []) as any[]) {
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, {
          user_id: row.user_id,
          profile: row.profiles,
          slots: [null, null, null] as any[],
          latestUpdate: row.updated_at,
        });
      }
      const entry = byUser.get(row.user_id)!;
      const idx = (row.position || 1) - 1;
      if (idx >= 0 && idx < 3) entry.slots[idx] = { albums: row.albums, story: row.story };
      if (row.updated_at > entry.latestUpdate) entry.latestUpdate = row.updated_at;
    }
    friendUpdates = Array.from(byUser.values()).sort(
      (a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime()
    );
  }

  // The room — a sample of platform-wide updates from anyone today.
  // Excludes the current user and people they already follow (to keep
  // discovery distinct from the friends section).
  let roomUpdates: any[] = [];
  if (today) {
    const excludeIds = [user.id, ...followingIds];
    const { data: rows } = await supabase
      .from("get_to_know_me")
      .select("user_id, position, updated_at, albums(apple_id, title, artist_name, artwork_url), profiles!get_to_know_me_user_id_fkey(username, display_name, avatar_url)")
      .gte("updated_at", todayStartISO())
      .lt("updated_at", tomorrowStartISO())
      .not("user_id", "in", `(${excludeIds.map((id) => `"${id}"`).join(",")})`)
      .limit(60);

    const byUser = new Map<string, any>();
    for (const row of (rows || []) as any[]) {
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, {
          user_id: row.user_id,
          profile: row.profiles,
          slots: [null, null, null] as any[],
          latestUpdate: row.updated_at,
        });
      }
      const entry = byUser.get(row.user_id)!;
      const idx = (row.position || 1) - 1;
      if (idx >= 0 && idx < 3) entry.slots[idx] = { albums: row.albums };
      if (row.updated_at > entry.latestUpdate) entry.latestUpdate = row.updated_at;
    }
    roomUpdates = Array.from(byUser.values())
      .sort((a, b) => new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime())
      .slice(0, 12);
  }

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      {/* HERO */}
      <header className="mb-14 sm:mb-20">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent font-semibold mb-5">
          — A Euterpy holiday
        </p>
        <h1 className="font-display text-5xl sm:text-7xl tracking-tighter leading-[0.92] mb-6">
          {today ? (
            <>
              The room is <span className="italic text-accent">visiting its three.</span>
            </>
          ) : (
            <>
              The next visit is{" "}
              <span className="italic text-accent">{nextFirstFridayLabel().toLowerCase()}.</span>
            </>
          )}
        </h1>
        <p className="editorial italic text-lg sm:text-xl text-zinc-400 leading-[1.65] max-w-2xl">
          {today ? (
            <>
              First Friday. The one day a month everyone on Euterpy looks at
              their own pages again — keeps what still belongs, swaps what
              doesn&apos;t. The room is here together, all day.
            </>
          ) : (
            <>
              First Friday is the one day a month everyone on Euterpy looks at
              their own pages again. The next one is in{" "}
              <span className="not-italic text-foreground font-medium">
                {daysUntilNextFirstFriday()}{" "}
                {daysUntilNextFirstFriday() === 1 ? "day" : "days"}
              </span>
              . You don&apos;t have to do anything. You&apos;re welcome to come.
            </>
          )}
        </p>
        {today && (
          <div className="mt-8">
            <Link
              href="/gtkm"
              className="inline-flex items-center px-7 py-3.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors"
            >
              Visit your three →
            </Link>
          </div>
        )}
      </header>

      {/* FRIENDS UPDATED TODAY */}
      {today && friendUpdates.length > 0 && (
        <section className="mb-20">
          <p className="text-[10px] uppercase tracking-[0.22em] text-accent font-semibold mb-6">
            — From the people you follow
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {friendUpdates.map((entry) => (
              <FriendCard key={entry.user_id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* THE ROOM */}
      {today && roomUpdates.length > 0 && (
        <section className="mb-20">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600 font-semibold mb-6">
            — Across the room today
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {roomUpdates.map((entry) => (
              <FriendCard key={entry.user_id} entry={entry} compact />
            ))}
          </div>
        </section>
      )}

      {/* EMPTY-DAY EXPLAINER */}
      {today && friendUpdates.length === 0 && roomUpdates.length === 0 && (
        <section className="mb-20 py-14 px-8 border border-dashed border-border rounded-3xl text-center">
          <p className="font-display text-2xl mb-3">
            You&apos;re early. Be the first one in the room.
          </p>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6 italic editorial">
            Visit your three. The room is filling up all day.
          </p>
          <Link
            href="/gtkm"
            className="inline-flex items-center px-6 py-2.5 bg-accent text-white text-xs font-semibold rounded-full hover:bg-accent-hover transition-colors"
          >
            Go to your three →
          </Link>
        </section>
      )}

      {/* WHAT IS THIS — explainer block, always shown */}
      <section className="border-t border-border pt-14 sm:pt-20">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600 font-semibold mb-5">
          — What this is
        </p>
        <div className="grid gap-8 sm:grid-cols-3 max-w-5xl">
          <div>
            <p className="font-display text-2xl tracking-tight mb-3">A date that exists.</p>
            <p className="text-sm text-zinc-500 leading-relaxed editorial italic">
              Not a notification. Not a streak. The first Friday of every month, everyone is here doing the same gesture.
            </p>
          </div>
          <div>
            <p className="font-display text-2xl tracking-tight mb-3">Voluntary.</p>
            <p className="text-sm text-zinc-500 leading-relaxed editorial italic">
              You can ignore it forever and lose nothing. The point is the room knows it&apos;s here, not that you&apos;re forced to participate.
            </p>
          </div>
          <div>
            <p className="font-display text-2xl tracking-tight mb-3">Collective.</p>
            <p className="text-sm text-zinc-500 leading-relaxed editorial italic">
              Bandcamp Friday works because it&apos;s a holiday, not a prompt. So does this. The ritual is shared by everyone or it&apos;s nothing.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function FriendCard({ entry, compact = false }: { entry: any; compact?: boolean }) {
  const profile = entry.profile || {};
  const slots = entry.slots as { albums?: any; story?: string }[];
  const coverSize = compact ? 90 : 130;

  // Time since last update — used in the friends section.
  const updatedAt = entry.latestUpdate ? new Date(entry.latestUpdate) : null;
  const now = new Date();
  let updateLabel = "";
  if (updatedAt) {
    const minutesAgo = Math.floor((now.getTime() - updatedAt.getTime()) / 60000);
    if (minutesAgo < 1) updateLabel = "just now";
    else if (minutesAgo < 60) updateLabel = `${minutesAgo}m ago`;
    else updateLabel = `${Math.floor(minutesAgo / 60)}h ago`;
  }

  return (
    <Link
      href={`/${profile.username}`}
      className="group block bg-card border border-border rounded-2xl p-5 hover:border-accent/40 hover:bg-card/80 transition-all"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden flex items-center justify-center text-xs text-zinc-600 shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (profile.username || "?")[0]?.toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
            {profile.display_name || profile.username}
          </p>
          <p className="text-[10px] text-zinc-600">@{profile.username}</p>
        </div>
        {updateLabel && !compact && (
          <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600 italic shrink-0">
            {updateLabel}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => {
          const slot = slots[i];
          const cover = art(slot?.albums?.artwork_url || null, coverSize * 2);
          return (
            <div
              key={i}
              className="flex-1 aspect-square rounded-md overflow-hidden bg-background border border-border group-hover:border-zinc-700 transition-colors"
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={slot?.albums?.title || ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-800 text-2xl">♪</div>
              )}
            </div>
          );
        })}
      </div>
    </Link>
  );
}
