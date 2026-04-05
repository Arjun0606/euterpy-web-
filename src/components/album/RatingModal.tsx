"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { toast } from "sonner";

interface Props {
  albumAppleId: string;
  albumTitle: string;
  artistName: string;
  artworkUrl: string | null;
  existingRating?: {
    id: string;
    score: number;
    reaction: string | null;
    ownership?: string | null;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

const QUICK_REACTIONS = [
  "Changed my life",
  "Underrated gem",
  "Perfect front to back",
  "Not for me",
  "Track 1 alone...",
  "Grew on me",
  "Late night essential",
  "Sonically flawless",
];

const OWNERSHIP_OPTIONS = [
  { value: "vinyl", label: "Vinyl", emoji: "🎵" },
  { value: "cd", label: "CD", emoji: "💿" },
  { value: "cassette", label: "Cassette", emoji: "📼" },
  { value: "digital", label: "Stream", emoji: "🎧" },
];

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
  const [ownership, setOwnership] = useState(existingRating?.ownership || "digital");
  const [saving, setSaving] = useState(false);
  const [showReviewUpsell, setShowReviewUpsell] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const coverUrl = artwork(artworkUrl, 600);

  async function handleSave() {
    if (score === 0) return;
    setSaving(true);

    try {
      const albumRes = await fetch(`/api/albums/${albumAppleId}`);
      const { album } = await albumRes.json();
      if (!album) throw new Error("Album not found");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (existingRating) {
        await supabase
          .from("ratings")
          .update({ score, reaction: reaction.trim() || null, ownership })
          .eq("id", existingRating.id);
      } else {
        await supabase.from("ratings").insert({
          user_id: user.id,
          album_id: album.id,
          score,
          reaction: reaction.trim() || null,
          ownership,
        });
      }

      // If user wants to make this a review too
      if (showReviewUpsell && reaction.trim().length > 50) {
        await supabase.from("reviews").insert({
          user_id: user.id,
          album_id: album.id,
          title: reviewTitle.trim() || null,
          body: reaction.trim(),
          score,
        });
      }

      toast(`★ ${score} — ${albumTitle}`, { description: existingRating ? "Rating updated" : "Logged to your collection" });
      onSaved();
      onClose();
    } catch (error) {
      toast.error("Something went wrong. Try again.");
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
        className="relative w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Album info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-lg overflow-hidden shadow-xl shrink-0 border border-white/5">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={albumTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-background flex items-center justify-center text-xl text-border">♪</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{albumTitle}</h3>
            <p className="text-muted text-sm truncate">{artistName}</p>
          </div>
        </div>

        {/* Star Rating */}
        <div className="mb-5">
          <div className="flex items-center justify-center gap-0">
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

        {/* Ownership */}
        <div className="mb-5">
          <p className="text-xs text-muted/50 mb-2">Format</p>
          <div className="flex gap-2">
            {OWNERSHIP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOwnership(opt.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  ownership === opt.value
                    ? "bg-accent text-white"
                    : "bg-background border border-border text-muted hover:text-foreground"
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Reactions */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REACTIONS.map((chip) => (
              <button
                key={chip}
                onClick={() => setReaction(reaction ? `${reaction} ${chip}` : chip)}
                className="px-2.5 py-1 bg-background border border-border rounded-full text-[11px] text-muted hover:text-accent hover:border-accent/30 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Reaction */}
        <div className="mb-4">
          <textarea
            placeholder="Say something..."
            value={reaction}
            onChange={(e) => {
              setReaction(e.target.value);
              if (e.target.value.length > 100 && !showReviewUpsell) {
                setShowReviewUpsell(true);
              }
            }}
            maxLength={5000}
            rows={2}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors resize-none text-sm"
          />
          <p className="text-right text-xs text-muted/30 mt-1">
            {reaction.length}/5000
          </p>
        </div>

        {/* Review upsell */}
        {showReviewUpsell && reaction.length > 50 && (
          <div className="mb-4 p-3 bg-accent/5 border border-accent/10 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showReviewUpsell}
                onChange={(e) => setShowReviewUpsell(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-xs text-accent">Also publish as a review</span>
            </label>
            {showReviewUpsell && (
              <input
                type="text"
                placeholder="Review title (optional)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                maxLength={200}
                className="w-full mt-2 px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent"
              />
            )}
          </div>
        )}

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
            {saving ? "Saving..." : existingRating ? "Update" : "Log Album"}
          </button>
        </div>
      </div>
    </div>
  );
}
