"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import SongRatingModal from "@/components/album/SongRatingModal";
import AddToShelfModal from "@/components/album/AddToShelfModal";
import Stars from "@/components/ui/Stars";

interface Props {
  songAppleId: string;
  songDbId: string;
  songTitle: string;
  artistName: string;
  albumName?: string | null;
  artworkUrl: string | null;
}

export default function SongActions({ songAppleId, songDbId, songTitle, artistName, albumName, artworkUrl }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [userRating, setUserRating] = useState<{ id: string; score: number; reaction: string | null } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase
          .from("song_ratings")
          .select("id, score, reaction")
          .eq("user_id", user.id)
          .eq("song_id", songDbId)
          .single()
          .then(({ data }) => {
            if (data) setUserRating(data);
          });
      }
    });
  }, [songDbId]);

  function handleSaved() {
    const supabase = createClient();
    if (userId) {
      supabase
        .from("song_ratings")
        .select("id, score, reaction")
        .eq("user_id", userId)
        .eq("song_id", songDbId)
        .single()
        .then(({ data }) => {
          if (data) setUserRating(data);
        });
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 mt-6">
        {userRating ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2 border border-border rounded-full hover:border-accent transition-colors group"
          >
            <Stars score={userRating.score} />
            <span className="text-xs text-muted group-hover:text-accent transition-colors">Edit</span>
          </button>
        ) : userId ? (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors text-sm"
          >
            Rate Song
          </button>
        ) : (
          <a href="/login" className="px-6 py-2 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors text-sm">
            Log in to rate
          </a>
        )}

        {userId && (
          <button
            onClick={() => setShowShelfModal(true)}
            className="px-4 py-2 border border-border rounded-full text-sm text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            + Shelf
          </button>
        )}
      </div>

      {showModal && (
        <SongRatingModal
          songAppleId={songAppleId}
          songTitle={songTitle}
          artistName={artistName}
          albumName={albumName || undefined}
          artworkUrl={artworkUrl}
          existingRating={userRating}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {showShelfModal && (
        <AddToShelfModal
          songDbId={songDbId}
          itemTitle={`${songTitle} by ${artistName}`}
          onClose={() => setShowShelfModal(false)}
        />
      )}
    </>
  );
}
