"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  appleId: string;
  kind: "song" | "album";
  title: string;
  artist: string;
  artworkUrl: string | null;
  className?: string;
}

/**
 * "Set as Now Playing" button — used on song & album pages.
 * Sets a 24h ephemeral status on the user's profile.
 */
export default function SetNowPlayingButton({ appleId, kind, title, artist, artworkUrl, className = "" }: Props) {
  const [saving, setSaving] = useState(false);

  async function handleSet() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to set Now Playing");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          now_playing_apple_id: appleId,
          now_playing_kind: kind,
          now_playing_title: title,
          now_playing_artist: artist,
          now_playing_artwork_url: artworkUrl,
          now_playing_set_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      toast(`♫ Now playing — ${title}`, { description: "Visible on your profile for 24 hours" });
    } catch {
      toast.error("Couldn't set now playing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleSet}
      disabled={saving}
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-zinc-500 hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50 ${className}`}
    >
      <span className="text-sm">♫</span>
      {saving ? "Setting..." : "Set as Now Playing"}
    </button>
  );
}
