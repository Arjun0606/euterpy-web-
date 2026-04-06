"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getArtworkUrl } from "@/lib/apple-music/client";

type Step = "rate" | "gtkm" | "follow";

interface AlbumResult {
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  dbId?: string | null;
}

interface RatedAlbum extends AlbumResult {
  score: number;
  dbId: string;
}

interface SuggestedUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  album_count: number;
  overlap: number;
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function WelcomePage() {
  const [step, setStep] = useState<Step>("rate");
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Step 1: Rate
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AlbumResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumResult | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratedAlbums, setRatedAlbums] = useState<RatedAlbum[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Step 2: GTKM
  const [gtkmSearch, setGtkmSearch] = useState("");
  const [gtkmResults, setGtkmResults] = useState<AlbumResult[]>([]);
  const [gtkmLoading, setGtkmLoading] = useState(false);
  const [gtkmSlot, setGtkmSlot] = useState<number | null>(null);
  const [gtkmSelections, setGtkmSelections] = useState<(RatedAlbum | null)[]>([null, null, null]);
  const [gtkmStories, setGtkmStories] = useState(["", "", ""]);
  const gtkmDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Step 3: Follow
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Try to get user, retry once if not immediately available (post-signup timing)
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // Session might not be ready yet — wait and retry
        await new Promise((r) => setTimeout(r, 1000));
        const { data: { user: retryUser } } = await supabase.auth.getUser();
        if (retryUser) setUserId(retryUser.id);
      }
    }
    getUser();
  }, []);

  // Search for albums (step 1)
  const searchAlbums = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/albums/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSearchResults((data.results || []).slice(0, 8));
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }, []);

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAlbums(value), 350);
  }

  async function handleRateAlbum() {
    if (!selectedAlbum || ratingScore === 0 || !userId) return;
    setSaving(true);

    try {
      // Ensure album exists in DB via API (uses service role to insert)
      const res = await fetch(`/api/albums/${selectedAlbum.appleId}`);
      const data = await res.json();
      if (!data.album) { setSaving(false); return; }
      const albumDbId = data.album.id;

      // Check if already rated
      const { data: existing } = await supabase
        .from("ratings")
        .select("id")
        .eq("user_id", userId)
        .eq("album_id", albumDbId)
        .single();

      if (existing) {
        // Update existing rating
        await supabase
          .from("ratings")
          .update({ score: ratingScore })
          .eq("id", existing.id);
      } else {
        // Insert new rating
        const { error } = await supabase
          .from("ratings")
          .insert({ user_id: userId, album_id: albumDbId, score: ratingScore });

        if (error) {
          setSaving(false);
          return;
        }
      }

      setRatedAlbums((prev) => [
        ...prev.filter((a) => a.appleId !== selectedAlbum.appleId),
        { ...selectedAlbum, dbId: albumDbId, score: ratingScore },
      ]);
    } catch {
      // silent
    }

    setSelectedAlbum(null);
    setRatingScore(0);
    setSearchQuery("");
    setSearchResults([]);
    setSaving(false);
  }

  // Search for GTKM albums (step 2)
  const searchGtkm = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setGtkmResults([]); return; }
    setGtkmLoading(true);
    try {
      const res = await fetch(`/api/albums/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setGtkmResults((data.results || []).slice(0, 6));
    } catch { setGtkmResults([]); }
    setGtkmLoading(false);
  }, []);

  function handleGtkmSearchInput(value: string) {
    setGtkmSearch(value);
    if (gtkmDebounceRef.current) clearTimeout(gtkmDebounceRef.current);
    gtkmDebounceRef.current = setTimeout(() => searchGtkm(value), 350);
  }

  async function handleSelectGtkmAlbum(album: AlbumResult) {
    if (gtkmSlot === null) return;
    // Ensure it's in DB
    const res = await fetch(`/api/albums/${album.appleId}`);
    const { album: dbAlbum } = await res.json();
    if (!dbAlbum) return;

    const next = [...gtkmSelections];
    next[gtkmSlot] = { ...album, dbId: dbAlbum.id, score: 0 };
    setGtkmSelections(next);
    setGtkmSlot(null);
    setGtkmSearch("");
    setGtkmResults([]);
  }

  async function submitGtkm() {
    if (!userId) return;
    setSaving(true);

    for (let i = 0; i < 3; i++) {
      const album = gtkmSelections[i];
      if (!album?.dbId) continue;
      await supabase.from("get_to_know_me").upsert(
        { user_id: userId, position: i + 1, album_id: album.dbId, story: gtkmStories[i].trim() || null },
        { onConflict: "user_id,position" }
      );
    }

    setSaving(false);
    await loadSuggestions();
    setStep("follow");
  }

  async function loadSuggestions() {
    if (!userId || ratedAlbums.length === 0) return;
    const albumIds = ratedAlbums.map((a) => a.dbId);

    const { data: similar } = await supabase
      .from("ratings")
      .select("user_id, profiles(id, username, display_name, avatar_url, album_count)")
      .in("album_id", albumIds)
      .neq("user_id", userId)
      .limit(50);

    if (similar) {
      const overlap: Record<string, { count: number; profile: any }> = {};
      for (const r of similar) {
        const uid = r.user_id;
        if (!overlap[uid]) overlap[uid] = { count: 0, profile: r.profiles };
        overlap[uid].count++;
      }
      setSuggestedUsers(
        Object.values(overlap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map((u) => ({ ...u.profile, overlap: u.count }))
      );
    }
  }

  async function handleFollow(targetId: string) {
    if (!userId) return;
    const next = new Set(followedIds);
    if (next.has(targetId)) {
      next.delete(targetId);
      await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
    } else {
      next.add(targetId);
      await supabase.from("follows").insert({ follower_id: userId, following_id: targetId });
    }
    setFollowedIds(next);
  }

  const gtkmLabels = ["The album that shaped me", "The one I keep coming back to", "The one that changed everything"];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {["rate", "gtkm", "follow"].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              s === step ? "bg-accent"
                : (step === "gtkm" && s === "rate") || (step === "follow" && s !== "follow") ? "bg-accent/40"
                : "bg-border"
            }`} />
          ))}
        </div>

        {/* ===== STEP 1: RATE ===== */}
        {step === "rate" && (
          <div>
            <h1 className="font-display text-3xl mb-2">Welcome to Euterpy</h1>
            <p className="text-muted mb-6">Search and rate at least 5 albums to build your shelf.</p>

            {/* Search */}
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search for an album..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors"
              />
              {searchLoading && <p className="text-xs text-muted mt-2">Searching Apple Music...</p>}

              {/* Results */}
              {searchResults.length > 0 && !selectedAlbum && (
                <div className="mt-2 border border-border rounded-xl bg-background overflow-hidden">
                  {searchResults.map((album) => (
                    <button
                      key={album.appleId}
                      onClick={() => { setSelectedAlbum(album); setSearchResults([]); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-card-hover transition-colors text-left"
                    >
                      {album.artworkUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art(album.artworkUrl, 80)!} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{album.title}</p>
                        <p className="text-xs text-muted truncate">{album.artistName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected album — rate it */}
            {selectedAlbum && (
              <div className="bg-card border border-border rounded-xl p-5 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  {selectedAlbum.artworkUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art(selectedAlbum.artworkUrl, 160)!} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedAlbum.title}</p>
                    <p className="text-sm text-muted truncate">{selectedAlbum.artistName}</p>
                  </div>
                  <button onClick={() => { setSelectedAlbum(null); setRatingScore(0); }} className="text-xs text-muted hover:text-foreground">Cancel</button>
                </div>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} onClick={() => setRatingScore(v === ratingScore ? 0 : v)}
                      className={`text-3xl transition-colors ${v <= ratingScore ? "text-accent" : "text-border hover:text-accent/50"}`}>★</button>
                  ))}
                </div>
                <button
                  onClick={handleRateAlbum}
                  disabled={ratingScore === 0 || saving}
                  className="w-full py-2.5 bg-accent text-white font-medium rounded-lg text-sm hover:bg-accent-hover disabled:opacity-40"
                >
                  {saving ? "Saving..." : `Log ★ ${ratingScore}`}
                </button>
              </div>
            )}

            {/* Rated albums so far */}
            {ratedAlbums.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-muted/40 mb-3">Rated ({ratedAlbums.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {ratedAlbums.map((album) => (
                    <div key={album.appleId} className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full">
                      {album.artworkUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art(album.artworkUrl, 40)!} alt="" className="w-5 h-5 rounded object-cover" />
                      )}
                      <span className="text-xs font-medium truncate max-w-[120px]">{album.title}</span>
                      <span className="text-xs text-accent">★{album.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue button */}
            <button
              onClick={() => setStep("gtkm")}
              disabled={ratedAlbums.length < 5}
              className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-40 transition-all text-sm sticky bottom-4"
            >
              {ratedAlbums.length < 5 ? `Rate ${5 - ratedAlbums.length} more to continue` : `Continue with ${ratedAlbums.length} ratings`}
            </button>
          </div>
        )}

        {/* ===== STEP 2: GET TO KNOW ME ===== */}
        {step === "gtkm" && (
          <div>
            <h1 className="font-display text-3xl mb-2">Tell your story in 3 albums</h1>
            <p className="text-muted mb-8">These are the hero of your profile. Search for any album.</p>

            <div className="space-y-4">
              {[0, 1, 2].map((position) => {
                const selected = gtkmSelections[position];

                return (
                  <div key={position} className="bg-card border border-border rounded-xl p-5">
                    <p className="text-accent text-xs font-medium mb-3">{gtkmLabels[position]}</p>

                    {selected ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          {selected.artworkUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={art(selected.artworkUrl, 80)!} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selected.title}</p>
                            <p className="text-xs text-muted truncate">{selected.artistName}</p>
                          </div>
                          <button onClick={() => { const next = [...gtkmSelections]; next[position] = null; setGtkmSelections(next); }}
                            className="text-xs text-muted hover:text-foreground">Change</button>
                        </div>
                        <input
                          type="text"
                          value={gtkmStories[position]}
                          onChange={(e) => { const next = [...gtkmStories]; next[position] = e.target.value; setGtkmStories(next); }}
                          placeholder="Why this album? (optional)"
                          maxLength={500}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent"
                        />
                      </div>
                    ) : (
                      <div>
                        {gtkmSlot === position ? (
                          <div>
                            <input
                              type="text"
                              value={gtkmSearch}
                              onChange={(e) => handleGtkmSearchInput(e.target.value)}
                              placeholder="Search for an album..."
                              autoFocus
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent mb-2"
                            />
                            {gtkmLoading && <p className="text-xs text-muted">Searching...</p>}
                            {gtkmResults.length > 0 && (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {gtkmResults.map((album) => (
                                  <button
                                    key={album.appleId}
                                    onClick={() => handleSelectGtkmAlbum(album)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover text-left"
                                  >
                                    {album.artworkUrl && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={art(album.artworkUrl, 60)!} alt="" className="w-9 h-9 rounded object-cover" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{album.title}</p>
                                      <p className="text-xs text-muted truncate">{album.artistName}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            <button onClick={() => { setGtkmSlot(null); setGtkmSearch(""); setGtkmResults([]); }}
                              className="text-xs text-muted mt-2 hover:text-foreground">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setGtkmSlot(position)}
                            className="w-full py-3 border border-dashed border-border rounded-lg text-sm text-muted/40 hover:text-muted hover:border-accent/30 transition-colors"
                          >
                            Search and add an album
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={async () => { await loadSuggestions(); setStep("follow"); }}
                className="flex-1 py-3 border border-border rounded-xl text-sm text-muted hover:text-foreground">Skip</button>
              <button onClick={submitGtkm} disabled={!gtkmSelections.some(Boolean) || saving}
                className="flex-1 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-40 text-sm">
                {saving ? "Saving..." : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: FOLLOW ===== */}
        {step === "follow" && (
          <div>
            <h1 className="font-display text-3xl mb-2">Find your people</h1>
            <p className="text-muted mb-8">Follow curators to fill your feed.</p>

            {suggestedUsers.length > 0 ? (
              <div className="space-y-2">
                {suggestedUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-lg text-muted shrink-0 overflow-hidden">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{user.display_name || user.username}</p>
                      <p className="text-xs text-muted">{user.album_count} albums · {user.overlap} in common</p>
                    </div>
                    <button
                      onClick={() => handleFollow(user.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                        followedIds.has(user.id) ? "border border-border text-muted" : "bg-accent text-white hover:bg-accent-hover"
                      }`}
                    >
                      {followedIds.has(user.id) ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted">No suggestions yet.</p>
                <p className="text-xs text-muted/40 mt-1">Discover people later on the Discover page.</p>
              </div>
            )}

            <button
              onClick={() => router.push("/feed")}
              className="w-full mt-8 py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-all text-sm"
            >
              {followedIds.size > 0 ? `Enter Euterpy` : "Enter Euterpy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
