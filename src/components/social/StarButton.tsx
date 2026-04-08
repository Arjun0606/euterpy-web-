"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  kind: "story" | "list" | "chart" | "lyric";
  targetId: string;
  initialCount?: number;
  initialStarred?: boolean;
  size?: "sm" | "md";
}

/**
 * Universal star (validation primitive). Works on stories, lists,
 * charts, and lyric pins. One DB row per (user, kind, target_id).
 */
export default function StarButton({
  kind,
  targetId,
  initialCount = 0,
  initialStarred = false,
  size = "md",
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [starred, setStarred] = useState(initialStarred);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      // Check if this user has already starred
      supabase
        .from("stars")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("target_id", targetId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setStarred(true);
        });
    });
  }, [kind, targetId]);

  async function toggle() {
    if (loading) return;
    if (authed === false) {
      window.location.href = "/signup";
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/signup";
      return;
    }

    if (starred) {
      // Unstar
      setStarred(false);
      setCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("stars")
        .delete()
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("target_id", targetId);
      if (error) {
        // rollback
        setStarred(true);
        setCount((c) => c + 1);
        toast.error("Couldn't unstar");
      }
    } else {
      // Star
      setStarred(true);
      setCount((c) => c + 1);
      const { error } = await supabase
        .from("stars")
        .insert({ user_id: user.id, kind, target_id: targetId });
      if (error) {
        setStarred(false);
        setCount((c) => Math.max(0, c - 1));
        if (error.code !== "23505") toast.error("Couldn't star");
      }
    }
    setLoading(false);
  }

  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const padding = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1";
  const fontSize = size === "md" ? "text-xs" : "text-[11px]";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full border transition-all ${fontSize} ${
        starred
          ? "bg-accent/10 border-accent/40 text-accent"
          : "bg-card border-border text-zinc-500 hover:text-accent hover:border-accent/40"
      }`}
      aria-label={starred ? "Unstar" : "Star"}
      title={starred ? "Unstar" : "Star"}
    >
      <svg viewBox="0 0 24 24" className={iconSize} fill={starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
