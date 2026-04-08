"use client";

import { useState } from "react";

export default function EditorialNotes({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 320;
  const preview = isLong && !expanded ? text.slice(0, 320).trimEnd() + "…" : text;

  return (
    <div className="mb-12">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">About this album</p>
      <p className="editorial text-base text-zinc-300 leading-relaxed">{preview}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs text-accent hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
