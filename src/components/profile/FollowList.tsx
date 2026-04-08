import Link from "next/link";
import FollowButton from "@/components/ui/FollowButton";

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

export default function FollowList({ users, currentUserId, emptyMessage = "Nobody yet." }: Props) {
  if (users.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl">
        <p className="text-zinc-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-zinc-700 transition-colors">
          <Link href={`/${user.username}`} className="shrink-0">
            <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-lg text-zinc-600">{user.username[0].toUpperCase()}</span>
              )}
            </div>
          </Link>
          <Link href={`/${user.username}`} className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user.display_name || user.username}</p>
            <p className="text-xs text-accent">@{user.username}</p>
            {user.bio && <p className="text-xs text-zinc-600 truncate mt-0.5">{user.bio}</p>}
          </Link>
          <div className="text-right shrink-0">
            <p className="text-xs text-zinc-600 mb-1">{user.album_count} albums</p>
            {currentUserId && currentUserId !== user.id && (
              <FollowButton targetUserId={user.id} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
