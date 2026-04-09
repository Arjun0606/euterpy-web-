"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  // The DB ids let us look up apple_id + title + artist + artwork
  albumDbId?: string;
  songDbId?: string;
  // Display info
  itemTitle: string;
  artistName?: string;
  artworkUrl?: string | null;
  appleId?: string;
  onClose: () => void;
}

interface List {
  id: string;
  title: string;
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

export default function AddToListModal({
  albumDbId,
  songDbId,
  itemTitle,
  artistName,
  artworkUrl,
  appleId,
  onClose,
}: Props) {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [gtkmSlots, setGtkmSlots] = useState<GtkmSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const supabase = createClient();
  const isAlbum = !!albumDbId;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch lists with item counts
      const { data: listData } = await supabase
        .from("lists")
        .select("id, title, items:list_items(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const transformed: List[] = (listData || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        item_count: l.items?.[0]?.count || 0,
      }));
      setLists(transformed);

      // GTKM slots — albums only
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

  // Hydrate the album/song data we need to write into list_items
  async function getTargetData() {
    if (albumDbId) {
      const { data } = await supabase
        .from("albums")
        .select("apple_id, title, artist_name, artwork_url")
        .eq("id", albumDbId)
        .single();
      return data ? { kind: "album" as const, ...data } : null;
    }
    if (songDbId) {
      const { data } = await supabase
        .from("songs")
        .select("apple_id, title, artist_name, artwork_url")
        .eq("id", songDbId)
        .single();
      return data ? { kind: "song" as const, ...data } : null;
    }
    // Fallback to props if we don't have DB ids
    if (appleId) {
      return {
        kind: (isAlbum ? "album" : "song") as "album" | "song",
        apple_id: appleId,
        title: itemTitle,
        artist_name: artistName || "",
        artwork_url: artworkUrl || null,
      };
    }
    return null;
  }

  async function handleAddToList(listId: string, listTitle: string) {
    setSaving(`list-${listId}`);
    try {
      const target = await getTargetData();
      if (!target) {
        toast.error("Couldn't load item");
        setSaving(null);
        return;
      }

      // Find the next position in this list
      const { data: maxItem } = await supabase
        .from("list_items")
        .select("position")
        .eq("list_id", listId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPosition = (maxItem?.position ?? -1) + 1;

      const { error } = await supabase.from("list_items").insert({
        list_id: listId,
        position: nextPosition,
        kind: target.kind,
        target_apple_id: target.apple_id,
        target_title: target.title,
        target_artist: target.artist_name,
        target_artwork_url: target.artwork_url,
      });

      if (error) throw error;
      toast(`Added to "${listTitle}"`);
      onClose();
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't add to list");
    } finally {
      setSaving(null);
    }
  }

  async function handleCreateAndAdd() {
    if (!newListTitle.trim()) {
      toast.error("Give your list a title");
      return;
    }
    setSaving("new");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const target = await getTargetData();
      if (!target) {
        toast.error("Couldn't load item");
        setSaving(null);
        return;
      }

      // Create the list
      const { data: newList, error: createError } = await supabase
        .from("lists")
        .insert({ user_id: user.id, title: newListTitle.trim() })
        .select("id")
        .single();
      if (createError) throw createError;

      // Add the item as position 0
      const { error: itemError } = await supabase.from("list_items").insert({
        list_id: newList.id,
        position: 0,
        kind: target.kind,
        target_apple_id: target.apple_id,
        target_title: target.title,
        target_artist: target.artist_name,
        target_artwork_url: target.artwork_url,
      });
      if (itemError) throw itemError;

      toast(`Created "${newListTitle.trim()}"`);
      onClose();
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create list");
    } finally {
      setSaving(null);
    }
  }

  async function handleAddToGtkm(position: number) {
    setSaving(`gtkm-${position}`);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !albumDbId) {
      setSaving(null);
      return;
    }

    const { data: existing } = await supabase
      .from("get_to_know_me")
      .select("id")
      .eq("user_id", user.id)
      .eq("position", position)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("get_to_know_me")
        .update({ album_id: albumDbId, story: null })
        .eq("id", existing.id));
    } else {
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
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-1">Add to list</p>
          <h2 className="font-display text-2xl tracking-tight truncate">{itemTitle}</h2>
          {artistName && <p className="text-xs text-zinc-500 truncate italic">{artistName}</p>}
        </div>

        {loading ? (
          <div className="px-6 pb-8 text-center">
            <p className="text-sm text-zinc-600">Loading...</p>
          </div>
        ) : (
          <div className="px-4 pb-4">
            {/* GTKM — albums only */}
            {isAlbum && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium mb-2 px-2">Get to Know Me</p>
                {gtkmSlots.map((slot) => (
                  <button
                    key={slot.position}
                    onClick={() => handleAddToGtkm(slot.position)}
                    disabled={saving === `gtkm-${slot.position}` || slot.album_id === albumDbId}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-card-hover transition-colors text-left disabled:opacity-40 group"
                  >
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
            {isAlbum && <div className="border-t border-border my-2" />}

            {/* Lists */}
            <div>
              <div className="flex items-center justify-between mb-2 px-2">
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">Lists</p>
                <button
                  onClick={() => setCreatingNew((v) => !v)}
                  className="text-[11px] text-accent hover:underline"
                >
                  {creatingNew ? "Cancel" : "+ New"}
                </button>
              </div>

              {/* New list inline form */}
              {creatingNew && (
                <div className="mb-2 px-2">
                  <input
                    type="text"
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="New list title..."
                    autoFocus
                    maxLength={200}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors mb-2"
                  />
                  <button
                    onClick={handleCreateAndAdd}
                    disabled={saving === "new" || !newListTitle.trim()}
                    className="w-full py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover disabled:opacity-30 transition-colors"
                  >
                    {saving === "new" ? "Creating..." : "Create + add"}
                  </button>
                </div>
              )}

              {lists.length > 0 ? (
                lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => handleAddToList(list.id, list.title)}
                    disabled={saving === `list-${list.id}`}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-card-hover transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-200 truncate">{list.title}</p>
                      <p className="text-[11px] text-zinc-600">{list.item_count} {list.item_count === 1 ? "item" : "items"}</p>
                    </div>
                    {saving === `list-${list.id}` && <span className="text-[11px] text-zinc-500">Adding...</span>}
                  </button>
                ))
              ) : !creatingNew ? (
                <p className="text-sm text-zinc-600 py-4 px-2 italic">No lists yet. Create one above.</p>
              ) : null}
            </div>
          </div>
        )}

        {/* Cancel */}
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-card-hover border border-border rounded-2xl text-sm text-zinc-400 hover:text-white transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
