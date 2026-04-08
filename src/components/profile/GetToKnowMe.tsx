"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";
import VinylCover from "@/components/ui/VinylCover";

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

function artwork(url: string | null, size = 500): string | null {
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Triple the items for infinite loop illusion
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

  if (items.length === 0) return null;

  return (
    <div className="mb-14">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">
        Get to know {username}
      </p>

      {/* Carousel — full-width single card with infinite loop */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth -mx-4 px-4"
        >
          {tripledItems.map((item, index) => {
            const album = item.albums;
            const bgUrl = artwork(album.artwork_url, 1200);

            return (
              <div
                key={`${item.id}-${index}`}
                className="snap-center shrink-0 w-full pr-4 last:pr-0"
              >
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border group">
                  {bgUrl && (
                    <div className="absolute inset-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bgUrl}
                        alt=""
                        className="w-full h-full object-cover opacity-15 blur-3xl scale-125"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/50" />
                    </div>
                  )}

                  <div className="relative p-5 sm:p-8 flex flex-col sm:flex-row gap-5 sm:gap-8 items-center min-h-[280px] sm:min-h-[320px]">
                    <VinylCover
                      artworkUrl={album.artwork_url}
                      title={album.title}
                      size="lg"
                      showVinyl={true}
                    />

                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
                        {SLIDE_LABELS[item.position - 1] || ""}
                      </p>
                      <h3 className="font-display text-2xl sm:text-4xl tracking-tight leading-none mb-2">
                        {album.title}
                      </h3>
                      <p className="text-zinc-400 mb-5 text-sm">
                        {album.artist_name}
                      </p>
                      {item.story && (
                        <p className="editorial text-base text-zinc-300 leading-relaxed max-w-md">
                          &ldquo;{item.story}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dots */}
        {items.length > 1 && (
          <div className="flex justify-center gap-2 mt-5">
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
