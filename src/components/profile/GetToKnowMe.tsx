"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";

interface GetToKnowMeItem {
  id: string;
  position: number;
  story: string | null;
  albums: {
    id: string;
    apple_id: string;
    title: string;
    artist_name: string;
    artwork_url: string | null;
  };
}

interface Props {
  items: GetToKnowMeItem[];
  username: string;
}

function artwork(url: string | null, size = 800): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

const SLIDE_LABELS = [
  "The album that shaped me",
  "The one I keep coming back to",
  "The one that changed everything",
];

export default function GetToKnowMe({ items, username }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Triple items for infinite loop
  const tripledItems = items.length > 1 ? [...items, ...items, ...items] : items;
  const middleStart = items.length;

  const getCardWidth = useCallback(() => {
    if (!scrollRef.current) return 0;
    return scrollRef.current.offsetWidth;
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isScrollingRef.current) return;
    const container = scrollRef.current;
    const cardWidth = getCardWidth();
    const scrollLeft = container.scrollLeft;
    const rawIndex = Math.round(scrollLeft / cardWidth);

    if (items.length > 1) {
      const normalized = ((rawIndex - middleStart) % items.length + items.length) % items.length;
      setActiveIndex(normalized);

      if (rawIndex < items.length - 1 || rawIndex >= items.length * 2 + 1) {
        isScrollingRef.current = true;
        const targetIndex = middleStart + normalized;
        container.scrollTo({ left: targetIndex * cardWidth, behavior: "instant" as ScrollBehavior });
        setTimeout(() => { isScrollingRef.current = false; }, 50);
      }
    } else {
      setActiveIndex(rawIndex);
    }
  }, [items.length, middleStart, getCardWidth]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (items.length > 1) {
      requestAnimationFrame(() => {
        const cardWidth = getCardWidth();
        container.scrollLeft = middleStart * cardWidth;
      });
    }
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll, items.length, middleStart, getCardWidth]);

  function scrollToIndex(index: number) {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = getCardWidth();
    const targetIndex = items.length > 1 ? middleStart + index : index;
    container.scrollTo({ left: targetIndex * cardWidth, behavior: "smooth" });
    setActiveIndex(index);
  }

  function toggleFlip(position: number) {
    setFlipped((prev) => ({ ...prev, [position]: !prev[position] }));
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-14">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">
        Get to know {username}
      </p>

      {/* Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth -mx-4 px-4"
        >
          {tripledItems.map((item, index) => {
            const album = item.albums;
            const coverUrl = artwork(album.artwork_url, 800);
            const isFlipped = flipped[item.position] || false;

            return (
              <div
                key={`${item.id}-${index}`}
                className="snap-center shrink-0 w-full pr-4 last:pr-0 flex flex-col items-center"
                style={{ perspective: "2000px" }}
              >
                {/* Position label */}
                <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-6 text-center">
                  {SLIDE_LABELS[item.position - 1] || ""}
                </p>

                {/* Vinyl sleeve — flippable */}
                <div
                  className="relative w-full max-w-sm aspect-square cursor-pointer select-none"
                  onClick={() => toggleFlip(item.position)}
                  style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 800ms cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* FRONT — album cover */}
                  <div
                    className="absolute inset-0 rounded-sm overflow-hidden shadow-2xl"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      boxShadow: "0 30px 80px -20px rgba(0,0,0,0.95), 0 0 0 1px rgba(0,0,0,0.6)",
                    }}
                  >
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverUrl} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-card flex items-center justify-center text-zinc-700 text-6xl">♪</div>
                    )}
                    {/* Subtle inner highlight to look like a sleeve */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/30 pointer-events-none" />
                    {/* Tap hint */}
                    <div className="absolute bottom-3 right-3 text-[10px] text-white/60 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full pointer-events-none">
                      tap to flip
                    </div>
                  </div>

                  {/* BACK — story side */}
                  <div
                    className="absolute inset-0 rounded-sm overflow-hidden p-6 sm:p-8 flex flex-col"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      background: "linear-gradient(135deg, #f5f1e8 0%, #e8e0d0 100%)",
                      boxShadow: "0 30px 80px -20px rgba(0,0,0,0.95), 0 0 0 1px rgba(0,0,0,0.6), inset 0 0 60px rgba(80,60,30,0.15)",
                    }}
                  >
                    {/* Header label */}
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4 font-mono">
                      Side B · {SLIDE_LABELS[item.position - 1]}
                    </p>

                    {/* Title + artist */}
                    <h3 className="font-display text-zinc-900 text-3xl sm:text-4xl tracking-tight leading-none mb-2">
                      {album.title}
                    </h3>
                    <p className="text-zinc-700 text-sm mb-6">
                      {album.artist_name}
                    </p>

                    {/* Divider */}
                    <div className="h-px bg-zinc-400/40 mb-5" />

                    {/* Story */}
                    {item.story ? (
                      <p className="editorial text-zinc-800 text-base leading-relaxed flex-1 overflow-y-auto">
                        {item.story}
                      </p>
                    ) : (
                      <p className="editorial text-zinc-500 text-sm italic">
                        No story written yet.
                      </p>
                    )}

                    {/* Tap hint */}
                    <div className="mt-4 text-[10px] text-zinc-600 text-right font-mono">
                      tap to flip back
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dots */}
        {items.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? "bg-accent w-8"
                    : "bg-zinc-800 w-1.5 hover:bg-zinc-700"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
