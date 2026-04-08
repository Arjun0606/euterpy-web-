"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  appleId: string;
  kind: "song" | "album";
  title: string;
  artist: string;
  artworkUrl: string | null;
  setAt: string;
  isOwner: boolean;
}

function timeAgo(setAt: string): string {
  const ms = Date.now() - new Date(setAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return "expired";
}

export default function NowPlayingPill({ appleId, kind, title, artist, artworkUrl, setAt, isOwner }: Props) {
  const [hidden, setHidden] = useState(false);
  const [label, setLabel] = useState(timeAgo(setAt));

  useEffect(() => {
    const i = setInterval(() => setLabel(timeAgo(setAt)), 60_000);
    return () => clearInterval(i);
  }, [setAt]);

  // Expired? Don't render.
  const ageHours = (Date.now() - new Date(setAt).getTime()) / (1000 * 60 * 60);
  if (hidden || ageHours >= 24) return null;

  async function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isOwner) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({
          now_playing_apple_id: null,
          now_playing_kind: null,
          now_playing_title: null,
          now_playing_artist: null,
          now_playing_artwork_url: null,
          now_playing_set_at: null,
        })
        .eq("id", user.id);
      setHidden(true);
      toast("Now playing cleared");
    } catch {
      toast.error("Couldn't clear");
    }
  }

  const href = kind === "song" ? `/song/${appleId}` : `/album/${appleId}`;

  return (
    <div className="mb-5 group relative">
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-accent/[0.08] to-transparent border border-accent/20 rounded-xl hover:border-accent/40 transition-colors"
      >
        {artworkUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artworkUrl} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
            </span>
            <p className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold">Now playing</p>
            <span className="text-[10px] text-zinc-600">· {label}</span>
          </div>
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-zinc-500 truncate">{artist}</p>
        </div>
        {isOwner && (
          <button
            onClick={handleClear}
            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs px-2 transition-all"
            aria-label="Clear now playing"
          >
            ✕
          </button>
        )}
      </Link>
    </div>
  );
}
