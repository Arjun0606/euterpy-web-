"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  kind: "album" | "song";
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
}

interface DraftItem {
  kind: "album" | "song";
  apple_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  caption: string;
}

interface Props {
  existing?: {
    id: string;
    period_label: string | null;
    items: Array<{
      kind: "album" | "song";
      target_apple_id: string;
      target_title: string;
      target_artist: string;
      target_artwork_url: string | null;
      caption: string | null;
    }>;
  } | null;
  onClose: () => void;
}

const MAX_ITEMS = 10;

function defaultLabel(): string {
  const d = new Date();
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function ChartComposer({ existing, onClose }: Props) {
  const router = useRouter();
  const [periodLabel, setPeriodLabel] = useState(existing?.period_label || defaultLabel());
  const [items, setItems] = useState<DraftItem[]>(
    existing?.items.map((it) => ({
      kind: it.kind,
      apple_id: it.target_apple_id,
      title: it.target_title,
      artist: it.target_artist,
      artwork_url: it.target_artwork_url,
      caption: it.caption || "",
    })) || []
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isEdit = !!existing;

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      const albums: SearchResult[] = (data.albums || []).slice(0, 4).map((a: any) => ({ ...a, kind: "album" }));
      const songs: SearchResult[] = (data.songs || []).slice(0, 4).map((s: any) => ({ ...s, kind: "song" }));
      const merged: SearchResult[] = [];
      const max = Math.max(albums.length, songs.length);
      for (let i = 0; i < max; i++) {
        if (albums[i]) merged.push(albums[i]);
        if (songs[i]) merged.push(songs[i]);
      }
      setResults(merged.slice(0, 6));
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, []);

  function handleSearchInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function addItem(result: SearchResult) {
    if (items.length >= MAX_ITEMS) {
      toast(`Max ${MAX_ITEMS} items in a chart`);
      return;
    }
    if (items.some((it) => it.kind === result.kind && it.apple_id === result.appleId)) {
      toast("Already in this chart");
      return;
    }
    setItems([
      ...items,
      {
        kind: result.kind,
        apple_id: result.appleId,
        title: result.title,
        artist: result.artistName,
        artwork_url: result.artworkUrl,
        caption: "",
      },
    ]);
    setQuery("");
    setResults([]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateCaption(idx: number, caption: string) {
    setItems(items.map((it, i) => (i === idx ? { ...it, caption } : it)));
  }

  function onDragStart(idx: number) {
    setDraggedIdx(idx);
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const next = [...items];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(idx, 0, moved);
    setItems(next);
    setDraggedIdx(idx);
  }

  function onDragEnd() {
    setDraggedIdx(null);
  }

  async function handleSave() {
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to save");
        return;
      }

      let chartId: string;

      if (isEdit) {
        const { error } = await supabase
          .from("charts")
          .update({ period_label: periodLabel.trim() || null })
          .eq("id", existing!.id);
        if (error) throw error;
        chartId = existing!.id;
        await supabase.from("chart_items").delete().eq("chart_id", chartId);
      } else {
        const { data, error } = await supabase
          .from("charts")
          .insert({ user_id: user.id, period_label: periodLabel.trim() || null })
          .select("id")
          .single();
        if (error) throw error;
        chartId = data.id;
      }

      const itemRows = items.slice(0, MAX_ITEMS).map((it, i) => ({
        chart_id: chartId,
        position: i + 1,
        kind: it.kind,
        target_apple_id: it.apple_id,
        target_title: it.title,
        target_artist: it.artist,
        target_artwork_url: it.artwork_url,
        caption: it.caption.trim() || null,
      }));

      const { error: itemsError } = await supabase.from("chart_items").insert(itemRows);
      if (itemsError) throw itemsError;

      toast(isEdit ? "Chart saved" : "Chart published");
      onClose();
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Delete this chart?")) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("charts").delete().eq("id", existing!.id);
      toast("Chart deleted");
      onClose();
      router.refresh();
    } catch {
      toast.error("Couldn't delete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      <div
        className="relative w-full sm:max-w-2xl bg-background sm:bg-card sm:border sm:border-border sm:rounded-3xl flex flex-col max-h-screen sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-sm transition-colors">
            ✕ Close
          </button>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{isEdit ? "Edit chart" : "My ten right now"}</p>
          <button
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="px-4 py-1.5 bg-accent text-white rounded-full text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-30"
          >
            {saving ? "Saving..." : isEdit ? "Save" : "Publish"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
          {/* Period label */}
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-2">— The period</p>
          <input
            type="text"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            maxLength={60}
            placeholder="April 2026 / Right now / This week"
            className="w-full bg-transparent border-none text-2xl sm:text-3xl font-display tracking-tight italic text-white placeholder:text-zinc-700 focus:outline-none mb-8"
          />

          {/* Items */}
          {items.length > 0 && (
            <div className="mb-8 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-3">— {items.length} of {MAX_ITEMS}</p>
              {items.map((item, idx) => (
                <div
                  key={`${item.kind}-${item.apple_id}-${idx}`}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDragEnd={onDragEnd}
                  className={`flex items-start gap-3 p-3 rounded-xl bg-card border border-border hover:border-zinc-700 transition-colors ${
                    draggedIdx === idx ? "opacity-50" : ""
                  }`}
                >
                  <span className="font-display text-2xl text-zinc-700 tabular-nums w-8 text-right shrink-0 cursor-grab">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {item.artwork_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.artwork_url.replace("{w}", "120").replace("{h}", "120")}
                      alt=""
                      className="w-12 h-12 rounded-md object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-zinc-600 truncate mb-2">{item.artist}</p>
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => updateCaption(idx, e.target.value)}
                      maxLength={280}
                      placeholder="Why this one (optional)"
                      className="editorial w-full bg-transparent border-none text-xs text-zinc-400 placeholder:text-zinc-700 focus:outline-none italic"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-zinc-700 hover:text-red-400 text-xs px-2 transition-colors shrink-0"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          {items.length < MAX_ITEMS && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-3">— Add to chart</p>
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search albums, songs..."
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
              />

              {searching && <p className="text-center text-zinc-600 text-xs py-3">Searching...</p>}

              {!searching && results.length > 0 && (
                <div className="mt-2 space-y-1">
                  {results.map((r) => (
                    <button
                      key={`${r.kind}-${r.appleId}`}
                      onClick={() => addItem(r)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-card text-left transition-colors"
                    >
                      {r.artworkUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.artworkUrl} alt="" className="w-9 h-9 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{r.title}</p>
                        <p className="text-[11px] text-zinc-600 truncate">{r.artistName}</p>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-700 shrink-0">{r.kind}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isEdit && (
          <div className="px-6 py-4 border-t border-border flex justify-between items-center">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
            >
              Delete chart
            </button>
            <p className="text-[10px] text-zinc-700">Drag to reorder</p>
          </div>
        )}
        {!isEdit && (
          <div className="px-6 py-4 border-t border-border text-center">
            <p className="text-[10px] text-zinc-700">Drag to reorder · max {MAX_ITEMS}</p>
          </div>
        )}
      </div>
    </div>
  );
}
