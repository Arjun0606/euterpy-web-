"use client";

import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  actor_id: string | null;
  data: any;
  is_read: boolean;
  created_at: string;
  actor?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsList({ initial }: { initial: Notification[] }) {
  if (initial.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted">No notifications yet.</p>
        <p className="text-sm text-muted/60 mt-2">When people follow you, vote on your reviews, or interact with your profile, you&apos;ll see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {initial.map((n) => {
        const actorName = n.actor?.display_name || n.actor?.username || "Someone";
        const actorInitial = n.actor?.username?.[0]?.toUpperCase() || "?";

        let message = "";
        let href = "/";

        switch (n.type) {
          case "follow":
            message = "started following you";
            href = `/${n.actor?.username}`;
            break;
          case "follow_request":
            message = "requested to follow you";
            href = "/settings";
            break;
          case "review_vote":
            message = `${n.data?.vote_type === "up" ? "upvoted" : "downvoted"} your review`;
            href = n.data?.album_apple_id ? `/album/${n.data.album_apple_id}` : "/";
            break;
          case "badge_earned":
            message = `You earned the "${n.data?.badge_name}" badge!`;
            href = "/";
            break;
          default:
            message = "interacted with your profile";
        }

        return (
          <Link
            key={n.id}
            href={href}
            className={`flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-card-hover ${!n.is_read ? "bg-accent/5 border border-accent/10" : "border border-transparent"}`}
          >
            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-sm text-muted shrink-0">
              {n.actor?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.actor.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                actorInitial
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{actorName}</span>{" "}
                <span className="text-muted">{message}</span>
              </p>
              <p className="text-xs text-muted/50 mt-1">{getTimeAgo(n.created_at)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
