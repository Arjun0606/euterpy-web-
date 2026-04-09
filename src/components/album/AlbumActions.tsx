"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import CollectionModal from "@/components/album/CollectionModal";
import AddToListModal from "@/components/album/AddToListModal";

interface Props {
  albumAppleId: string;
  albumDbId: string;
  albumTitle: string;
  artistName: string;
  artworkUrl: string | null;
}

export default function AlbumActions({
  albumAppleId,
  albumDbId,
  albumTitle,
  artistName,
  artworkUrl,
}: Props) {
  const [showCollection, setShowCollection] = useState(false);
  const [showList, setShowList] = useState(false);
  const [existing, setExisting] = useState<{
    id: string;
    ownership?: string | null;
    reaction?: string | null;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase
          .from("ratings")
          .select("id, ownership, reaction")
          .eq("user_id", user.id)
          .eq("album_id", albumDbId)
          .single()
          .then(({ data }) => {
            if (data) setExisting(data);
          });
      }
    });
  }, [albumDbId]);

  function handleSaved() {
    const supabase = createClient();
    if (userId) {
      supabase
        .from("ratings")
        .select("id, ownership, reaction")
        .eq("user_id", userId)
        .eq("album_id", albumDbId)
        .single()
        .then(({ data }) => {
          setExisting(data || null);
        });
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mt-6">
        {userId ? (
          <button
            onClick={() => setShowCollection(true)}
            className={`px-6 py-2.5 font-medium rounded-full text-sm transition-colors ${
              existing
                ? "border border-accent/40 text-accent hover:bg-accent/10"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {existing ? "✓ In your collection" : "+ Add to collection"}
          </button>
        ) : (
          <a
            href="/signup"
            className="px-6 py-2.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors text-sm"
          >
            Sign up to collect
          </a>
        )}

        {userId && (
          <button
            onClick={() => setShowList(true)}
            className="px-5 py-2.5 border border-border rounded-full text-sm text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
          >
            Add to a list
          </button>
        )}
      </div>

      {showCollection && (
        <CollectionModal
          albumAppleId={albumAppleId}
          albumTitle={albumTitle}
          artistName={artistName}
          artworkUrl={artworkUrl}
          existing={existing}
          onClose={() => setShowCollection(false)}
          onSaved={handleSaved}
        />
      )}

      {showList && (
        <AddToListModal
          albumDbId={albumDbId}
          appleId={albumAppleId}
          itemTitle={albumTitle}
          artistName={artistName}
          artworkUrl={artworkUrl}
          onClose={() => setShowList(false)}
        />
      )}
    </>
  );
}
