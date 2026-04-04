"use client";

import { useState, useRef, useCallback } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";

// Hardcoded test user ID from Supabase
const TEST_USER_ID = "50529ee4-72ed-4595-b1a9-5ee51870c8d5";
const SUPABASE_URL = "https://xnnfbhjxcrlryjrmgtcv.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubmZiaGp4Y3Jscnlqcm1ndGN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTMwMDgwNCwiZXhwIjoyMDkwODc2ODA0fQ.qaDfTjtjjC9io_AsZH84HG4d4MiujidI0omFhdNrYU4";

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
type Action = "rate" | "gtkm" | "shelf";

async function sbFetch(path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: body ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function sbPatch(path: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function TestPage() {
  const [tab, setTab] = useState<Tab>("albums");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<Action>("rate");
  const [log, setLog] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Rating state
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [score, setScore] = useState(0);
  const [reaction, setReaction] = useState("");
  const [ownership, setOwnership] = useState("digital");

  // GTKM state
  const [gtkmPosition, setGtkmPosition] = useState(1);
  const [gtkmStory, setGtkmStory] = useState("");

  // Shelf state
  const [shelfName, setShelfName] = useState("");

  function addLog(msg: string) {
    setLog((prev) => [msg, ...prev].slice(0, 20));
  }

  const search = useCallback(
    async (q: string, searchTab: Tab) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const endpoint =
          searchTab === "albums" ? "/api/albums/search" : "/api/songs/search";
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    },
    []
  );

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value, tab), 400);
  }

  async function ensureAlbumInDb(appleId: string): Promise<any> {
    const res = await fetch(`/api/albums/${appleId}`);
    const data = await res.json();
    return data.album;
  }

  async function ensureSongInDb(appleId: string): Promise<any> {
    const res = await fetch(`/api/songs/${appleId}`);
    const data = await res.json();
    return data.song;
  }

  async function handleRate() {
    if (!selectedItem || score === 0) return;

    try {
      if (tab === "albums") {
        const album = await ensureAlbumInDb(selectedItem.appleId);
        await sbFetch("ratings", {
          user_id: TEST_USER_ID,
          album_id: album.id,
          score,
          reaction: reaction.trim() || null,
          ownership,
        });
        addLog(`★ ${score} — ${selectedItem.title} by ${selectedItem.artistName} (${ownership})`);
      } else {
        const song = await ensureSongInDb(selectedItem.appleId);
        await sbFetch("song_ratings", {
          user_id: TEST_USER_ID,
          song_id: song.id,
          score,
          reaction: reaction.trim() || null,
        });
        addLog(`★ ${score} — ${selectedItem.title} (song)`);
      }
      setSelectedItem(null);
      setScore(0);
      setReaction("");
      setOwnership("digital");
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }
  }

  async function handleGTKM() {
    if (!selectedItem || tab !== "albums") return;

    try {
      const album = await ensureAlbumInDb(selectedItem.appleId);

      // Upsert GTKM
      const existing = await fetch(
        `${SUPABASE_URL}/rest/v1/get_to_know_me?user_id=eq.${TEST_USER_ID}&position=eq.${gtkmPosition}`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      ).then((r) => r.json());

      if (existing.length > 0) {
        await sbPatch(
          `get_to_know_me?id=eq.${existing[0].id}`,
          { album_id: album.id, story: gtkmStory.trim() || null }
        );
      } else {
        await sbFetch("get_to_know_me", {
          user_id: TEST_USER_ID,
          position: gtkmPosition,
          album_id: album.id,
          story: gtkmStory.trim() || null,
        });
      }
      addLog(`GTKM #${gtkmPosition}: ${selectedItem.title}`);
      setSelectedItem(null);
      setGtkmStory("");
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }
  }

  async function handleAddToShelf() {
    if (!selectedItem) return;

    try {
      let shelfId: string;

      if (shelfName === "favorites") {
        // Get favorites shelf
        const shelves = await fetch(
          `${SUPABASE_URL}/rest/v1/shelves?user_id=eq.${TEST_USER_ID}&is_favorites=eq.true`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        ).then((r) => r.json());
        shelfId = shelves[0]?.id;
      } else {
        // Create or get named shelf
        const existing = await fetch(
          `${SUPABASE_URL}/rest/v1/shelves?user_id=eq.${TEST_USER_ID}&title=eq.${encodeURIComponent(shelfName)}`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        ).then((r) => r.json());

        if (existing.length > 0) {
          shelfId = existing[0].id;
        } else {
          const created = await sbFetch("shelves", {
            user_id: TEST_USER_ID,
            title: shelfName,
          });
          shelfId = created[0]?.id;
          addLog(`Created shelf: "${shelfName}"`);
        }
      }

      if (tab === "albums") {
        const album = await ensureAlbumInDb(selectedItem.appleId);
        await sbFetch("shelf_items", {
          shelf_id: shelfId,
          item_type: "album",
          album_id: album.id,
          position: 0,
        });
      } else {
        const song = await ensureSongInDb(selectedItem.appleId);
        await sbFetch("shelf_items", {
          shelf_id: shelfId,
          item_type: "song",
          song_id: song.id,
          position: 0,
        });
      }
      addLog(`Added to "${shelfName}": ${selectedItem.title}`);
      setSelectedItem(null);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }
  }

  function artwork(url: string | null, size = 100): string | null {
    if (!url) return null;
    return getArtworkUrl(url, size, size);
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl mb-2">Euterpy Test Console</h1>
        <p className="text-muted text-sm mb-1">
          Populating profile: <a href="/arjun" className="text-accent hover:underline">@arjun</a>
          {" · "}
          <a href="/arjun/stats" className="text-accent hover:underline">Stats</a>
        </p>
        <p className="text-muted/40 text-xs mb-8">
          Real Apple Music data → Supabase → renders on profile
        </p>

        {/* Action selector */}
        <div className="flex gap-2 mb-4">
          {(["rate", "gtkm", "shelf"] as Action[]).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                action === a
                  ? "bg-accent text-white"
                  : "bg-card border border-border text-muted hover:text-foreground"
              }`}
            >
              {a === "rate" ? "Rate" : a === "gtkm" ? "Get to Know Me" : "Add to Shelf"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
            <button
              onClick={() => { setTab("albums"); if (query.length >= 2) search(query, "albums"); }}
              className={`px-4 py-1.5 text-sm rounded-md ${tab === "albums" ? "bg-accent text-white" : "text-muted"}`}
            >
              Albums
            </button>
            <button
              onClick={() => { setTab("songs"); if (query.length >= 2) search(query, "songs"); }}
              className={`px-4 py-1.5 text-sm rounded-md ${tab === "songs" ? "bg-accent text-white" : "text-muted"}`}
            >
              Songs
            </button>
          </div>
          <input
            type="text"
            placeholder={`Search ${tab}...`}
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent text-sm"
          />
        </div>

        {/* Results */}
        {loading && <p className="text-muted text-sm py-4">Searching Apple Music...</p>}

        <div className="space-y-1 mb-6 max-h-[300px] overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.appleId}
              onClick={() => setSelectedItem(item)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                selectedItem?.appleId === item.appleId
                  ? "bg-accent/10 border border-accent/30"
                  : "hover:bg-card-hover"
              }`}
            >
              {item.artworkUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artwork(item.artworkUrl)!}
                  alt=""
                  className="w-12 h-12 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted truncate">
                  {item.artistName}
                  {item.albumName && <span className="text-muted/40"> · {item.albumName}</span>}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Action panel */}
        {selectedItem && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <p className="text-sm font-medium mb-1">{selectedItem.title}</p>
            <p className="text-xs text-muted mb-4">{selectedItem.artistName}</p>

            {action === "rate" && (
              <div className="space-y-4">
                {/* Stars */}
                <div>
                  <p className="text-xs text-muted mb-2">Rating</p>
                  <div className="flex gap-1">
                    {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setScore(v === score ? 0 : v)}
                        className={`text-xl ${v <= score ? "text-accent" : "text-border"}`}
                        style={{
                          display: "inline-block",
                          overflow: "hidden",
                          width: v % 1 !== 0 ? "0.55em" : "auto",
                        }}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs text-muted ml-2 self-center">{score > 0 ? `${score}/5` : ""}</span>
                  </div>
                </div>

                {/* Reaction */}
                <div>
                  <p className="text-xs text-muted mb-2">Say something...</p>
                  <input
                    type="text"
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                    placeholder="Track 6 broke me."
                    maxLength={280}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Ownership — only for albums */}
                {tab === "albums" && (
                  <div>
                    <p className="text-xs text-muted mb-2">How do you own it?</p>
                    <div className="flex gap-2">
                      {["vinyl", "cd", "cassette", "digital"].map((o) => (
                        <button
                          key={o}
                          onClick={() => setOwnership(o)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            ownership === o
                              ? "bg-accent text-white"
                              : "bg-background border border-border text-muted hover:text-foreground"
                          }`}
                        >
                          {o === "vinyl" ? "🎵 Vinyl" : o === "cd" ? "💿 CD" : o === "cassette" ? "📼 Cassette" : "🎧 Stream"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRate}
                  disabled={score === 0}
                  className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40"
                >
                  Log {tab === "albums" ? "Album" : "Song"}
                </button>
              </div>
            )}

            {action === "gtkm" && (
              <div className="space-y-4">
                {tab !== "albums" && (
                  <p className="text-sm text-red-400">Get to Know Me only works with albums. Switch to Albums tab.</p>
                )}
                {tab === "albums" && (
                  <>
                    <div>
                      <p className="text-xs text-muted mb-2">Position</p>
                      <div className="flex gap-2">
                        {[1, 2, 3].map((p) => (
                          <button
                            key={p}
                            onClick={() => setGtkmPosition(p)}
                            className={`px-4 py-2 rounded-lg text-sm ${
                              gtkmPosition === p
                                ? "bg-accent text-white"
                                : "bg-background border border-border text-muted"
                            }`}
                          >
                            {p === 1 ? "Shaped me" : p === 2 ? "Keep coming back" : "Changed everything"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-2">Your story (why this album?)</p>
                      <textarea
                        value={gtkmStory}
                        onChange={(e) => setGtkmStory(e.target.value)}
                        placeholder="I was 16 when I first heard this..."
                        maxLength={500}
                        rows={3}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent resize-none"
                      />
                    </div>
                    <button
                      onClick={handleGTKM}
                      className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover"
                    >
                      Set as Get to Know Me #{gtkmPosition}
                    </button>
                  </>
                )}
              </div>
            )}

            {action === "shelf" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted mb-2">Shelf name</p>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {["favorites", "Late Night Drives", "Albums That Changed Me", "Guilty Pleasures"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setShelfName(s)}
                        className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                          shelfName === s
                            ? "bg-accent text-white"
                            : "bg-background border border-border text-muted hover:text-foreground"
                        }`}
                      >
                        {s === "favorites" ? "★ Favorites" : s}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={shelfName}
                    onChange={(e) => setShelfName(e.target.value)}
                    placeholder="Or type a custom shelf name..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={handleAddToShelf}
                  disabled={!shelfName}
                  className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40"
                >
                  Add to &quot;{shelfName || "..."}&quot;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-widest text-muted mb-2">Activity Log</h3>
            <div className="space-y-1 text-xs text-muted/60">
              {log.map((msg, i) => (
                <p key={i}>{msg}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
