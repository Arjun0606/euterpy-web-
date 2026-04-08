"use client";

import { useState } from "react";
import StoryComposer from "@/components/story/StoryComposer";

interface Props {
  story: {
    id: string;
    headline: string | null;
    body: string;
    kind: "album" | "song" | "artist";
    target_apple_id: string;
    target_title: string;
    target_artist: string | null;
    target_artwork_url: string | null;
  };
}

export default function StoryEditButton({ story }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-zinc-500 hover:text-accent transition-colors px-3 py-1.5 border border-border rounded-full"
      >
        Edit
      </button>
      {open && (
        <StoryComposer
          kind={story.kind}
          appleId={story.target_apple_id}
          title={story.target_title}
          artist={story.target_artist || undefined}
          artworkUrl={story.target_artwork_url}
          existing={{ id: story.id, headline: story.headline, body: story.body }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
