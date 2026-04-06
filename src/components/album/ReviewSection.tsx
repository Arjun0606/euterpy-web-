"use client";

import { useState, useEffect } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { createClient } from "@/lib/supabase/client";
import Stars from "@/components/ui/Stars";

interface Review {
  id: string;
  user_id?: string;
  title: string | null;
  body: string;
  score: number;
  upvotes: number;
  downvotes: number;
  is_loved: boolean;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Props {
  reviews: Review[];
  albumId?: string;
  songId?: string;
  userId: string | null;
}

export default function ReviewSection({ reviews, albumId, songId, userId }: Props) {
  const [showWrite, setShowWrite] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);
  const [myVotes, setMyVotes] = useState<Record<string, "up" | "down">>({});
  const [myProfile, setMyProfile] = useState<{ username: string; display_name: string | null; avatar_url: string | null } | null>(null);

  const supabase = createClient();

  // Fetch current user's profile and existing votes
  useEffect(() => {
    if (!userId) return;

    supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) setMyProfile(data);
      });

    const reviewIds = reviews.map((r) => r.id);
    if (reviewIds.length > 0) {
      supabase
        .from("review_votes")
        .select("review_id, vote_type")
        .eq("user_id", userId)
        .in("review_id", reviewIds)
        .then(({ data }) => {
          if (data) {
            const votes: Record<string, "up" | "down"> = {};
            data.forEach((v: any) => { votes[v.review_id] = v.vote_type; });
            setMyVotes(votes);
          }
        });
    }
  }, [userId, reviews]);

  async function submitReview() {
    if (!body.trim() || score === 0 || !userId) return;
    setSaving(true);

    try {
      const payload: any = {
        user_id: userId,
        body: body.trim(),
        score,
        title: title.trim() || null,
      };
      if (albumId) payload.album_id = albumId;
      if (songId) payload.song_id = songId;

      const { data: created, error } = await supabase
        .from("reviews")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      if (created) {
        setLocalReviews([
          {
            ...created,
            profiles: myProfile || { username: "you", display_name: "You", avatar_url: null },
          },
          ...localReviews,
        ]);
      }

      setShowWrite(false);
      setTitle("");
      setBody("");
      setScore(0);
    } catch (e) {
      // silent fail
    }
    setSaving(false);
  }

  async function vote(reviewId: string, voteType: "up" | "down") {
    if (!userId) return;

    const existing = myVotes[reviewId];

    try {
      if (existing === voteType) {
        // Remove vote
        await supabase
          .from("review_votes")
          .delete()
          .eq("review_id", reviewId)
          .eq("user_id", userId);

        setMyVotes((prev) => {
          const next = { ...prev };
          delete next[reviewId];
          return next;
        });
        setLocalReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, upvotes: r.upvotes - (voteType === "up" ? 1 : 0), downvotes: r.downvotes - (voteType === "down" ? 1 : 0) }
              : r
          )
        );
      } else {
        // Upsert vote
        await supabase
          .from("review_votes")
          .upsert(
            { review_id: reviewId, user_id: userId, vote_type: voteType },
            { onConflict: "review_id,user_id" }
          );

        setMyVotes((prev) => ({ ...prev, [reviewId]: voteType }));
        setLocalReviews((prev) =>
          prev.map((r) => {
            if (r.id !== reviewId) return r;
            let { upvotes, downvotes } = r;
            // Remove old vote count
            if (existing === "up") upvotes--;
            if (existing === "down") downvotes--;
            // Add new vote count
            if (voteType === "up") upvotes++;
            if (voteType === "down") downvotes++;
            return { ...r, upvotes, downvotes };
          })
        );
      }
    } catch (e) {
      // silent fail
    }
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-widest text-muted">Reviews</h2>
        {userId && (
          <button
            onClick={() => setShowWrite(!showWrite)}
            className="text-xs text-accent hover:underline"
          >
            {showWrite ? "Cancel" : "Write a Review"}
          </button>
        )}
      </div>

      {/* Write review form */}
      {showWrite && userId && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          {/* Stars */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setScore(v === score ? 0 : v)}
                className={`text-2xl transition-colors ${v <= score ? "text-accent" : "text-border hover:text-accent/50"}`}
              >
                ★
              </button>
            ))}
            <span className="text-xs text-muted ml-2">{score > 0 ? `${score}/5` : "Rate first"}</span>
          </div>

          <input
            type="text"
            placeholder="Review title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 mb-3 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent"
          />

          <textarea
            placeholder="Write your review..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={4}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent resize-none"
          />

          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-muted/30">{body.length}/5000</span>
            <button
              onClick={submitReview}
              disabled={!body.trim() || score === 0 || saving}
              className="px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-40"
            >
              {saving ? "Publishing..." : "Publish Review"}
            </button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {localReviews.length === 0 && !showWrite ? (
        <p className="text-muted/60 text-sm">No reviews yet. Be the first to write one.</p>
      ) : (
        <div className="space-y-4">
          {localReviews.map((review) => (
            <div key={review.id} className="bg-card/50 border border-border rounded-xl p-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <a href={`/${review.profiles?.username}`} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-muted shrink-0 hover:border-accent transition-colors">
                  {review.profiles?.username?.[0]?.toUpperCase() || "?"}
                </a>
                <div className="flex-1">
                  <a href={`/${review.profiles?.username}`} className="text-sm font-medium hover:text-accent transition-colors">
                    {review.profiles?.display_name || review.profiles?.username}
                  </a>
                  <span className="text-xs text-muted/40 ml-2">
                    {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <Stars score={review.score} />
              </div>

              {/* Content */}
              {review.title && <h3 className="font-semibold text-sm mb-1">{review.title}</h3>}
              <p className="text-sm text-muted leading-relaxed">{review.body}</p>

              {/* Footer */}
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/30">
                {review.is_loved && (
                  <span className="text-xs text-accent font-medium">❤️ Users love this</span>
                )}
                <div className="flex-1" />
                {/* Vote buttons — anyone logged in can vote, but counts only visible to author */}
                {userId && (
                  <>
                    <button
                      onClick={() => vote(review.id, "up")}
                      className={`text-xs transition-colors ${myVotes[review.id] === "up" ? "text-accent font-medium" : "text-muted hover:text-accent"}`}
                    >
                      ▲ {review.upvotes}
                    </button>
                    <button
                      onClick={() => vote(review.id, "down")}
                      className={`text-xs transition-colors ${myVotes[review.id] === "down" ? "text-red-400 font-medium" : "text-muted hover:text-red-400"}`}
                    >
                      ▼ {review.downvotes}
                    </button>
                  </>
                )}
                {!userId && (
                  <>
                    <span className="text-xs text-muted">▲ {review.upvotes}</span>
                    <span className="text-xs text-muted">▼ {review.downvotes}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
