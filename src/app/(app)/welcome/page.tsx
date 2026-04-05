"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { SEED_ALBUMS } from "@/lib/seed-albums";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Link from "next/link";

type Step = "rate" | "gtkm" | "follow";

interface AlbumData {
  appleId: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  dbId: string | null;
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
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [gtkmSelections, setGtkmSelections] = useState<(string | null)[]>([null, null, null]);
  const [gtkmStories, setGtkmStories] = useState<string[]>(["", "", ""]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const ratedCount = Object.keys(ratings).length;
  const gtkmCount = gtkmSelections.filter(Boolean).length;
  const followCount = followedIds.size;

  // Load albums and auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    // Fetch album data from our API (ensures they exist in DB)
    async function loadAlbums() {
      const shuffled = [...SEED_ALBUMS].sort(() => Math.random() - 0.5).slice(0, 12);
      const loaded: AlbumData[] = [];
      for (const seed of shuffled) {
        try {
          const res = await fetch(`/api/albums/${seed.appleId}`);
          const data = await res.json();
          if (data.album) {
            loaded.push({
              appleId: seed.appleId,
              title: data.album.title || seed.title,
              artist: data.album.artist_name || seed.artist,
              artworkUrl: data.album.artwork_url,
              dbId: data.album.id,
            });
          }
        } catch {
          loaded.push({ appleId: seed.appleId, title: seed.title, artist: seed.artist, artworkUrl: null, dbId: null });
        }
      }
      setAlbums(loaded);
    }
    loadAlbums();
  }, []);

  function handleRate(appleId: string, score: number) {
    setRatings((prev) => {
      const next = { ...prev };
      if (next[appleId] === score) {
        delete next[appleId];
      } else {
        next[appleId] = score;
      }
      return next;
    });
  }

  async function submitRatings() {
    if (!userId || ratedCount < 5) return;
    setSaving(true);

    for (const [appleId, score] of Object.entries(ratings)) {
      const album = albums.find((a) => a.appleId === appleId);
      if (!album?.dbId) continue;
      await supabase.from("ratings").upsert(
        { user_id: userId, album_id: album.dbId, score },
        { onConflict: "user_id,album_id" }
      );
    }

    setSaving(false);
    setStep("gtkm");
  }

  async function submitGtkm() {
    if (!userId) return;
    setSaving(true);

    for (let i = 0; i < 3; i++) {
      const appleId = gtkmSelections[i];
      if (!appleId) continue;
      const album = albums.find((a) => a.appleId === appleId);
      if (!album?.dbId) continue;

      await supabase.from("get_to_know_me").upsert(
        { user_id: userId, position: i + 1, album_id: album.dbId, story: gtkmStories[i].trim() || null },
        { onConflict: "user_id,position" }
      );
    }

    setSaving(false);
    // Load suggested users for follow step
    await loadSuggestions();
    setStep("follow");
  }

  async function loadSuggestions() {
    if (!userId) return;
    const ratedAlbumIds = albums.filter((a) => ratings[a.appleId] && a.dbId).map((a) => a.dbId!);
    if (ratedAlbumIds.length === 0) return;

    const { data: similar } = await supabase
      .from("ratings")
      .select("user_id, profiles(id, username, display_name, avatar_url, album_count)")
      .in("album_id", ratedAlbumIds)
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

  function finish() {
    router.push("/feed");
  }

  const gtkmLabels = ["The album that shaped me", "The one I keep coming back to", "The one that changed everything"];
  const ratedAlbums = albums.filter((a) => ratings[a.appleId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {["rate", "gtkm", "follow"].map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              (s === "rate" && step === "rate") || (s === "gtkm" && step === "gtkm") || (s === "follow" && step === "follow")
                ? "bg-accent"
                : step === "gtkm" && s === "rate" ? "bg-accent/40"
                : step === "follow" && (s === "rate" || s === "gtkm") ? "bg-accent/40"
                : "bg-border"
            }`} />
          ))}
        </div>

        {/* Step 1: Rate Albums */}
        {step === "rate" && (
          <div>
            <h1 className="font-display text-3xl mb-2">Welcome to Euterpy</h1>
            <p className="text-muted mb-1">Rate at least 5 albums to get started.</p>
            <p className="text-xs text-muted/40 mb-8">This builds your taste profile and populates your collection.</p>

            {albums.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted">Loading albums...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {albums.map((album) => {
                  const score = ratings[album.appleId] || 0;
                  return (
                    <div key={album.appleId} className="text-center">
                      <div className={`aspect-square rounded-xl overflow-hidden bg-card border-2 mb-2 transition-all ${
                        score > 0 ? "border-accent shadow-lg shadow-accent/10" : "border-border"
                      }`}>
                        {album.artworkUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={art(album.artworkUrl)!} alt={album.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-border text-xl">♪</div>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate">{album.title}</p>
                      <p className="text-[10px] text-muted truncate mb-1.5">{album.artist}</p>
                      <div className="flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            onClick={() => handleRate(album.appleId, v)}
                            className={`text-sm transition-colors ${v <= score ? "text-accent" : "text-border/40 hover:text-accent/40"}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="sticky bottom-4 mt-8">
              <button
                onClick={submitRatings}
                disabled={ratedCount < 5 || saving}
                className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-40 transition-all text-sm"
              >
                {saving ? "Saving..." : ratedCount < 5 ? `Rate ${5 - ratedCount} more to continue` : `Continue with ${ratedCount} ratings`}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Get to Know Me */}
        {step === "gtkm" && (
          <div>
            <h1 className="font-display text-3xl mb-2">Tell your story in 3 albums</h1>
            <p className="text-muted mb-8">Pick 3 albums that define you. This is the hero of your profile.</p>

            <div className="space-y-6">
              {[0, 1, 2].map((position) => {
                const selectedId = gtkmSelections[position];
                const selectedAlbum = albums.find((a) => a.appleId === selectedId);

                return (
                  <div key={position} className="bg-card border border-border rounded-xl p-5">
                    <p className="text-accent text-xs font-medium mb-3">{gtkmLabels[position]}</p>

                    {selectedAlbum ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          {selectedAlbum.artworkUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={art(selectedAlbum.artworkUrl, 80)!} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedAlbum.title}</p>
                            <p className="text-xs text-muted">{selectedAlbum.artist}</p>
                          </div>
                          <button
                            onClick={() => {
                              const next = [...gtkmSelections];
                              next[position] = null;
                              setGtkmSelections(next);
                            }}
                            className="text-xs text-muted hover:text-foreground"
                          >
                            Change
                          </button>
                        </div>
                        <input
                          type="text"
                          value={gtkmStories[position]}
                          onChange={(e) => {
                            const next = [...gtkmStories];
                            next[position] = e.target.value;
                            setGtkmStories(next);
                          }}
                          placeholder="Why this album? (optional)"
                          maxLength={500}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted/30 focus:outline-none focus:border-accent"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {ratedAlbums.filter((a) => !gtkmSelections.includes(a.appleId)).map((album) => (
                          <button
                            key={album.appleId}
                            onClick={() => {
                              const next = [...gtkmSelections];
                              next[position] = album.appleId;
                              setGtkmSelections(next);
                            }}
                            className="aspect-square rounded-lg overflow-hidden bg-card border border-border hover:border-accent transition-colors"
                          >
                            {album.artworkUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={art(album.artworkUrl, 120)!} alt={album.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-border">♪</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep("follow")}
                className="flex-1 py-3 border border-border rounded-xl text-sm text-muted hover:text-foreground"
              >
                Skip
              </button>
              <button
                onClick={submitGtkm}
                disabled={gtkmCount === 0 || saving}
                className="flex-1 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-40 text-sm"
              >
                {saving ? "Saving..." : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Find People */}
        {step === "follow" && (
          <div>
            <h1 className="font-display text-3xl mb-2">Find your people</h1>
            <p className="text-muted mb-8">Follow curators to fill your feed with great taste.</p>

            {suggestedUsers.length > 0 ? (
              <div className="space-y-2">
                {suggestedUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-lg text-muted shrink-0">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
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
                        followedIds.has(user.id)
                          ? "border border-border text-muted"
                          : "bg-accent text-white hover:bg-accent-hover"
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
                <p className="text-xs text-muted/40 mt-1">You can discover people later on the Discover page.</p>
              </div>
            )}

            <button
              onClick={finish}
              className="w-full mt-8 py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-all text-sm"
            >
              {followCount > 0 ? `Enter Euterpy (following ${followCount})` : "Enter Euterpy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
