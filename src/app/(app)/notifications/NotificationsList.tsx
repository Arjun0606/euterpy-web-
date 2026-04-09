"use client";

import Link from "next/link";
import { renderNotification, timeAgo } from "@/lib/notifications/copy";

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

export default function NotificationsList({ initial }: { initial: Notification[] }) {
  if (initial.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-2xl mb-2">No letters yet.</p>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto">
          When someone keeps your work, carries it into their own, or writes you a letter — you&apos;ll find it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {initial.map((n) => {
        const actorName = n.actor?.display_name || n.actor?.username || "Someone";
        const actorInitial = n.actor?.username?.[0]?.toUpperCase() || "?";
        const { message, href } = renderNotification(n);

        return (
          <Link
            key={n.id}
            href={href}
            className={`flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-card-hover ${
              !n.is_read ? "bg-accent/5 border border-accent/10" : "border border-transparent"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-sm text-muted shrink-0 overflow-hidden">
              {n.actor?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.actor.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                actorInitial
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] leading-snug">
                <span className="font-medium text-foreground">{actorName}</span>{" "}
                <span className="text-zinc-400 italic editorial">{message}</span>
              </p>
              <p className="text-[11px] text-zinc-600 mt-1">{timeAgo(n.created_at)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
