"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  kind: "story" | "list" | "chart" | "lyric";
  targetId: string;
  initialCount?: number;
  size?: "sm" | "md";
}

/**
 * Repost — the amplification primitive. Same surface as StarButton
 * but with an optional comment when reposting (Substack restack pattern).
 * Reposted content shows up in the reposter's followers' feeds.
 */
export default function RepostButton({
  kind,
  targetId,
  initialCount = 0,
  size = "md",
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [reposted, setReposted] = useState(false);
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
          if (data) setReposted(true);
        });
    });
  }, [kind, targetId]);

  async function handleClick() {
    if (loading) return;
    if (authed === false) {
      window.location.href = "/signup";
      return;
    }
    if (reposted) {
      // Unrepost immediately, no confirm
      await unrepost();
      return;
    }
    // Open composer for the comment
    setComposerOpen(true);
  }

  async function unrepost() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setReposted(false);
    setCount((c) => Math.max(0, c - 1));
    const { error } = await supabase
      .from("reposts")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("target_id", targetId);
    if (error) {
      setReposted(true);
      setCount((c) => c + 1);
      toast.error("Couldn't unrepost");
    } else {
      toast("Unposted");
    }
    setLoading(false);
  }

  async function repost() {
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
      if (error.code !== "23505") toast.error("Couldn't repost");
    } else {
      setReposted(true);
      setCount((c) => c + 1);
      setComposerOpen(false);
      setComment("");
      toast("Reposted to your followers");
    }
    setLoading(false);
  }

  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const padding = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1";
  const fontSize = size === "md" ? "text-xs" : "text-[11px]";

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 ${padding} rounded-full border transition-all ${fontSize} ${
          reposted
            ? "bg-accent/10 border-accent/40 text-accent"
            : "bg-card border-border text-zinc-500 hover:text-accent hover:border-accent/40"
        }`}
        aria-label={reposted ? "Unrepost" : "Repost"}
        title={reposted ? "Unrepost" : "Repost to your followers"}
      >
        <svg viewBox="0 0 24 24" className={iconSize} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <span className="tabular-nums">{count}</span>
      </button>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => !loading && setComposerOpen(false)}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">— Repost</p>
            <p className="font-display text-2xl tracking-tight mb-5">Add your voice (optional)</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder="Why is this worth reading?"
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
                onClick={repost}
                disabled={loading}
                className="flex-1 py-3 bg-accent text-white rounded-full text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-30"
              >
                {loading ? "Reposting..." : "Repost"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
