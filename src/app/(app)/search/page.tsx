"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface AlbumResult {
  kind: "album";
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  releaseDate?: string | null;
}

interface SongResult {
  kind: "song";
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  albumName?: string | null;
  durationMs?: number | null;
}

export default function SearchPage() {
  const params = useSearchParams();
  const initial = params.get("q") || "";
  const [query, setQuery] = useState(initial);
  const [albums, setAlbums] = useState<AlbumResult[]>([]);
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setAlbums([]);
      setSongs([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setAlbums(data.albums || []);
      setSongs(data.songs || []);
    } catch {
      setAlbums([]);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial) search(initial);
  }, [initial, search]);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 350);
  }

  function formatDuration(ms: number): string {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Search</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">
          Find <span className="italic text-accent">your sound.</span>
        </h1>
      </div>

      {/* Search input */}
      <div className="relative mb-10">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Albums, songs, artists..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          autoFocus
          className="w-full pl-12 pr-4 py-4 bg-input border border-border rounded-2xl text-base text-foreground placeholder:text-muted/40 focus:outline-none focus:border-zinc-700 transition-colors"
        />
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-center text-zinc-600 text-sm py-12">Searching...</p>
      )}

      {/* Empty */}
      {!loading && searched && albums.length === 0 && songs.length === 0 && (
        <p className="text-center text-zinc-600 text-sm py-12">No results. Try a different search.</p>
      )}

      {!loading && !searched && (
        <p className="text-center text-zinc-700 text-xs py-12">Type something to start.</p>
      )}

      {/* Albums */}
      {!loading && albums.length > 0 && (
        <section className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">Albums</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {albums.slice(0, 9).map((item) => (
              <Link key={item.appleId} href={`/album/${item.appleId}`} className="group">
                <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-accent/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                  {item.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.artworkUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-zinc-500 truncate">{item.artistName}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Songs */}
      {!loading && songs.length > 0 && (
        <section className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">Songs</p>
          <div className="border border-border rounded-xl overflow-hidden">
            {songs.slice(0, 12).map((item, i) => (
              <Link
                key={item.appleId}
                href={`/song/${item.appleId}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-card-hover transition-colors group ${i !== Math.min(songs.length, 12) - 1 ? "border-b border-border/50" : ""}`}
              >
                <div className="w-11 h-11 rounded-md overflow-hidden bg-card border border-border shrink-0">
                  {item.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.artworkUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-border">♪</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{item.title}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {item.artistName}
                    {item.albumName && <span className="text-zinc-700"> · {item.albumName}</span>}
                  </p>
                </div>
                {item.durationMs && (
                  <span className="text-xs text-zinc-600 tabular-nums shrink-0">{formatDuration(item.durationMs)}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
