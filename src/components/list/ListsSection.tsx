"use client";

import { useState } from "react";
import Link from "next/link";
import ListComposer from "./ListComposer";

interface ListWithItems {
  id: string;
  title: string;
  subtitle: string | null;
  created_at: string;
  items: Array<{
    position: number;
    target_title: string;
    target_artwork_url: string | null;
  }>;
}

interface Props {
  lists: ListWithItems[];
  isOwner: boolean;
}

function art(url: string | null, size = 300): string | null {
  if (!url) return null;
  return url.replace("{w}", size.toString()).replace("{h}", size.toString());
}

export default function ListsSection({ lists, isOwner }: Props) {
  const [composerOpen, setComposerOpen] = useState(false);

  if (lists.length === 0 && !isOwner) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">Lists</h2>
        {isOwner && (
          <button
            onClick={() => setComposerOpen(true)}
            className="text-xs text-accent hover:underline"
          >
            + New list
          </button>
        )}
      </div>

      {lists.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl py-10 px-6 text-center">
          <p className="font-display text-2xl mb-2">No lists yet.</p>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-4">
            Lists are how curation lives. &ldquo;Songs for the morning commute.&rdquo; &ldquo;Records I&apos;d save from a fire.&rdquo; Make one.
          </p>
          <button
            onClick={() => setComposerOpen(true)}
            className="text-xs text-accent hover:underline"
          >
            Make your first list →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lists.map((list) => {
            const sortedItems = [...(list.items || [])].sort((a, b) => a.position - b.position);
            const previewItems = sortedItems.slice(0, 4);
            return (
              <Link
                key={list.id}
                href={`/list/${list.id}`}
                className="group bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors"
              >
                {/* Mini cover grid */}
                {previewItems.length > 0 && (
                  <div className="grid grid-cols-4 gap-1 mb-4">
                    {previewItems.map((it, i) => {
                      const cover = art(it.target_artwork_url);
                      return (
                        <div key={i} className="aspect-square rounded-md overflow-hidden bg-background border border-white/[0.04]">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">♪</div>
                          )}
                        </div>
                      );
                    })}
                    {/* Pad to 4 if fewer */}
                    {Array.from({ length: Math.max(0, 4 - previewItems.length) }).map((_, i) => (
                      <div key={`pad-${i}`} className="aspect-square rounded-md bg-background/50 border border-white/[0.02]" />
                    ))}
                  </div>
                )}

                <p className="font-display text-xl tracking-tight leading-tight line-clamp-2 group-hover:text-accent transition-colors mb-1">
                  {list.title}
                </p>
                {list.subtitle && (
                  <p className="text-xs text-zinc-500 line-clamp-2 italic editorial">{list.subtitle}</p>
                )}
                <p className="text-[10px] text-zinc-700 mt-2">
                  {list.items.length} {list.items.length === 1 ? "item" : "items"}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {composerOpen && <ListComposer onClose={() => setComposerOpen(false)} />}
    </section>
  );
}
