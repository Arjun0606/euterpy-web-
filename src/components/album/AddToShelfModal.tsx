"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  albumDbId?: string;
  songDbId?: string;
  itemTitle: string;
  artistName?: string;
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

export default function AddToShelfModal({ albumDbId, songDbId, itemTitle, artistName, onClose }: Props) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [gtkmSlots, setGtkmSlots] = useState<GtkmSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = createClient();
  const isAlbum = !!albumDbId;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: shelfData } = await supabase
        .from("shelves")
        .select("id, title, is_favorites, item_count")
        .eq("user_id", user.id)
        .order("is_favorites", { ascending: false })
        .order("created_at", { ascending: false });
      setShelves(shelfData || []);

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
    const payload: any = { shelf_id: shelfId, item_type: albumDbId ? "album" : "song", position: 0 };
    if (albumDbId) payload.album_id = albumDbId;
    if (songDbId) payload.song_id = songDbId;

    const { error } = await supabase.from("shelf_items").insert(payload);
    if (error?.code === "23505") toast("Already in this shelf");
    else if (error) toast.error("Failed to add");
    else toast(`Added to "${shelfTitle}"`);

    setSaving(null);
    onClose();
  }

  async function handleAddToGtkm(position: number) {
    setSaving(`gtkm-${position}`);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !albumDbId) { setSaving(null); return; }

    // Check if row exists for this position
    const { data: existing } = await supabase
      .from("get_to_know_me")
      .select("id")
      .eq("user_id", user.id)
      .eq("position", position)
      .single();

    let error;
    if (existing) {
      // Update existing row
      ({ error } = await supabase
        .from("get_to_know_me")
        .update({ album_id: albumDbId, story: null })
        .eq("id", existing.id));
    } else {
      // Insert new row
      ({ error } = await supabase
        .from("get_to_know_me")
        .insert({ user_id: user.id, position, album_id: albumDbId, story: null }));
    }

    if (error) toast.error("Failed to set");
    else toast(`Set as "${GTKM_LABELS[position - 1]}"`);

    setSaving(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold tracking-tight">Add to</h2>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{itemTitle}{artistName ? ` — ${artistName}` : ""}</p>
        </div>

        {loading ? (
          <div className="px-6 pb-8 text-center"><p className="text-sm text-zinc-600">Loading...</p></div>
        ) : (
          <div className="px-4 pb-4">
            {/* GTKM — albums only, single click to set */}
            {isAlbum && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium mb-2 px-2">Get to Know Me</p>
                {gtkmSlots.map((slot) => (
                  <button key={slot.position} onClick={() => handleAddToGtkm(slot.position)}
                    disabled={saving === `gtkm-${slot.position}` || slot.album_id === albumDbId}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-card-hover transition-colors text-left disabled:opacity-40 group">
                    <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center shrink-0">
                      {slot.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">{GTKM_LABELS[slot.position - 1]}</p>
                      {slot.album_id === albumDbId ? (
                        <p className="text-[11px] text-accent">Already set</p>
                      ) : slot.albumTitle ? (
                        <p className="text-[11px] text-zinc-600 truncate">Replaces: {slot.albumTitle}</p>
                      ) : (
                        <p className="text-[11px] text-zinc-700">Empty</p>
                      )}
                    </div>
                    {saving === `gtkm-${slot.position}` && <span className="text-[11px] text-zinc-500">Saving...</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            {isAlbum && shelves.length > 0 && <div className="border-t border-border my-2" />}

            {/* Shelves */}
            {shelves.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium mb-2 px-2">Shelves</p>
                {shelves.map((shelf) => (
                  <button key={shelf.id} onClick={() => handleAddToShelf(shelf.id, shelf.is_favorites ? "Favorites" : shelf.title)}
                    disabled={saving === `shelf-${shelf.id}`}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-card-hover transition-colors text-left">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{shelf.is_favorites ? "★ Favorites" : shelf.title}</p>
                      <p className="text-[11px] text-zinc-600">{shelf.item_count} items</p>
                    </div>
                    {saving === `shelf-${shelf.id}` && <span className="text-[11px] text-zinc-500">Adding...</span>}
                  </button>
                ))}
              </div>
            )}

            {shelves.length === 0 && !isAlbum && (
              <p className="text-sm text-zinc-600 py-4 px-2">No shelves yet. Create one from your profile.</p>
            )}
          </div>
        )}

        {/* Cancel */}
        <div className="px-4 pb-6 pt-2">
          <button onClick={onClose} className="w-full py-3 bg-card-hover border border-border rounded-2xl text-sm text-zinc-400 hover:text-white hover:bg-card-hover transition-colors font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
