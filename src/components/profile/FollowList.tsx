import Link from "next/link";
import FollowButton from "@/components/ui/FollowButton";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { createServiceClient } from "@/lib/supabase/server";

interface UserItem {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  album_count: number;
}

interface Props {
  users: UserItem[];
  currentUserId: string | null;
  emptyMessage?: string;
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

/**
 * The follower / following / mutuals list, magazine-grade.
 *
 * The previous version was a generic avatar + bio + button row. The
 * constitution is "show the work" — that applies to people too. Each
 * row now also shows the person's three GTKM covers as a tiny strip
 * on the right, so the list reads like a contact sheet of curators
 * rather than a directory of accounts. If a user has no GTKM picks
 * yet, that strip is just empty space (no fake placeholders).
 *
 * Server component because it needs to fetch GTKM covers for every
 * user in one batched query — no client-side waterfall.
 */
export default async function FollowList({ users, currentUserId, emptyMessage = "Nobody yet." }: Props) {
  if (users.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-border rounded-2xl">
        <p className="font-display text-2xl mb-2">{emptyMessage}</p>
      </div>
    );
  }

  // Batch-fetch GTKM covers for everyone in this list. Service client to
  // bypass RLS — these are public-facing display lists.
  const supabase = createServiceClient();
  const userIds = users.map((u) => u.id);
  const { data: gtkmRows } = await supabase
    .from("get_to_know_me")
    .select("user_id, position, albums(artwork_url)")
    .in("user_id", userIds)
    .order("position");

  // Group GTKM covers by user_id, in position order.
  const coversByUser = new Map<string, (string | null)[]>();
  for (const row of (gtkmRows || []) as any[]) {
    const url = row.albums?.artwork_url || null;
    if (!coversByUser.has(row.user_id)) coversByUser.set(row.user_id, []);
    coversByUser.get(row.user_id)!.push(url);
  }

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const covers = coversByUser.get(user.id) || [];
        return (
          <div
            key={user.id}
            className="group flex items-stretch gap-5 p-5 bg-card border border-border rounded-2xl hover:border-accent/30 transition-colors"
          >
            {/* Avatar */}
            <Link href={`/${user.username}`} className="shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-background border border-border flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-xl text-zinc-600">{user.username[0].toUpperCase()}</span>
                )}
              </div>
            </Link>

            {/* Identity */}
            <Link href={`/${user.username}`} className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="font-display text-lg sm:text-xl tracking-tight truncate group-hover:text-accent transition-colors">
                {user.display_name || user.username}
              </p>
              <p className="text-[11px] text-accent mb-1">@{user.username}</p>
              {user.bio && (
                <p className="text-xs text-zinc-500 italic editorial line-clamp-1 max-w-md">{user.bio}</p>
              )}
            </Link>

            {/* GTKM covers — the work */}
            {covers.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                {[0, 1, 2].map((i) => {
                  const cover = art(covers[i] || null, 120);
                  return (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-md overflow-hidden bg-background border border-border"
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Follow button */}
            <div className="shrink-0 flex items-center">
              {currentUserId && currentUserId !== user.id && (
                <FollowButton targetUserId={user.id} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
