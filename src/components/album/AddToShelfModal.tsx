"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  albumDbId?: string;
  songDbId?: string;
  itemTitle: string;
  onClose: () => void;
}

interface Shelf {
  id: string;
  title: string;
  is_favorites: boolean;
  item_count: number;
}

export default function AddToShelfModal({ albumDbId, songDbId, itemTitle, onClose }: Props) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("shelves")
        .select("id, title, is_favorites, item_count")
        .eq("user_id", user.id)
        .order("is_favorites", { ascending: false })
        .order("created_at", { ascending: false });

      setShelves(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleAdd(shelfId: string, shelfTitle: string) {
    setAdding(shelfId);

    const payload: any = {
      shelf_id: shelfId,
      item_type: albumDbId ? "album" : "song",
      position: 0,
    };
    if (albumDbId) payload.album_id = albumDbId;
    if (songDbId) payload.song_id = songDbId;

    const { error } = await supabase.from("shelf_items").insert(payload);

    if (error) {
      if (error.code === "23505") {
        setSuccess("Already in this shelf");
      } else {
        setSuccess(`Error: ${error.message}`);
      }
    } else {
      setSuccess(`Added to "${shelfTitle}"`);
    }

    setAdding(null);
    setTimeout(() => { onClose(); }, 1000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1">Add to Shelf</h2>
        <p className="text-xs text-muted mb-4 truncate">{itemTitle}</p>

        {loading ? (
          <p className="text-sm text-muted py-4 text-center">Loading shelves...</p>
        ) : shelves.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No shelves yet. Create one from your profile.</p>
        ) : success ? (
          <p className="text-sm text-accent py-4 text-center">{success}</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {shelves.map((shelf) => (
              <button
                key={shelf.id}
                onClick={() => handleAdd(shelf.id, shelf.is_favorites ? "Favorites" : shelf.title)}
                disabled={adding === shelf.id}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-card-hover transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">{shelf.is_favorites ? "★ Favorites" : shelf.title}</p>
                  <p className="text-xs text-muted">{shelf.item_count} items</p>
                </div>
                {adding === shelf.id && <span className="text-xs text-muted">Adding...</span>}
              </button>
            ))}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-4 py-2 border border-border rounded-xl text-sm text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}
