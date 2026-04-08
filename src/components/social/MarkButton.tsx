"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  kind: "story" | "list" | "chart" | "lyric";
  targetId: string;
  ownerId?: string;
  initialCount?: number;
  initialMarked?: boolean;
  size?: "sm" | "md";
}

/**
 * MARK — Euterpy's validation primitive. Replaces the generic
 * heart/star icon with an editorial typographic chip.
 * Backend table is 'stars' for stability; UI calls it Mark.
 */
export default function MarkButton({
  kind,
  targetId,
  ownerId,
  initialCount = 0,
  initialMarked = false,
  size = "md",
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [marked, setMarked] = useState(initialMarked);
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
      supabase
        .from("stars")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("target_id", targetId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMarked(true);
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

    if (marked) {
      setMarked(false);
      setCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("stars")
        .delete()
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("target_id", targetId);
      if (error) {
        setMarked(true);
        setCount((c) => c + 1);
        toast.error("Couldn't unmark");
      }
    } else {
      setMarked(true);
      setCount((c) => c + 1);
      const { error } = await supabase
        .from("stars")
        .insert({ user_id: user.id, kind, target_id: targetId });
      if (error) {
        setMarked(false);
        setCount((c) => Math.max(0, c - 1));
        if (error.code !== "23505") toast.error("Couldn't mark");
      } else if (ownerId && ownerId !== user.id) {
        // Fire a notification to the owner — silent on failure
        await supabase.from("notifications").insert({
          user_id: ownerId,
          actor_id: user.id,
          type: "mark",
          data: { kind, target_id: targetId },
        });
      }
    }
    setLoading(false);
  }

  const padding = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1";
  const fontSize = size === "md" ? "text-[10px]" : "text-[9px]";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-baseline gap-1.5 ${padding} rounded-full border transition-all uppercase tracking-[0.18em] font-semibold ${fontSize} ${
        marked
          ? "bg-accent border-accent text-white"
          : "bg-transparent border-border text-zinc-500 hover:text-accent hover:border-accent/40"
      }`}
      aria-label={marked ? "Unmark" : "Mark"}
      title={marked ? "Marked" : "Mark this"}
    >
      <span>{marked ? "Marked" : "Mark"}</span>
      <span className={`tabular-nums ${marked ? "text-white/70" : "text-zinc-700"}`}>· {count}</span>
    </button>
  );
}
