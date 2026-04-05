"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  targetUserId: string;
}

export default function BlockButton({ targetUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", targetUserId)
        .single();
      setBlocked(!!data);
    });
  }, [targetUserId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!currentUserId || currentUserId === targetUserId) return null;

  async function handleToggleBlock() {
    const supabase = createClient();
    if (blocked) {
      await supabase.from("blocked_users").delete().eq("blocker_id", currentUserId!).eq("blocked_id", targetUserId);
      setBlocked(false);
    } else {
      await supabase.from("blocked_users").insert({ blocker_id: currentUserId!, blocked_id: targetUserId });
      setBlocked(true);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1.5 border border-border rounded-full text-xs text-muted hover:text-foreground transition-colors"
        aria-label="More options"
      >
        ···
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
          <button
            onClick={handleToggleBlock}
            className="w-full px-4 py-2 text-left text-sm hover:bg-card-hover transition-colors text-red-400"
          >
            {blocked ? "Unblock User" : "Block User"}
          </button>
        </div>
      )}
    </div>
  );
}
