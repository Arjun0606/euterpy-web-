import Link from "next/link";
import { getArtworkUrl } from "@/lib/apple-music/client";
import type { Memory } from "@/lib/memories";

interface Props {
  memory: Memory;
}

function art(url: string | null, size = 400): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

/**
 * On This Day — the personal memory hero on the home feed.
 *
 * A small editorial card that surfaces one item from the user's own
 * past. Renders only when there IS a memory to show; on a fresh
 * profile this whole module disappears, no fake content.
 *
 * Voice rules:
 *  - Lead with the time anchor in italics ("A year ago today")
 *  - The memory itself is the work, not a "you collected X" sentence
 *  - For stories: pull-quote from the body
 *  - For lyric pins: the line, in italics, in quotation marks
 *  - For album adds: just the cover and title, no commentary
 *  - The whole card is one big link to the canonical page
 */
export default function OnThisDay({ memory }: Props) {
  const cover = art(memory.artworkUrl, 400);

  return (
    <section className="mb-14">
      <Link
        href={memory.href}
        className="group block rounded-3xl border border-border bg-card/60 hover:border-accent/40 transition-colors overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-stretch">
          {/* Cover */}
          <div className="w-full sm:w-56 aspect-square sm:aspect-auto sm:h-auto shrink-0 bg-black border-b sm:border-b-0 sm:border-r border-border overflow-hidden">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={memory.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-zinc-800">♪</div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 p-7 sm:p-9 flex flex-col justify-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-accent font-semibold mb-3">
              — From your own pages
            </p>
            <p className="font-display italic text-lg text-zinc-400 mb-4">
              {memory.agoLabel}
            </p>

            {memory.kind === "story" && (
              <>
                <h3 className="font-display text-2xl sm:text-3xl tracking-tight leading-tight mb-3 group-hover:text-accent transition-colors line-clamp-2">
                  {memory.title}
                </h3>
                {memory.preview && (
                  <p className="editorial italic text-sm sm:text-base text-zinc-500 leading-relaxed line-clamp-3">
                    &ldquo;{memory.preview}&rdquo;
                  </p>
                )}
                {memory.subtitle && (
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-600 mt-4">
                    on {memory.subtitle}
                  </p>
                )}
              </>
            )}

            {memory.kind === "lyric" && memory.preview && (
              <>
                <blockquote className="font-display italic text-2xl sm:text-3xl tracking-tight leading-[1.2] text-zinc-100 mb-5 line-clamp-4">
                  &ldquo;{memory.preview}&rdquo;
                </blockquote>
                <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                  <span className="text-foreground font-medium">{memory.title}</span>
                  {memory.subtitle && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="italic">{memory.subtitle}</span>
                    </>
                  )}
                </div>
              </>
            )}

            {memory.kind === "album" && (
              <>
                <h3 className="font-display text-2xl sm:text-3xl tracking-tight leading-tight mb-2 group-hover:text-accent transition-colors line-clamp-2">
                  {memory.title}
                </h3>
                {memory.subtitle && (
                  <p className="text-base italic text-zinc-500">{memory.subtitle}</p>
                )}
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-600 mt-5">
                  Collected
                </p>
              </>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}
