"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  album_count: number;
}

export default function PeopleSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const term = q.trim().toLowerCase();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, album_count")
      .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
      .order("album_count", { ascending: false })
      .limit(8);
    setResults(data || []);
    setSearching(false);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative mb-10">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search for curators..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setFocused(true)}
          className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-xl text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 transition-colors"
        />
      </div>

      {focused && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-2xl z-30 overflow-hidden">
          {searching && <p className="px-4 py-3 text-xs text-zinc-600">Searching...</p>}
          {!searching && results.length === 0 && query.length >= 2 && (
            <p className="px-4 py-3 text-xs text-zinc-600">No curators found.</p>
          )}
          {results.map((user) => (
            <Link
              key={user.id}
              href={`/${user.username}`}
              onClick={() => setFocused(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-card-hover transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-sm text-zinc-600">{user.username[0].toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.display_name || user.username}</p>
                <p className="text-xs text-accent">@{user.username}</p>
              </div>
              <span className="text-[11px] text-zinc-600 shrink-0">{user.album_count} albums</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
