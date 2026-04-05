"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  targetUserId: string;
  initialFollowing?: boolean;
  isPrivate?: boolean;
}

export default function FollowButton({ targetUserId, initialFollowing = false, isPrivate = false }: Props) {
  const [status, setStatus] = useState<"none" | "following" | "requested">("none");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);

      // Check if already following
      const { data: follow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .single();

      if (follow) {
        setStatus("following");
        return;
      }

      // Check if there's a pending follow request
      const { data: request } = await supabase
        .from("follow_requests")
        .select("id, status")
        .eq("requester_id", user.id)
        .eq("target_id", targetUserId)
        .eq("status", "pending")
        .single();

      if (request) {
        setStatus("requested");
      }
    });
  }, [targetUserId]);

  // Don't show button for own profile or unauthenticated
  if (!currentUserId || currentUserId === targetUserId) return null;

  async function handleToggle() {
    if (!currentUserId) return;
    setLoading(true);

    const supabase = createClient();

    if (status === "following") {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      setStatus("none");
      toast("Unfollowed");
    } else if (status === "requested") {
      await supabase
        .from("follow_requests")
        .delete()
        .eq("requester_id", currentUserId)
        .eq("target_id", targetUserId);
      setStatus("none");
      toast("Request cancelled");
    } else {
      if (isPrivate) {
        await supabase.from("follow_requests").insert({
          requester_id: currentUserId,
          target_id: targetUserId,
        });
        setStatus("requested");
        toast("Follow request sent");
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
        setStatus("following");
        toast("Following");
      }
    }

    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
        status === "following"
          ? "border border-border text-muted hover:border-red-500/50 hover:text-red-400"
          : status === "requested"
            ? "border border-border text-muted"
            : "bg-accent text-white hover:bg-accent-hover"
      } disabled:opacity-50`}
    >
      {status === "following" ? "Following" : status === "requested" ? "Requested" : "Follow"}
    </button>
  );
}
