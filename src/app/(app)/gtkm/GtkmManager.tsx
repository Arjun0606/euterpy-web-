"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { toast } from "sonner";
import Link from "next/link";
import StoryEditor from "@/components/profile/StoryEditor";

interface GtkmRow {
  id: string;
  position: number;
  story: string | null;
  album_id: string;
  albums: {
    id: string;
    apple_id: string;
    title: string;
    artist_name: string;
    artwork_url: string | null;
  } | null;
}

interface SearchResult {
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
}

const SLIDE_LABELS = [
  "The album that shaped me",
  "The one I keep coming back to",
  "The one that changed everything",
];

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function GtkmManager({ userId, initialItems }: { userId: string; initialItems: GtkmRow[] }) {
  const [items, setItems] = useState<GtkmRow[]>(initialItems);
  const [draggedPosition, setDraggedPosition] = useState<number | null>(null);
  const [searchSlot, setSearchSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const supabase = createClient();

  function getItemAtPosition(position: number): GtkmRow | null {
    return items.find((i) => i.position === position) || null;
  }

  // Search Apple Music albums
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/albums/search?q=${encodeURIComponent(q.trim())}`);
      const data = await r.json();
      setSearchResults((data.results || []).slice(0, 6));
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  async function handleSelectAlbum(album: SearchResult, position: number) {
    try {
      // Ensure album exists in DB
      const r = await fetch(`/api/albums/${album.appleId}`);
      const data = await r.json();
      if (!data.album?.id) { toast.error("Album not found"); return; }
      const albumDbId = data.album.id;

      // Check if a row exists at this position
      const existing = getItemAtPosition(position);

      if (existing) {
        // Update existing row
        const { error } = await supabase
          .from("get_to_know_me")
          .update({ album_id: albumDbId, story: null })
          .eq("id", existing.id);
        if (error) { toast.error("Failed to set"); return; }

        setItems((prev) => prev.map((it) => it.id === existing.id ? {
          ...it,
          album_id: albumDbId,
          story: null,
          albums: { id: albumDbId, apple_id: album.appleId, title: album.title, artist_name: album.artistName, artwork_url: album.artworkUrl },
        } : it));
      } else {
        // Insert new row
        const { data: inserted, error } = await supabase
          .from("get_to_know_me")
          .insert({ user_id: userId, position, album_id: albumDbId, story: null })
          .select("*, albums(id, apple_id, title, artist_name, artwork_url)")
          .single();
        if (error || !inserted) { toast.error("Failed to set"); return; }
        setItems((prev) => [...prev, inserted as any].sort((a, b) => a.position - b.position));
      }

      toast(`Set as ${SLIDE_LABELS[position - 1]}`);
      setSearchSlot(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleRemove(position: number) {
    const item = getItemAtPosition(position);
    if (!item) return;
    if (!confirm("Remove this album?")) return;

    const { error } = await supabase.from("get_to_know_me").delete().eq("id", item.id);
    if (error) { toast.error("Failed to remove"); return; }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast("Removed");
  }

  async function handleStorySave(itemId: string, story: string) {
    const { error } = await supabase
      .from("get_to_know_me")
      .update({ story: story.trim() || null })
      .eq("id", itemId);
    if (error) { toast.error("Couldn't save story"); throw error; }
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, story: story.trim() || null } : it));
    toast("Story saved");
  }

  // Drag-to-reorder: swap positions
  function handleDragStart(position: number) {
    setDraggedPosition(position);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(targetPosition: number) {
    if (draggedPosition === null || draggedPosition === targetPosition) {
      setDraggedPosition(null);
      return;
    }

    const sourceItem = getItemAtPosition(draggedPosition);
    const targetItem = getItemAtPosition(targetPosition);

    // Swap by deleting both and re-inserting (clean way given unique constraint on user_id+position)
    try {
      // Delete both first
      if (sourceItem) await supabase.from("get_to_know_me").delete().eq("id", sourceItem.id);
      if (targetItem) await supabase.from("get_to_know_me").delete().eq("id", targetItem.id);

      // Re-insert with swapped positions
      const newRows: any[] = [];
      if (sourceItem) {
        const { data } = await supabase
          .from("get_to_know_me")
          .insert({ user_id: userId, position: targetPosition, album_id: sourceItem.album_id, story: sourceItem.story })
          .select("*, albums(id, apple_id, title, artist_name, artwork_url)")
          .single();
        if (data) newRows.push(data);
      }
      if (targetItem) {
        const { data } = await supabase
          .from("get_to_know_me")
          .insert({ user_id: userId, position: draggedPosition, album_id: targetItem.album_id, story: targetItem.story })
          .select("*, albums(id, apple_id, title, artist_name, artwork_url)")
          .single();
        if (data) newRows.push(data);
      }

      setItems((prev) => {
        const filtered = prev.filter((i) => i.position !== draggedPosition && i.position !== targetPosition);
        return [...filtered, ...newRows].sort((a, b) => a.position - b.position);
      });
      toast("Reordered");
    } catch {
      toast.error("Failed to reorder");
    }
    setDraggedPosition(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Your three albums</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mb-3">
          The records that <span className="italic text-accent">define you.</span>
        </h1>
        <p className="editorial text-base text-zinc-400 max-w-xl">
          These three sit at the top of your profile. The first thing anyone sees when they visit you.
          Drag to reorder. Click any cover to write your story.
        </p>
      </div>

      {/* The 3 slots */}
      <div className="space-y-4 mb-10">
        {[1, 2, 3].map((position) => {
          const item = getItemAtPosition(position);
          const album = item?.albums;
          const isDraggedOver = draggedPosition !== null && draggedPosition !== position;

          return (
            <div
              key={position}
              draggable={!!item}
              onDragStart={() => item && handleDragStart(position)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(position)}
              className={`bg-card border rounded-2xl p-5 sm:p-6 transition-all ${
                isDraggedOver ? "border-accent border-dashed" : "border-border"
              } ${item ? "cursor-move" : ""}`}
            >
              <div className="flex items-start gap-4">
                {/* Position number */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-lg">
                  {position}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
                    {SLIDE_LABELS[position - 1]}
                  </p>

                  {item && album ? (
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        {album.artwork_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={art(album.artwork_url, 240)!} alt={album.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display text-xl tracking-tight leading-none mb-1 truncate">{album.title}</h3>
                          <p className="text-sm text-zinc-500 truncate">{album.artist_name}</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => { setSearchSlot(position); setSearchQuery(""); setSearchResults([]); }}
                            className="text-[11px] text-zinc-500 hover:text-accent transition-colors"
                          >
                            Replace
                          </button>
                          <button
                            onClick={() => handleRemove(position)}
                            className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Story editor — reuses the existing component */}
                      <div className="bg-zinc-950/50 rounded-xl p-4 border border-border">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 mb-2">Your story</p>
                        <div className="text-zinc-100">
                          <StoryEditor
                            initialStory={item.story}
                            albumAppleId={album.apple_id}
                            isOwner={true}
                            onSave={(story) => handleStorySave(item.id, story)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setSearchSlot(position); setSearchQuery(""); setSearchResults([]); }}
                      className="w-full py-6 border border-dashed border-zinc-800 rounded-xl text-sm text-zinc-700 hover:text-zinc-400 hover:border-zinc-700 transition-colors"
                    >
                      + Add an album
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <Link href="/settings" className="text-sm text-zinc-600 hover:text-zinc-300 transition-colors">
          ← Back to Settings
        </Link>
      </div>

      {/* Search modal */}
      {searchSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSearchSlot(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-zinc-950 border border-border rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-2">{SLIDE_LABELS[searchSlot - 1]}</p>
              <h2 className="font-display text-2xl mb-4">Search for an album</h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                autoFocus
                placeholder="Search..."
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700"
              />
              {searching && <p className="text-xs text-zinc-600 mt-2">Searching...</p>}
            </div>

            {searchResults.length > 0 && (
              <div className="border-t border-border max-h-80 overflow-y-auto">
                {searchResults.map((album) => (
                  <button
                    key={album.appleId}
                    onClick={() => handleSelectAlbum(album, searchSlot)}
                    className="w-full flex items-center gap-3 px-6 py-3 hover:bg-card-hover transition-colors text-left"
                  >
                    {album.artworkUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={album.artworkUrl} alt="" className="w-11 h-11 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{album.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{album.artistName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="px-6 pb-6 pt-2">
              <button onClick={() => setSearchSlot(null)} className="w-full py-2.5 border border-border rounded-xl text-sm text-zinc-500 hover:text-zinc-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
