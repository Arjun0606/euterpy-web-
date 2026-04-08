"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import StoryComposer from "./StoryComposer";

interface Props {
  kind: "album" | "song" | "artist";
  appleId: string;
  title: string;
  artist?: string;
  artworkUrl: string | null;
  variant?: "primary" | "ghost";
  className?: string;
}

export default function TellStoryButton({
  kind,
  appleId,
  title,
  artist,
  artworkUrl,
  variant = "ghost",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [existingStoryId, setExistingStoryId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user);
      if (!user) return;
      // Check for existing story by this user about this target
      supabase
        .from("stories")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", kind)
        .eq("target_apple_id", appleId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) setExistingStoryId(data.id);
        });
    });
  }, [kind, appleId]);

  if (authed === false) {
    return (
      <Link
        href="/signup"
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-zinc-500 hover:text-accent hover:border-accent/40 transition-colors ${className}`}
      >
        ✎ Tell its story
      </Link>
    );
  }

  // If user already wrote one, link to it instead of opening composer
  if (existingStoryId) {
    return (
      <Link
        href={`/story/${existingStoryId}`}
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 border border-accent/40 text-accent rounded-full text-xs font-medium hover:bg-accent/10 transition-colors ${className}`}
      >
        ✎ Read your story
      </Link>
    );
  }

  const baseClasses =
    variant === "primary"
      ? "px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors"
      : "inline-flex items-center gap-1.5 px-4 py-1.5 bg-card border border-border rounded-full text-xs text-zinc-500 hover:text-accent hover:border-accent/40 transition-colors";

  return (
    <>
      <button onClick={() => setOpen(true)} className={`${baseClasses} ${className}`}>
        ✎ Tell its story
      </button>
      {open && (
        <StoryComposer
          kind={kind}
          appleId={appleId}
          title={title}
          artist={artist}
          artworkUrl={artworkUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
