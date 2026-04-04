"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  songAppleId: string;
  songTitle: string;
  artistName: string;
  albumName?: string;
  artworkUrl: string | null;
  existingRating?: {
    id: string;
    score: number;
    reaction: string | null;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SongRatingModal({
  songAppleId,
  songTitle,
  artistName,
  albumName,
  existingRating,
  onClose,
  onSaved,
}: Props) {
  const [score, setScore] = useState(existingRating?.score || 0);
  const [reaction, setReaction] = useState(existingRating?.reaction || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (score === 0) return;
    setSaving(true);

    try {
      // Ensure song exists in DB
      const songRes = await fetch(`/api/songs/${songAppleId}`);
      const { song } = await songRes.json();
      if (!song) throw new Error("Song not found");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (existingRating) {
        await supabase
          .from("song_ratings")
          .update({ score, reaction: reaction.trim() || null })
          .eq("id", existingRating.id);
      } else {
        await supabase.from("song_ratings").insert({
          user_id: user.id,
          song_id: song.id,
          score,
          reaction: reaction.trim() || null,
        });
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save song rating:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Song info */}
        <div className="mb-8 text-center">
          <h3 className="font-semibold text-lg">{songTitle}</h3>
          <p className="text-muted text-sm">
            {artistName}
            {albumName && (
              <span className="text-muted/40"> · {albumName}</span>
            )}
          </p>
        </div>

        {/* Stars — 1 to 5 */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                className={`text-3xl transition-colors ${v <= score ? "text-accent" : "text-border hover:text-accent/50"}`}
                onClick={() => setScore(v === score ? 0 : v)}
              >
                ★
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted mt-2">
            {score > 0 ? `${score} / 5` : "Tap to rate"}
          </p>
        </div>

        {/* Reaction */}
        <div className="mb-6">
          <textarea
            placeholder="Say something..."
            value={reaction}
            onChange={(e) => setReaction(e.target.value)}
            maxLength={280}
            rows={2}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors resize-none text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-border rounded-xl text-muted hover:text-foreground transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={score === 0 || saving}
            className="flex-1 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40 text-sm font-medium"
          >
            {saving ? "Saving..." : existingRating ? "Update" : "Rate Song"}
          </button>
        </div>
      </div>
    </div>
  );
}
