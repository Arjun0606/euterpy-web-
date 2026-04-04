"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  targetUserId: string;
  initialFollowing?: boolean;
}

export default function FollowButton({ targetUserId, initialFollowing = false }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        // Check if already following
        supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)
          .single()
          .then(({ data }) => {
            setFollowing(!!data);
          });
      }
    });
  }, [targetUserId]);

  // Don't show button for own profile or unauthenticated
  if (!currentUserId || currentUserId === targetUserId) return null;

  async function handleToggle() {
    if (!currentUserId) return;
    setLoading(true);

    const supabase = createClient();

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      setFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });
      setFollowing(true);
    }

    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
        following
          ? "border border-border text-muted hover:border-red-500/50 hover:text-red-400"
          : "bg-accent text-white hover:bg-accent-hover"
      } disabled:opacity-50`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
