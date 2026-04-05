"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";

interface SearchResult {
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  releaseDate?: string | null;
  albumTitle?: string | null;
  durationMs?: number | null;
}

type SearchTab = "albums" | "songs";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("albums");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(
    async (q: string, searchTab: SearchTab) => {
      if (q.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      const endpoint =
        searchTab === "albums" ? "/api/albums/search" : "/api/songs/search";

      try {
        const res = await fetch(
          `${endpoint}?q=${encodeURIComponent(q.trim())}`
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value, tab), 400);
  }

  function handleTabChange(newTab: SearchTab) {
    setTab(newTab);
    if (query.trim().length >= 2) {
      search(query, newTab);
    }
  }

  function formatDuration(ms: number): string {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/feed">
            <h1 className="font-display text-2xl">Euterpy</h1>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/feed"
              className="text-muted hover:text-foreground transition-colors"
            >
              Feed
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder={
              tab === "albums" ? "Search albums..." : "Search songs..."
            }
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors text-lg"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-card rounded-lg p-1 border border-border">
          <button
            onClick={() => handleTabChange("albums")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "albums"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Albums
          </button>
          <button
            onClick={() => handleTabChange("songs")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "songs"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Songs
          </button>
        </div>

        {/* Results */}
        {loading && (
          <p className="text-center text-muted text-sm py-8">Searching...</p>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-center text-muted text-sm py-8">
            No {tab} found.
          </p>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-1">
            {results.map((item) => (
              <Link
                key={item.appleId}
                href={
                  tab === "albums"
                    ? `/album/${item.appleId}`
                    : `/song/${item.appleId}`
                }
                className="flex items-center gap-4 p-3 -mx-3 rounded-lg hover:bg-card-hover transition-colors"
              >
                {/* Cover art */}
                <div
                  className={`${tab === "songs" ? "w-11 h-11" : "w-14 h-14"} rounded bg-card border border-border overflow-hidden shrink-0`}
                >
                  {item.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.artworkUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-border">
                      ♪
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted truncate">
                    {item.artistName}
                    {tab === "songs" && item.albumTitle && (
                      <span className="text-muted/40">
                        {" · "}
                        {item.albumTitle}
                      </span>
                    )}
                  </p>
                </div>

                {/* Meta */}
                <div className="text-xs text-muted/40 shrink-0">
                  {tab === "albums" && item.releaseDate && (
                    <span>{item.releaseDate.substring(0, 4)}</span>
                  )}
                  {tab === "songs" && item.durationMs && (
                    <span>{formatDuration(item.durationMs)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-16">
            <p className="text-muted text-sm">
              Search for {tab === "albums" ? "an album" : "a song"} to rate it.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
