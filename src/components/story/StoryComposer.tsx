"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { toast } from "sonner";

interface Props {
  kind: "album" | "song" | "artist";
  appleId: string;
  title: string;
  artist?: string;
  artworkUrl: string | null;
  existing?: {
    id: string;
    headline: string | null;
    body: string;
  } | null;
  onClose: () => void;
  onSaved?: () => void;
}

const PROMPTS: Record<string, string[]> = {
  album: [
    "What season of your life was this?",
    "Who did you first hear this with?",
    "Which track broke you open?",
    "What does it sound like in the dark?",
    "Why does this one stay?",
  ],
  song: [
    "Where were you the first time?",
    "Which line is yours forever?",
    "What does it cost you to listen now?",
    "Who do you think of?",
  ],
  artist: [
    "When did you find them?",
    "What do they make you brave enough to feel?",
    "Which era is yours?",
    "Why do you trust them?",
  ],
};

function art(url: string | null, size = 600): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function StoryComposer({
  kind,
  appleId,
  title,
  artist,
  artworkUrl,
  existing,
  onClose,
  onSaved,
}: Props) {
  const router = useRouter();
  const [headline, setHeadline] = useState(existing?.headline || "");
  const [body, setBody] = useState(existing?.body || "");
  const [saving, setSaving] = useState(false);
  const [randomPrompt, setRandomPrompt] = useState<string>("");

  useEffect(() => {
    const list = PROMPTS[kind] || PROMPTS.album;
    setRandomPrompt(list[Math.floor(Math.random() * list.length)]);
  }, [kind]);

  const cover = art(artworkUrl, 700);
  const isEdit = !!existing;

  async function handleSave() {
    if (body.trim().length < 1) {
      toast.error("Tell us something — even one line.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to write a story");
        return;
      }

      if (isEdit) {
        const { error } = await supabase
          .from("stories")
          .update({
            headline: headline.trim() || null,
            body: body.trim(),
          })
          .eq("id", existing!.id);
        if (error) throw error;
        toast("Story saved");
        onClose();
        onSaved?.();
        router.refresh();
      } else {
        const { data, error } = await supabase
          .from("stories")
          .insert({
            user_id: user.id,
            kind,
            target_apple_id: appleId,
            target_title: title,
            target_artist: artist || null,
            target_artwork_url: artworkUrl,
            headline: headline.trim() || null,
            body: body.trim(),
          })
          .select("id")
          .single();
        if (error) throw error;
        toast("Story published");
        onClose();
        onSaved?.();
        if (data?.id) router.push(`/story/${data.id}`);
      }
    } catch {
      toast.error("Couldn't save your story");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Delete this story? This can't be undone.")) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("stories").delete().eq("id", existing!.id);
      if (error) throw error;
      toast("Story deleted");
      onClose();
      onSaved?.();
      router.push(kind === "album" ? `/album/${appleId}` : kind === "song" ? `/song/${appleId}` : `/artist/${appleId}`);
    } catch {
      toast.error("Couldn't delete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      <div
        className="relative w-full sm:max-w-2xl bg-background sm:bg-card sm:border sm:border-border sm:rounded-3xl flex flex-col max-h-screen sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-sm transition-colors">
            ✕ Close
          </button>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{isEdit ? "Edit story" : "New story"}</p>
          <button
            onClick={handleSave}
            disabled={saving || body.trim().length === 0}
            className="px-4 py-1.5 bg-accent text-white rounded-full text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-30"
          >
            {saving ? "Saving..." : isEdit ? "Save" : "Publish"}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
          {/* Subject card */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/[0.04]">
            {cover && (
              <div className={`${kind === "artist" ? "rounded-full" : "rounded-lg"} w-16 h-16 overflow-hidden border border-white/[0.06] shrink-0`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt={title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-1">A story about</p>
              <p className="font-display text-2xl tracking-tight truncate">{title}</p>
              {artist && kind !== "artist" && <p className="text-sm text-zinc-500 truncate">{artist}</p>}
            </div>
          </div>

          {/* Headline */}
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={200}
            placeholder="Headline (optional)"
            className="w-full bg-transparent border-none text-3xl sm:text-4xl font-display tracking-tight text-white placeholder:text-zinc-700 focus:outline-none mb-6"
          />

          {/* Body — the actual writing space */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            placeholder={randomPrompt || "Tell the story..."}
            rows={14}
            autoFocus
            className="editorial w-full bg-transparent border-none text-zinc-200 text-lg leading-[1.7] placeholder:text-zinc-700 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between mt-4 text-[11px] text-zinc-700">
            <span>Markdown not needed — just write.</span>
            <span className="tabular-nums">{body.length.toLocaleString()} / 10,000</span>
          </div>
        </div>

        {/* Footer actions */}
        {isEdit && (
          <div className="px-6 py-4 border-t border-border flex justify-between items-center">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
            >
              Delete story
            </button>
            <p className="text-[10px] text-zinc-700">Saved publicly to your profile</p>
          </div>
        )}
      </div>
    </div>
  );
}
