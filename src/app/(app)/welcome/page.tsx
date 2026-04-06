"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { toast } from "sonner";

type Step = "rate" | "gtkm";

interface AlbumResult {
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
}

interface RatedAlbum extends AlbumResult {
  score: number;
  dbId: string;
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function WelcomePage() {
  const [step, setStep] = useState<Step>("rate");
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Rate
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlbumResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AlbumResult | null>(null);
  const [score, setScore] = useState(0);
  const [rated, setRated] = useState<RatedAlbum[]>([]);
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // GTKM
  const [gtkmSearch, setGtkmSearch] = useState("");
  const [gtkmResults, setGtkmResults] = useState<AlbumResult[]>([]);
  const [gtkmSearching, setGtkmSearching] = useState(false);
  const [gtkmSlot, setGtkmSlot] = useState<number | null>(null);
  const [gtkm, setGtkm] = useState<(AlbumResult & { dbId: string } | null)[]>([null, null, null]);
  const gtkmDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUserId(session.user.id); setAuthReady(true); }
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); setAuthReady(true); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Search
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/albums/search?q=${encodeURIComponent(q.trim())}`);
      const d = await r.json();
      setResults((d.results || []).slice(0, 6));
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  function onSearch(v: string) {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 300);
  }

  async function rate() {
    if (!selected || score === 0 || !userId) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/albums/${selected.appleId}`);
      const { album } = await r.json();
      if (!album?.id) { toast.error("Album not found"); setSaving(false); return; }

      const { data: existing } = await supabase.from("ratings").select("id").eq("user_id", userId).eq("album_id", album.id).single();
      if (existing) {
        await supabase.from("ratings").update({ score }).eq("id", existing.id);
      } else {
        const { error } = await supabase.from("ratings").insert({ user_id: userId, album_id: album.id, score });
        if (error) { toast.error("Failed to save"); setSaving(false); return; }
      }

      toast(`★ ${score} — ${selected.title}`);
      setRated(prev => [...prev.filter(a => a.appleId !== selected.appleId), { ...selected, dbId: album.id, score }]);
    } catch { toast.error("Something went wrong"); }
    setSelected(null); setScore(0); setQuery(""); setResults([]); setSaving(false);
  }

  // GTKM search
  const searchGtkm = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setGtkmResults([]); return; }
    setGtkmSearching(true);
    try {
      const r = await fetch(`/api/albums/search?q=${encodeURIComponent(q.trim())}`);
      const d = await r.json();
      setGtkmResults((d.results || []).slice(0, 5));
    } catch { setGtkmResults([]); }
    setGtkmSearching(false);
  }, []);

  function onGtkmSearch(v: string) {
    setGtkmSearch(v);
    if (gtkmDebounce.current) clearTimeout(gtkmDebounce.current);
    gtkmDebounce.current = setTimeout(() => searchGtkm(v), 300);
  }

  async function selectGtkm(album: AlbumResult) {
    if (gtkmSlot === null) return;
    const r = await fetch(`/api/albums/${album.appleId}`);
    const { album: db } = await r.json();
    if (!db?.id) { toast.error("Album not found"); return; }

    const next = [...gtkm];
    next[gtkmSlot] = { ...album, dbId: db.id };
    setGtkm(next);
    setGtkmSlot(null); setGtkmSearch(""); setGtkmResults([]);
  }

  async function saveGtkm() {
    if (!userId) return;
    setSaving(true);
    for (let i = 0; i < 3; i++) {
      const a = gtkm[i];
      if (!a?.dbId) continue;
      const { data: existing } = await supabase.from("get_to_know_me").select("id").eq("user_id", userId).eq("position", i + 1).single();
      if (existing) {
        await supabase.from("get_to_know_me").update({ album_id: a.dbId }).eq("id", existing.id);
      } else {
        await supabase.from("get_to_know_me").insert({ user_id: userId, position: i + 1, album_id: a.dbId });
      }
    }
    toast("Profile set up");
    setSaving(false);
    router.push("/feed");
  }

  const labels = ["The album that shaped me", "The one I keep coming back to", "The one that changed everything"];

  if (!authReady) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-zinc-600 text-sm">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-xl mx-auto px-5 sm:px-8 py-10">

        {/* Progress */}
        <div className="flex gap-2 mb-10">
          <div className={`h-[2px] flex-1 rounded-full ${step === "rate" ? "bg-accent" : "bg-zinc-800"}`} />
          <div className={`h-[2px] flex-1 rounded-full ${step === "gtkm" ? "bg-accent" : "bg-zinc-800"}`} />
        </div>

        {/* ===== RATE ===== */}
        {step === "rate" && (
          <div>
            <h1 className="font-display text-3xl sm:text-4xl mb-2">Build your shelf</h1>
            <p className="text-zinc-500 text-sm mb-8">Search and rate at least 5 albums. This is the foundation of your taste.</p>

            {/* Search */}
            <div className="relative mb-6">
              <input type="text" placeholder="Search for an album..." value={query} onChange={(e) => onSearch(e.target.value)} autoFocus
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700" />
              {searching && <p className="text-xs text-zinc-600 mt-2">Searching...</p>}
              {results.length > 0 && !selected && (
                <div className="mt-2 border border-border rounded-xl bg-card overflow-hidden">
                  {results.map(a => (
                    <button key={a.appleId} onClick={() => { setSelected(a); setResults([]); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-card-hover text-left">
                      {a.artworkUrl && <img src={art(a.artworkUrl, 80)!} alt="" className="w-10 h-10 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{a.artistName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rate selected */}
            {selected && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  {selected.artworkUrl && <img src={art(selected.artworkUrl, 160)!} alt="" className="w-14 h-14 rounded-xl object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selected.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{selected.artistName}</p>
                  </div>
                  <button onClick={() => { setSelected(null); setScore(0); }} className="text-xs text-zinc-600 hover:text-zinc-300">×</button>
                </div>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[1,2,3,4,5].map(v => (
                    <button key={v} onClick={() => setScore(v === score ? 0 : v)}
                      className={`text-2xl ${v <= score ? "text-accent" : "text-zinc-800 hover:text-zinc-600"}`}>★</button>
                  ))}
                </div>
                <button onClick={rate} disabled={score === 0 || saving}
                  className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-hover disabled:opacity-30">
                  {saving ? "Saving..." : `Rate ★ ${score}`}
                </button>
              </div>
            )}

            {/* Rated so far */}
            {rated.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium mb-3">{rated.length} rated</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {rated.map(a => (
                    <div key={a.appleId} className="shrink-0 w-16 text-center">
                      {a.artworkUrl && <img src={art(a.artworkUrl, 120)!} alt="" className="w-16 h-16 rounded-lg object-cover mb-1" />}
                      <p className="text-[10px] text-zinc-400 truncate">{a.title}</p>
                      <p className="text-[10px] text-accent">★{a.score}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setStep("gtkm")} disabled={rated.length < 5}
              className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-20 text-sm">
              {rated.length < 5 ? `${5 - rated.length} more to go` : "Continue"}
            </button>
          </div>
        )}

        {/* ===== GTKM ===== */}
        {step === "gtkm" && (
          <div>
            <h1 className="font-display text-3xl sm:text-4xl mb-2">Your story in 3 albums</h1>
            <p className="text-zinc-500 text-sm mb-8">These sit at the top of your profile. The first thing anyone sees.</p>

            <div className="space-y-3">
              {[0, 1, 2].map(i => {
                const sel = gtkm[i];
                return (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-accent text-[11px] font-medium mb-3">{labels[i]}</p>
                    {sel ? (
                      <div className="flex items-center gap-3">
                        {sel.artworkUrl && <img src={art(sel.artworkUrl, 80)!} alt="" className="w-11 h-11 rounded-lg object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sel.title}</p>
                          <p className="text-xs text-zinc-500 truncate">{sel.artistName}</p>
                        </div>
                        <button onClick={() => { const n = [...gtkm]; n[i] = null; setGtkm(n); }} className="text-xs text-zinc-600 hover:text-zinc-300">×</button>
                      </div>
                    ) : gtkmSlot === i ? (
                      <div>
                        <input type="text" value={gtkmSearch} onChange={(e) => onGtkmSearch(e.target.value)} placeholder="Search..." autoFocus
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 mb-2" />
                        {gtkmSearching && <p className="text-xs text-zinc-600">Searching...</p>}
                        {gtkmResults.map(a => (
                          <button key={a.appleId} onClick={() => selectGtkm(a)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover text-left">
                            {a.artworkUrl && <img src={art(a.artworkUrl, 60)!} alt="" className="w-9 h-9 rounded object-cover" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{a.title}</p>
                              <p className="text-xs text-zinc-500 truncate">{a.artistName}</p>
                            </div>
                          </button>
                        ))}
                        <button onClick={() => { setGtkmSlot(null); setGtkmSearch(""); setGtkmResults([]); }}
                          className="text-xs text-zinc-700 mt-1 hover:text-zinc-400">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setGtkmSlot(i)}
                        className="w-full py-2.5 border border-dashed border-zinc-800 rounded-xl text-sm text-zinc-700 hover:text-zinc-400 hover:border-zinc-700">
                        Search and add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => router.push("/feed")} className="flex-1 py-3 border border-border rounded-xl text-sm text-zinc-600 hover:text-zinc-300">
                Skip for now
              </button>
              <button onClick={saveGtkm} disabled={!gtkm.some(Boolean) || saving}
                className="flex-1 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-20 text-sm">
                {saving ? "Saving..." : "Finish setup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
