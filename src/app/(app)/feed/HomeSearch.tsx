"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

interface AlbumResult {
  kind: "album";
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
}

interface SongResult {
  kind: "song";
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  albumName?: string | null;
}

type Result = AlbumResult | SongResult;

export default function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      // Interleave: 3 albums, then 3 songs, then more albums
      const albums: AlbumResult[] = (data.albums || []).slice(0, 5).map((a: any) => ({ ...a, kind: "album" }));
      const songs: SongResult[] = (data.songs || []).slice(0, 5).map((s: any) => ({ ...s, kind: "song" }));
      const merged: Result[] = [];
      const max = Math.max(albums.length, songs.length);
      for (let i = 0; i < max; i++) {
        if (albums[i]) merged.push(albums[i]);
        if (songs[i]) merged.push(songs[i]);
      }
      setResults(merged.slice(0, 8));
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 350);
  }

  return (
    <div className="relative mb-8">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search albums, songs, artists..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 transition-colors"
        />
      </div>

      {focused && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {loading && <p className="px-4 py-3 text-xs text-muted">Searching...</p>}
          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="px-4 py-3 text-xs text-muted">No results.</p>
          )}
          {results.map((item) => (
            <Link
              key={`${item.kind}-${item.appleId}`}
              href={item.kind === "album" ? `/album/${item.appleId}` : `/song/${item.appleId}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-hover transition-colors"
            >
              {item.artworkUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.artworkUrl} alt="" className="w-9 h-9 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted truncate">{item.artistName}</p>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-zinc-700 shrink-0">
                {item.kind}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
