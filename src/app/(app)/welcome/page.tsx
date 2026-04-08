"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { toast } from "sonner";

interface AlbumResult {
  appleId: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
}

interface PickedAlbum extends AlbumResult {
  dbId: string;
}

const PROMPTS = [
  {
    eyebrow: "Question one of three",
    title: "An album that shaped you.",
    sub: "The first one that mattered. The one that taught you what music could do.",
  },
  {
    eyebrow: "Question two of three",
    title: "The one you keep coming back to.",
    sub: "The album you return to in every season. The one that never gets old.",
  },
  {
    eyebrow: "Question three of three",
    title: "The one that changed everything.",
    sub: "The record after which you weren't quite the same. The one you'd save from a fire.",
  },
];

function art(url: string | null, size = 400): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");

  // Flow state
  const [step, setStep] = useState(0); // 0,1,2 = prompts; 3 = finish
  const [picks, setPicks] = useState<(PickedAlbum | null)[]>([null, null, null]);

  // Per-step search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlbumResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auth + profile fetch
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setAuthReady(true);
      }
    });
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        const { data: prof } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        if (prof?.username) setUsername(prof.username);
        setAuthReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults((data.albums || []).slice(0, 6));
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
  }

  async function handlePick(album: AlbumResult) {
    if (!userId) return;
    setSaving(true);
    try {
      // Hydrate the album into our DB
      const res = await fetch(`/api/albums/${album.appleId}`);
      const { album: dbAlbum } = await res.json();
      if (!dbAlbum?.id) throw new Error("Album not found");

      // Save to GTKM at the current position immediately
      const position = step + 1;
      const { data: existing } = await supabase
        .from("get_to_know_me")
        .select("id")
        .eq("user_id", userId)
        .eq("position", position)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("get_to_know_me")
          .update({ album_id: dbAlbum.id, story: null })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("get_to_know_me")
          .insert({ user_id: userId, position, album_id: dbAlbum.id, story: null });
      }

      const next = [...picks];
      next[step] = { ...album, dbId: dbAlbum.id };
      setPicks(next);

      // Reset search
      setQuery("");
      setResults([]);

      // Advance
      if (step < 2) {
        setStep(step + 1);
      } else {
        setStep(3);
      }
    } catch {
      toast.error("Couldn't add. Try another.");
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (step === 0) return;
    setStep(step - 1);
    setQuery("");
    setResults([]);
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Loading...</p>
      </div>
    );
  }

  // ===== FINISH SCREEN =====
  if (step === 3) {
    const allPicked = picks.every((p) => p !== null);
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Backdrop from first cover */}
        {picks[0]?.artworkUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={art(picks[0].artworkUrl, 1200)!}
              alt=""
              className="w-full h-full object-cover opacity-25 blur-3xl scale-150"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
          </div>
        )}

        <main className="relative max-w-2xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-6">— Your music identity</p>
          <h1 className="font-display text-5xl sm:text-7xl tracking-tighter leading-[0.92] mb-4">
            This is who you are,
          </h1>
          <h1 className="font-display italic text-5xl sm:text-7xl tracking-tighter leading-[0.92] text-accent mb-10">
            in three records.
          </h1>

          <p className="editorial text-base text-zinc-400 leading-relaxed mb-12 max-w-md">
            Every Euterpy profile starts with these three. They sit at the top of your page — the first thing anyone sees when they arrive. You can rewrite them anytime.
          </p>

          {/* The three picks */}
          <div className="space-y-4 mb-12">
            {picks.map((pick, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
                <span className="font-display text-3xl tracking-tighter text-zinc-700 w-8 text-right tabular-nums shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {pick?.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art(pick.artworkUrl, 200)!} alt="" className="w-14 h-14 rounded-md object-cover shrink-0 border border-white/[0.06]" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-background border border-border flex items-center justify-center text-zinc-700 shrink-0">♪</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{pick?.title || "—"}</p>
                  <p className="text-xs text-zinc-500 truncate italic">{pick?.artistName || ""}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {username && (
              <button
                onClick={() => router.push(`/${username}`)}
                disabled={!allPicked}
                className="flex-1 py-3.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-30"
              >
                See your profile →
              </button>
            )}
            <button
              onClick={() => router.push("/feed")}
              className="flex-1 py-3.5 border border-border text-zinc-400 text-sm rounded-full hover:text-white hover:border-zinc-700 transition-colors"
            >
              Go to the feed
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-white/[0.04] text-center">
            <p className="editorial italic text-xs text-zinc-700 max-w-sm mx-auto leading-relaxed">
              From here, write a story about one of them. Pin a lyric you carry. Make a list. Build your charts. The page is yours.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ===== QUESTION SCREEN =====
  const prompt = PROMPTS[step];
  const currentPick = picks[step];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-20">

        {/* Progress */}
        <div className="flex gap-1.5 mb-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-[2px] flex-1 rounded-full transition-colors ${
                i < step ? "bg-accent" : i === step ? "bg-accent/60" : "bg-white/[0.06]"
              }`}
            />
          ))}
        </div>

        {/* Eyebrow + headline */}
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-4">— {prompt.eyebrow}</p>
        <h1 className="font-display text-4xl sm:text-6xl tracking-tighter leading-[0.95] mb-5">
          {prompt.title}
        </h1>
        <p className="editorial italic text-base sm:text-lg text-zinc-400 leading-relaxed mb-12 max-w-lg">
          {prompt.sub}
        </p>

        {/* Already-picked confirmation when revisiting */}
        {currentPick && (
          <div className="mb-6 p-4 rounded-2xl bg-card border border-accent/30">
            <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-2">Your answer</p>
            <div className="flex items-center gap-3">
              {currentPick.artworkUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={art(currentPick.artworkUrl, 200)!} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentPick.title}</p>
                <p className="text-xs text-zinc-500 truncate italic">{currentPick.artistName}</p>
              </div>
              <button
                onClick={() => {
                  const next = [...picks];
                  next[step] = null;
                  setPicks(next);
                }}
                className="text-[11px] text-zinc-600 hover:text-accent transition-colors"
              >
                Change
              </button>
            </div>
            {step < 2 && (
              <button
                onClick={() => setStep(step + 1)}
                className="w-full mt-4 py-2.5 bg-accent text-white text-xs font-medium rounded-full hover:bg-accent-hover transition-colors"
              >
                Next question →
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                className="w-full mt-4 py-2.5 bg-accent text-white text-xs font-medium rounded-full hover:bg-accent-hover transition-colors"
              >
                Finish →
              </button>
            )}
          </div>
        )}

        {/* Search input */}
        {!currentPick && (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              autoFocus
              placeholder="Search for the album..."
              className="w-full px-5 py-4 bg-input border border-border rounded-2xl text-base placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
              disabled={saving}
            />

            {searching && (
              <p className="text-center text-zinc-700 text-xs py-6">Searching...</p>
            )}

            {!searching && query.length < 2 && (
              <p className="text-center text-zinc-800 text-[11px] py-6 italic">Type a title or artist to begin.</p>
            )}

            {!searching && query.length >= 2 && results.length === 0 && (
              <p className="text-center text-zinc-700 text-xs py-6">No albums found.</p>
            )}

            {results.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.map((a) => (
                  <button
                    key={a.appleId}
                    onClick={() => handlePick(a)}
                    disabled={saving}
                    className="group text-left disabled:opacity-50"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2 group-hover:border-accent/40 group-hover:-translate-y-0.5 group-hover:shadow-2xl group-hover:shadow-accent/20 transition-all">
                      {a.artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art(a.artworkUrl)!} alt={a.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">♪</div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{a.title}</p>
                    <p className="text-[11px] text-zinc-600 truncate italic">{a.artistName}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t border-white/[0.04] flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="text-[11px] text-zinc-600 hover:text-accent transition-colors disabled:opacity-0 disabled:pointer-events-none"
          >
            ← Previous
          </button>
          <button
            onClick={() => router.push("/feed")}
            className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </main>
    </div>
  );
}
