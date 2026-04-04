"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getArtworkUrl } from "@/lib/apple-music/client";

interface Props {
  albumAppleId: string;
  albumTitle: string;
  artistName: string;
  artworkUrl: string | null;
  existingRating?: {
    id: string;
    score: number;
    reaction: string | null;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

function artwork(url: string | null, size = 500): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function RatingModal({
  albumAppleId,
  albumTitle,
  artistName,
  artworkUrl,
  existingRating,
  onClose,
  onSaved,
}: Props) {
  const [score, setScore] = useState(existingRating?.score || 0);
  const [reaction, setReaction] = useState(existingRating?.reaction || "");
  const [saving, setSaving] = useState(false);
  const coverUrl = artwork(artworkUrl, 600);

  async function handleSave() {
    if (score === 0) return;
    setSaving(true);

    try {
      // First ensure the album exists in our DB
      const albumRes = await fetch(`/api/albums/${albumAppleId}`);
      const { album } = await albumRes.json();
      if (!album) throw new Error("Album not found");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (existingRating) {
        // Update existing
        await supabase
          .from("ratings")
          .update({ score, reaction: reaction.trim() || null })
          .eq("id", existingRating.id);
      } else {
        // Create new
        await supabase.from("ratings").insert({
          user_id: user.id,
          album_id: album.id,
          score,
          reaction: reaction.trim() || null,
        });
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save rating:", error);
    } finally {
      setSaving(false);
    }
  }

  function renderStars() {
    return [1, 2, 3, 4, 5].map((v) => (
      <button
        key={v}
        type="button"
        className={`text-3xl transition-colors ${v <= score ? "text-accent" : "text-border hover:text-accent/50"}`}
        onClick={() => setScore(v === score ? 0 : v)}
      >
        ★
      </button>
    ));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Album info */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-lg overflow-hidden shadow-xl shrink-0 border border-white/5">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt={albumTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-background flex items-center justify-center text-xl text-border">
                ♪
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{albumTitle}</h3>
            <p className="text-muted text-sm truncate">{artistName}</p>
          </div>
        </div>

        {/* Star Rating */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-0">
            {renderStars()}
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
          <p className="text-right text-xs text-muted/30 mt-1">
            {reaction.length}/280
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-border rounded-xl text-muted hover:text-foreground hover:border-foreground/20 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={score === 0 || saving}
            className="flex-1 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
          >
            {saving
              ? "Saving..."
              : existingRating
                ? "Update"
                : "Log Album"}
          </button>
        </div>
      </div>
    </div>
  );
}
