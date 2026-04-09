"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Fetch unread count
  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      setUnreadCount(count || 0);
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);

    const { data } = await supabase
      .from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications(data || []);
    setLoading(false);

    // Mark all as read
    if (unreadCount > 0) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      setUnreadCount(0);
    }
  }

  function renderRow(n: Notification) {
    const actorName = n.actor?.display_name || n.actor?.username || "Someone";
    const actorInitial = n.actor?.username?.[0]?.toUpperCase() || "?";
    const { message, href } = renderNotification(n);

    return (
      <Link
        key={n.id}
        href={href}
        onClick={() => setOpen(false)}
        className={`flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-card-hover ${!n.is_read ? "bg-accent/5" : ""}`}
      >
        <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs text-muted shrink-0 overflow-hidden">
          {n.actor?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.actor.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            actorInitial
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-snug">
            <span className="font-medium text-foreground">{actorName}</span>{" "}
            <span className="text-zinc-400 italic editorial">{message}</span>
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(n.created_at)}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative text-muted hover:text-foreground transition-colors p-1"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto bg-black/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-accent hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-foreground font-medium">No letters yet.</p>
              <p className="text-xs text-zinc-500 mt-1 italic">When someone keeps your work, you&apos;ll find it here.</p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map(renderRow)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

