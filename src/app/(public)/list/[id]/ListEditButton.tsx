"use client";

import { useState } from "react";
import ListComposer from "@/components/list/ListComposer";

interface Props {
  list: {
    id: string;
    title: string;
    subtitle: string | null;
    items: Array<{
      kind: "album" | "song";
      target_apple_id: string;
      target_title: string;
      target_artist: string;
      target_artwork_url: string | null;
      caption: string | null;
    }>;
  };
}

export default function ListEditButton({ list }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-zinc-500 hover:text-accent transition-colors px-3 py-1.5 border border-border rounded-full"
      >
        Edit
      </button>
      {open && <ListComposer existing={list} onClose={() => setOpen(false)} />}
    </>
  );
}
