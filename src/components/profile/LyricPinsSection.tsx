"use client";

import { useState } from "react";
import Link from "next/link";
import LyricPinComposer from "./LyricPinComposer";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
}

export default function LyricPinsSection({ pins, isOwner }: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const router = useRouter();

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
