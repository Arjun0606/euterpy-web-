"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { toast } from "sonner";

interface Props {
  songAppleId: string;
  songTitle: string;
  artistName: string;
  albumName?: string;
  artworkUrl: string | null;
  existing?: {
    id: string;
    reaction?: string | null;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

function artwork(url: string | null, size = 500): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function SongCollectionModal({
  songAppleId,
  songTitle,
  artistName,
  albumName,
  artworkUrl,
  existing,
  onClose,
  onSaved,
}: Props) {
  const [story, setStory] = useState<string>(existing?.reaction || "");
  const [loved, setLoved] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const coverUrl = artwork(artworkUrl, 600);

  useEffect(() => {
    if (!existing) return;
    const supabase = createClient();
    supabase
      .from("song_ratings")
      .select("score")
      .eq("id", existing.id)
      .single()
      .then(({ data }) => {
        if (data?.score && data.score >= 4) setLoved(true);
      });
  }, [existing]);

  async function handleSave() {
    setSaving(true);
    try {
      const songRes = await fetch(`/api/songs/${songAppleId}`);
      const { song } = await songRes.json();
      if (!song?.id) throw new Error("Song not found");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const score = loved ? 5 : 3;

      if (existing) {
        await supabase
          .from("song_ratings")
          .update({ score, reaction: story.trim() || null })
          .eq("id", existing.id);
      } else {
        await supabase.from("song_ratings").insert({
          user_id: user.id,
          song_id: song.id,
          score,
          reaction: story.trim() || null,
        });
      }

      toast(loved ? `❤ Added — ${songTitle}` : "Added to your collection");
      onSaved();
      onClose();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!existing) return;
    if (!confirm("Remove from your collection?")) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("song_ratings").delete().eq("id", existing.id);
      toast("Removed from collection");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to remove");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Song info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-xl overflow-hidden shadow-2xl shrink-0 border border-white/5">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={songTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-background flex items-center justify-center text-xl text-border">♪</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-1">
              {existing ? "In your collection" : "Add to collection"}
            </p>
            <h3 className="font-display text-xl tracking-tight truncate">{songTitle}</h3>
            <p className="text-zinc-500 text-sm truncate">{artistName}{albumName ? ` · ${albumName}` : ""}</p>
          </div>
        </div>

        {/* Loved */}
        <div className="mb-6">
          <button
            onClick={() => setLoved(!loved)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
              loved ? "bg-accent/10 border-accent/40" : "bg-input border-border hover:border-zinc-700"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className={`text-xl ${loved ? "" : "grayscale opacity-40"}`}>❤</span>
              <span className={`text-sm font-medium ${loved ? "text-accent" : "text-zinc-400"}`}>
                {loved ? "Loved" : "Mark as loved"}
              </span>
            </span>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
              {loved ? "Yours" : "Optional"}
            </span>
          </button>
        </div>

        {/* Story */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-2">A note (optional)</p>
          <textarea
            placeholder="What does this song mean to you?"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors resize-none editorial"
          />
          <p className="text-right text-[10px] text-zinc-700 mt-1">{story.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {existing && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="px-4 py-3 border border-border rounded-xl text-zinc-600 hover:text-red-400 hover:border-red-400/30 transition-colors text-sm"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-border rounded-xl text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40 text-sm font-medium"
          >
            {saving ? "Saving..." : existing ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
