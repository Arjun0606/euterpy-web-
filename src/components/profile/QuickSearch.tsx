"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { createClient } from "@/lib/supabase/client";

interface SearchResult {
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  releaseDate?: string | null;
  albumName?: string | null;
  durationMs?: number | null;
}

type Tab = "albums" | "songs";

function artwork(url: string | null, size = 100): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function QuickSearch() {
  const [tab, setTab] = useState<Tab>("albums");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [score, setScore] = useState(0);
  const [reaction, setReaction] = useState("");
  const [ownership, setOwnership] = useState("digital");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const search = useCallback(async (q: string, t: Tab) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const endpoint = t === "albums" ? "/api/albums/search" : "/api/songs/search";
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value, tab), 400);
  }

  async function handleRate() {
    if (!selected || score === 0 || !userId) return;
    setSaving(true);
    try {
      if (tab === "albums") {
        const albumRes = await fetch(`/api/albums/${selected.appleId}`);
        const data = await albumRes.json();
        if (!data.album?.id) throw new Error("Album not found");
        const { error } = await supabase.from("ratings").insert({
          user_id: userId,
          album_id: data.album.id,
          score,
          reaction: reaction.trim() || null,
          ownership,
        });
        if (error) throw error;
      } else {
        const songRes = await fetch(`/api/songs/${selected.appleId}`);
        const data = await songRes.json();
        if (!data.song?.id) throw new Error("Song not found");
        const { error } = await supabase.from("song_ratings").insert({
          user_id: userId,
          song_id: data.song.id,
          score,
          reaction: reaction.trim() || null,
        });
        if (error) throw error;
      }
      setSuccess(`★ ${score} — ${selected.title}`);
      setSelected(null);
      setScore(0);
      setReaction("");
      setQuery("");
      setResults([]);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setSuccess(`Error: ${e.message}`);
    }
    setSaving(false);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {/* Tabs + Search */}
      <div className="flex gap-2 mb-3">
        <div className="flex gap-1 bg-background rounded-lg p-0.5">
          <button
            onClick={() => { setTab("albums"); if (query.length >= 2) search(query, "albums"); }}
            className={`px-3 py-1 text-xs rounded-md ${tab === "albums" ? "bg-accent text-white" : "text-muted"}`}
          >Albums</button>
          <button
            onClick={() => { setTab("songs"); if (query.length >= 2) search(query, "songs"); }}
            className={`px-3 py-1 text-xs rounded-md ${tab === "songs" ? "bg-accent text-white" : "text-muted"}`}
          >Songs</button>
        </div>
        <input
          type="text"
          placeholder={`Search ${tab}...`}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          autoFocus
          className="flex-1 px-3 py-1.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700"
        />
      </div>

      {/* Results */}
      {loading && <p className="text-xs text-muted py-2">Searching Apple Music...</p>}

      {results.length > 0 && !selected && (
        <div className="max-h-[200px] overflow-y-auto space-y-0.5 mb-3">
          {results.map((item) => (
            <button
              key={item.appleId}
              onClick={() => setSelected(item)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover text-left"
            >
              {item.artworkUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artwork(item.artworkUrl)!} alt="" className="w-10 h-10 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted truncate">{item.artistName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Rating panel */}
      {selected && (
        <div className="space-y-3 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            {selected.artworkUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artwork(selected.artworkUrl, 120)!} alt="" className="w-14 h-14 rounded-lg object-cover" />
            )}
            <div>
              <p className="text-sm font-medium">{selected.title}</p>
              <p className="text-xs text-muted">{selected.artistName}</p>
            </div>
          </div>

          {/* Stars — simple 1 to 5 */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setScore(v === score ? 0 : v)}
                className={`text-2xl transition-colors ${v <= score ? "text-accent" : "text-border hover:text-accent/50"}`}>★</button>
            ))}
            <span className="text-xs text-muted ml-3">{score > 0 ? `${score}/5` : "Tap to rate"}</span>
          </div>

          {/* Reaction */}
          <input type="text" value={reaction} onChange={(e) => setReaction(e.target.value)}
            placeholder="Say something..." maxLength={280}
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700" />

          {/* Ownership (albums only) */}
          {tab === "albums" && (
            <div className="flex gap-2">
              {[["vinyl","🎵 Vinyl"],["cd","💿 CD"],["cassette","📼 Cassette"],["digital","🎧 Stream"]].map(([o, label]) => (
                <button key={o} onClick={() => setOwnership(o)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${ownership === o ? "bg-accent text-white" : "bg-input border border-border text-muted"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setSelected(null); setScore(0); setReaction(""); }}
              className="flex-1 py-2 border border-border rounded-lg text-sm text-muted hover:text-foreground">Cancel</button>
            <button onClick={handleRate} disabled={score === 0 || saving}
              className="flex-1 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40">
              {saving ? "Saving..." : `Log ${tab === "albums" ? "Album" : "Song"}`}
            </button>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && <p className="text-xs text-accent mt-2">{success}</p>}
    </div>
  );
}
