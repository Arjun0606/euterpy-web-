"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  targetUserId: string;
}

export default function TasteMatch({ targetUserId }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || user.id === targetUserId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("calculate_taste_match", {
        user_a: user.id,
        user_b: targetUserId,
      });

      if (!error && data !== null) {
        setScore(Math.round(data));
      }
      setLoading(false);
    });
  }, [targetUserId]);

  if (loading || score === null) return null;

  const color =
    score >= 75 ? "text-green-400" :
    score >= 50 ? "text-accent" :
    score >= 25 ? "text-yellow-400" :
    "text-muted";

  const label =
    score >= 75 ? "Taste twins" :
    score >= 50 ? "Good match" :
    score >= 25 ? "Some overlap" :
    "Different vibes";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full">
      <span className={`text-sm font-semibold ${color}`}>{score}%</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
