"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  kind: "story" | "list" | "chart" | "lyric";
  targetId: string;
  ownerId?: string;
  initialCount?: number;
  size?: "sm" | "md";
}

/**
 * ECHO — Euterpy's amplification primitive. Replaces the generic
 * retweet/restack icon with an editorial typographic chip.
 * Backend table is 'reposts' for stability; UI calls it Echo.
 *
 * Echoing carries a piece of someone's identity into your followers'
 * feeds, with their attribution intact.
 */
export default function EchoButton({
  kind,
  targetId,
  ownerId,
  initialCount = 0,
  size = "md",
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [echoed, setEchoed] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      supabase
        .from("reposts")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("target_id", targetId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setEchoed(true);
        });
    });
  }, [kind, targetId]);

  async function handleClick() {
    if (loading) return;
    if (authed === false) {
      window.location.href = "/signup";
      return;
    }
    if (echoed) {
      await unecho();
      return;
    }
    setComposerOpen(true);
  }

  async function unecho() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEchoed(false);
    setCount((c) => Math.max(0, c - 1));
    const { error } = await supabase
      .from("reposts")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("target_id", targetId);
    if (error) {
      setEchoed(true);
      setCount((c) => c + 1);
      toast.error("Couldn't unecho");
    } else {
      toast("Unechoed");
    }
    setLoading(false);
  }

  async function echo() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/signup";
      return;
    }
    const { error } = await supabase.from("reposts").insert({
      user_id: user.id,
      kind,
      target_id: targetId,
      comment: comment.trim() || null,
    });
    if (error) {
      if (error.code !== "23505") toast.error("Couldn't echo");
    } else {
      setEchoed(true);
      setCount((c) => c + 1);
      setComposerOpen(false);
      setComment("");
      toast("Echoed to your followers");
      if (ownerId && ownerId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: ownerId,
          actor_id: user.id,
          type: "echo",
          data: { kind, target_id: targetId, comment: comment.trim() || null },
        });
      }
    }
    setLoading(false);
  }

  const padding = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1";
  const fontSize = size === "md" ? "text-[10px]" : "text-[9px]";

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-baseline gap-1.5 ${padding} rounded-full border transition-all uppercase tracking-[0.18em] font-semibold ${fontSize} ${
          echoed
            ? "bg-accent border-accent text-white"
            : "bg-transparent border-border text-zinc-500 hover:text-accent hover:border-accent/40"
        }`}
        aria-label={echoed ? "Unecho" : "Echo"}
        title={echoed ? "Echoed" : "Echo to your followers"}
      >
        <span>{echoed ? "Echoed" : "Echo"}</span>
        <span className={`tabular-nums ${echoed ? "text-white/70" : "text-zinc-700"}`}>· {count}</span>
      </button>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => !loading && setComposerOpen(false)}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">— Echo</p>
            <p className="font-display text-2xl tracking-tight mb-5">Add your voice <span className="text-zinc-700 italic text-base">(optional)</span></p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder="Why is this worth carrying?"
              rows={3}
              autoFocus
              className="editorial w-full bg-input border border-border rounded-2xl p-4 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 resize-none transition-colors"
            />
            <p className="text-right text-[10px] text-zinc-700 tabular-nums mt-1 mb-4">{comment.length} / 500</p>
            <div className="flex gap-3">
              <button
                onClick={() => setComposerOpen(false)}
                disabled={loading}
                className="flex-1 py-3 border border-border text-zinc-500 hover:text-zinc-200 rounded-full text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={echo}
                disabled={loading}
                className="flex-1 py-3 bg-accent text-white rounded-full text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-30"
              >
                {loading ? "Echoing..." : "Echo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
