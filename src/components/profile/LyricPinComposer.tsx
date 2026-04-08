"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SongResult {
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
}

interface Props {
  onClose: () => void;
}

export default function LyricPinComposer({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"pick" | "write">("pick");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SongResult | null>(null);
  const [lyric, setLyric] = useState("");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults((data.songs || []).slice(0, 8));
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  async function handleSave() {
    if (!selected || !lyric.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to pin a lyric");
        return;
      }
      const { error } = await supabase.from("lyric_pins").insert({
        user_id: user.id,
        song_apple_id: selected.appleId,
        song_title: selected.title,
        song_artist: selected.artistName,
        song_artwork_url: selected.artworkUrl,
        lyric: lyric.trim(),
        position: 0,
      });
      if (error) throw error;
      toast("Pinned");
      onClose();
      router.refresh();
    } catch {
      toast.error("Couldn't pin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      <div
        className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-sm transition-colors">
            ✕
          </button>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Pin a lyric</p>
          <div className="w-6" />
        </div>

        {step === "pick" && (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">— Find the song</p>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="Song title or artist..."
              className="w-full px-4 py-3 bg-input border border-border rounded-xl text-base placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors mb-5"
            />

            {searching && <p className="text-center text-zinc-600 text-sm py-6">Searching...</p>}

            {!searching && results.length === 0 && query.length >= 2 && (
              <p className="text-center text-zinc-600 text-sm py-6">No songs found.</p>
            )}

            {!searching && results.length === 0 && query.length < 2 && (
              <p className="text-center text-zinc-700 text-xs py-6">Type a song or artist to begin.</p>
            )}

            {results.length > 0 && (
              <div className="space-y-1">
                {results.map((song) => (
                  <button
                    key={song.appleId}
                    onClick={() => {
                      setSelected(song);
                      setStep("write");
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card-hover text-left transition-colors"
                  >
                    {song.artworkUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={song.artworkUrl} alt="" className="w-11 h-11 rounded-md object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{song.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{song.artistName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "write" && selected && (
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/[0.04]">
              {selected.artworkUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.artworkUrl} alt="" className="w-12 h-12 rounded-md object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selected.title}</p>
                <p className="text-xs text-zinc-500 truncate">{selected.artistName}</p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setStep("pick");
                }}
                className="text-[11px] text-zinc-600 hover:text-accent transition-colors"
              >
                Change
              </button>
            </div>

            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">— The line</p>
            <textarea
              value={lyric}
              onChange={(e) => setLyric(e.target.value)}
              maxLength={500}
              autoFocus
              rows={5}
              placeholder="Type the lyric you carry..."
              className="editorial w-full bg-transparent border-none text-2xl sm:text-3xl tracking-tight italic text-white placeholder:text-zinc-700 focus:outline-none resize-none leading-snug"
            />
            <p className="text-right text-[10px] text-zinc-700 tabular-nums mt-2">{lyric.length} / 500</p>

            <button
              onClick={handleSave}
              disabled={saving || !lyric.trim()}
              className="w-full mt-6 py-3 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-30"
            >
              {saving ? "Pinning..." : "Pin to my profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
