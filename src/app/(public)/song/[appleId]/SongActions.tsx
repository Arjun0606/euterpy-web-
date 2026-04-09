"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import SongCollectionModal from "@/components/album/SongCollectionModal";
import AddToListModal from "@/components/album/AddToListModal";

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
  const [showListModal, setShowListModal] = useState(false);
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
      <div className="flex flex-wrap items-center gap-3 mt-6">
        {userId ? (
          <button
            onClick={() => setShowModal(true)}
            className={`px-6 py-2.5 font-medium rounded-full text-sm transition-colors ${
              userRating
                ? "border border-accent/40 text-accent hover:bg-accent/10"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {userRating ? "✓ In your collection" : "+ Add to collection"}
          </button>
        ) : (
          <a href="/signup" className="px-6 py-2.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors text-sm">
            Sign up to collect
          </a>
        )}

        {userId && (
          <button
            onClick={() => setShowListModal(true)}
            className="px-5 py-2.5 border border-border rounded-full text-sm text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
          >
            Add to a list
          </button>
        )}
      </div>

      {showModal && (
        <SongCollectionModal
          songAppleId={songAppleId}
          songTitle={songTitle}
          artistName={artistName}
          albumName={albumName || undefined}
          artworkUrl={artworkUrl}
          existing={userRating ? { id: userRating.id, reaction: userRating.reaction } : null}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {showListModal && (
        <AddToListModal
          songDbId={songDbId}
          appleId={songAppleId}
          itemTitle={songTitle}
          artistName={artistName}
          artworkUrl={artworkUrl}
          onClose={() => setShowListModal(false)}
        />
      )}
    </>
  );
}
