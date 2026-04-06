"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Link from "next/link";

interface SearchResult {
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
}

function art(url: string | null, size = 80): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/albums/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults((data.results || []).slice(0, 5));
    } catch { setResults([]); }
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

      {/* Dropdown results */}
      {focused && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {loading && (
            <p className="px-4 py-3 text-xs text-muted">Searching...</p>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="px-4 py-3 text-xs text-muted">No results. Try a different search.</p>
          )}
          {results.map((item) => (
            <Link
              key={item.appleId}
              href={`/album/${item.appleId}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-hover transition-colors"
            >
              {item.artworkUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={art(item.artworkUrl)!} alt="" className="w-9 h-9 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted truncate">{item.artistName}</p>
              </div>
            </Link>
          ))}
          {query.length >= 2 && (
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="block px-4 py-2.5 text-xs text-accent hover:bg-card-hover border-t border-border"
            >
              See all results for &ldquo;{query}&rdquo;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
