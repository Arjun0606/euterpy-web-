"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  ratingId: string;
  initialCount: number;
}

export default function LikeButton({ ratingId, initialCount }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("rating_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("rating_id", ratingId)
        .single();
      if (data) setLiked(true);
    });
  }, [ratingId]);

  async function handleToggle() {
    if (!userId) return;

    if (liked) {
      setLiked(false);
      setCount((c) => c - 1);
      await supabase.from("rating_likes").delete().eq("user_id", userId).eq("rating_id", ratingId);
    } else {
      setLiked(true);
      setCount((c) => c + 1);
      await supabase.from("rating_likes").insert({ user_id: userId, rating_id: ratingId });
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1 text-xs transition-colors ${
        liked ? "text-accent" : "text-muted/40 hover:text-accent/60"
      }`}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
