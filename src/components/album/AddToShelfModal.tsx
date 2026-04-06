"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  albumDbId?: string;
  songDbId?: string;
  itemTitle: string;
  artistName?: string;
  artworkUrl?: string | null;
  onClose: () => void;
}

interface Shelf {
  id: string;
  title: string;
  is_favorites: boolean;
  item_count: number;
}

interface GtkmSlot {
  position: number;
  album_id: string | null;
  albumTitle: string | null;
}

const GTKM_LABELS = [
  "The album that shaped me",
  "The one I keep coming back to",
  "The one that changed everything",
];

export default function AddToShelfModal({ albumDbId, songDbId, itemTitle, artistName, artworkUrl, onClose }: Props) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [gtkmSlots, setGtkmSlots] = useState<GtkmSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [gtkmStory, setGtkmStory] = useState("");
  const [showStoryFor, setShowStoryFor] = useState<number | null>(null);

  const supabase = createClient();
  const isAlbum = !!albumDbId;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load shelves
      const { data: shelfData } = await supabase
        .from("shelves")
        .select("id, title, is_favorites, item_count")
        .eq("user_id", user.id)
        .order("is_favorites", { ascending: false })
        .order("created_at", { ascending: false });
      setShelves(shelfData || []);

      // Load GTKM slots (only for albums)
      if (isAlbum) {
        const { data: gtkmData } = await supabase
          .from("get_to_know_me")
          .select("position, album_id, albums(title)")
          .eq("user_id", user.id)
          .order("position");

        const slots: GtkmSlot[] = [1, 2, 3].map((pos) => {
          const existing = (gtkmData || []).find((g: any) => g.position === pos);
          return {
            position: pos,
            album_id: existing?.album_id || null,
            albumTitle: (existing as any)?.albums?.title || null,
          };
        });
        setGtkmSlots(slots);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleAddToShelf(shelfId: string, shelfTitle: string) {
    setSaving(`shelf-${shelfId}`);

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
        toast("Already in this shelf");
      } else {
        toast.error("Failed to add");
      }
    } else {
      toast(`Added to "${shelfTitle}"`);
    }

    setSaving(null);
    onClose();
  }

  async function handleAddToGtkm(position: number) {
    if (showStoryFor === position) {
      // User is ready to save
      setSaving(`gtkm-${position}`);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !albumDbId) return;

      const { error } = await supabase.from("get_to_know_me").upsert(
        { user_id: user.id, position, album_id: albumDbId, story: gtkmStory.trim() || null },
        { onConflict: "user_id,position" }
      );

      if (error) {
        toast.error("Failed to set");
      } else {
        toast(`Set as "${GTKM_LABELS[position - 1]}"`);
      }

      setSaving(null);
      setShowStoryFor(null);
      setGtkmStory("");
      onClose();
    } else {
      setShowStoryFor(position);
      setGtkmStory("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md bg-background border border-border rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 z-10">
          <h2 className="text-base font-semibold">Add to...</h2>
          <p className="text-xs text-muted truncate">{itemTitle}{artistName ? ` — ${artistName}` : ""}</p>
        </div>

        {loading ? (
          <div className="p-6 text-center"><p className="text-sm text-muted">Loading...</p></div>
        ) : (
          <div className="p-4">
            {/* GTKM Section (albums only) */}
            {isAlbum && gtkmSlots.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-widest text-muted/40 mb-2 px-2">Get to Know Me</p>
                <div className="space-y-1">
                  {gtkmSlots.map((slot) => (
                    <div key={slot.position}>
                      <button
                        onClick={() => handleAddToGtkm(slot.position)}
                        disabled={saving === `gtkm-${slot.position}`}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-card-hover transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{GTKM_LABELS[slot.position - 1]}</p>
                          {slot.albumTitle && slot.album_id !== albumDbId ? (
                            <p className="text-xs text-muted/50 truncate">Currently: {slot.albumTitle}</p>
                          ) : slot.album_id === albumDbId ? (
                            <p className="text-xs text-accent">Already set to this album</p>
                          ) : (
                            <p className="text-xs text-muted/30">Empty</p>
                          )}
                        </div>
                        <span className="text-accent text-lg ml-2">{slot.position}</span>
                      </button>

                      {/* Story input */}
                      {showStoryFor === slot.position && (
                        <div className="px-3 pb-3">
                          <input
                            type="text"
                            value={gtkmStory}
                            onChange={(e) => setGtkmStory(e.target.value)}
                            placeholder="Why this album? (optional)"
                            maxLength={500}
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleAddToGtkm(slot.position)}
                            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent mb-2"
                          />
                          <button
                            onClick={() => handleAddToGtkm(slot.position)}
                            disabled={saving === `gtkm-${slot.position}`}
                            className="w-full py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover disabled:opacity-40"
                          >
                            {saving === `gtkm-${slot.position}` ? "Saving..." : "Set"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shelves Section */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted/40 mb-2 px-2">Shelves</p>
              {shelves.length === 0 ? (
                <p className="text-sm text-muted/40 py-3 px-2">No shelves yet. Create one from your profile.</p>
              ) : (
                <div className="space-y-1">
                  {shelves.map((shelf) => (
                    <button
                      key={shelf.id}
                      onClick={() => handleAddToShelf(shelf.id, shelf.is_favorites ? "Favorites" : shelf.title)}
                      disabled={saving === `shelf-${shelf.id}`}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-card-hover transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">{shelf.is_favorites ? "★ Favorites" : shelf.title}</p>
                        <p className="text-xs text-muted/50">{shelf.item_count} items</p>
                      </div>
                      {saving === `shelf-${shelf.id}` && <span className="text-xs text-muted">Adding...</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancel */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <button onClick={onClose} className="w-full py-2.5 border border-border rounded-xl text-sm text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
