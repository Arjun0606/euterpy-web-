"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LyricPinComposer from "./LyricPinComposer";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import MarkButton from "@/components/social/MarkButton";
import EchoButton from "@/components/social/EchoButton";

interface LyricPin {
  id: string;
  song_apple_id: string;
  song_title: string;
  song_artist: string;
  song_artwork_url: string | null;
  lyric: string;
  position: number;
}

interface Props {
  pins: LyricPin[];
  isOwner: boolean;
  ownerId?: string;
}

export default function LyricPinsSection({ pins, isOwner, ownerId }: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, { mark: number; echo: number }>>({});
  const router = useRouter();

  // Fetch counts for all pins on mount
  useEffect(() => {
    if (pins.length === 0) return;
    const supabase = createClient();
    const ids = pins.map((p) => p.id);
    Promise.all([
      supabase.from("stars").select("target_id").eq("kind", "lyric").in("target_id", ids),
      supabase.from("reposts").select("target_id").eq("kind", "lyric").in("target_id", ids),
    ]).then(([m, e]) => {
      const next: Record<string, { mark: number; echo: number }> = {};
      for (const id of ids) next[id] = { mark: 0, echo: 0 };
      for (const row of (m.data || []) as any[]) next[row.target_id].mark++;
      for (const row of (e.data || []) as any[]) next[row.target_id].echo++;
      setCounts(next);
    });
  }, [pins]);

  async function handleRemove(id: string) {
    if (!confirm("Remove this lyric?")) return;
    try {
      const supabase = createClient();
      await supabase.from("lyric_pins").delete().eq("id", id);
      toast("Removed");
      router.refresh();
    } catch {
      toast.error("Couldn't remove");
    }
  }

  async function handleDownload(id: string) {
    try {
      const res = await fetch(`/api/og/lyric/${id}?ts=${Date.now()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lyric-${id.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("Saved");
    } catch {
      toast.error("Couldn't download");
    }
  }

  if (pins.length === 0 && !isOwner) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">Lyrics</h2>
        {isOwner && (
          <button
            onClick={() => setComposerOpen(true)}
            className="text-xs text-accent hover:underline"
          >
            + Pin a lyric
          </button>
        )}
      </div>

      {pins.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl py-10 px-6 text-center">
          <p className="font-display text-2xl mb-2">A line that lives in you.</p>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-4">
            Pin lyrics to your profile. The ones you carry around like a tattoo.
          </p>
          <button
            onClick={() => setComposerOpen(true)}
            className="text-xs text-accent hover:underline"
          >
            Pin your first lyric →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pins.map((pin) => (
            <div
              key={pin.id}
              className="relative bg-card border border-border rounded-2xl p-6 hover:border-accent/30 transition-colors group"
            >
              <p className="font-display italic text-xl sm:text-2xl tracking-tight leading-[1.25] text-zinc-100 mb-5 line-clamp-4">
                &ldquo;{pin.lyric}&rdquo;
              </p>
              <Link
                href={`/song/${pin.song_apple_id}`}
                className="flex items-center gap-2.5 hover:text-accent transition-colors"
              >
                {pin.song_artwork_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pin.song_artwork_url.replace("{w}", "120").replace("{h}", "120")}
                    alt=""
                    className="w-7 h-7 rounded object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{pin.song_title}</p>
                  <p className="text-[10px] text-zinc-600 truncate">{pin.song_artist}</p>
                </div>
              </Link>

              {/* Mark + Echo row */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.04]">
                <MarkButton
                  key={`m-${pin.id}-${counts[pin.id]?.mark || 0}`}
                  kind="lyric"
                  targetId={pin.id}
                  ownerId={ownerId}
                  initialCount={counts[pin.id]?.mark || 0}
                  size="sm"
                />
                <EchoButton
                  key={`e-${pin.id}-${counts[pin.id]?.echo || 0}`}
                  kind="lyric"
                  targetId={pin.id}
                  ownerId={ownerId}
                  initialCount={counts[pin.id]?.echo || 0}
                  size="sm"
                />
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => handleDownload(pin.id)}
                  className="text-zinc-600 hover:text-accent text-[10px] px-2 py-1 border border-border rounded-full transition-colors"
                  aria-label="Download as image"
                  title="Save as image"
                >
                  ↓ Save
                </button>
                {isOwner && (
                  <button
                    onClick={() => handleRemove(pin.id)}
                    className="text-zinc-600 hover:text-red-400 text-xs px-2 transition-colors"
                    aria-label="Remove lyric"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {composerOpen && <LyricPinComposer onClose={() => setComposerOpen(false)} />}
    </section>
  );
}
