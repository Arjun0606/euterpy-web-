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

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, items.length - 1));
  }, [items.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="text-xs uppercase tracking-widest text-muted mb-4 px-4">
        Get to Know {username}
      </h2>

      {/* Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory -mx-4 px-4"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((item, index) => {
            const album = item.albums;
            const bgUrl = artwork(album.artwork_url, 1200);

            return (
              <div
                key={item.id}
                className="snap-center shrink-0 w-full pr-4 last:pr-0"
              >
                <div className="relative rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] group">
                  {/* Blurred album art background */}
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

                  {/* Content */}
                  <div className="relative p-5 sm:p-8 flex flex-col sm:flex-row gap-5 sm:gap-8 items-center min-h-[280px] sm:min-h-[320px]">
                    {/* Vinyl cover — smaller on mobile */}
                    <VinylCover
                      artworkUrl={album.artwork_url}
                      title={album.title}
                      size="md"
                      showVinyl={true}
                    />

                    {/* Text */}
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-[10px] sm:text-xs uppercase tracking-widest text-accent mb-2 sm:mb-3 font-medium">
                        {SLIDE_LABELS[index] || ""}
                      </p>
                      <h3 className="text-xl sm:text-3xl font-semibold mb-1 font-display">
                        {album.title}
                      </h3>
                      <p className="text-muted mb-5">
                        {album.artist_name}
                      </p>
                      {item.story && (
                        <p className="text-sm text-foreground/70 leading-relaxed italic max-w-md">
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
          <div className="flex justify-center gap-2 mt-4">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  scrollRef.current?.scrollTo({
                    left: index * (scrollRef.current?.offsetWidth || 0),
                    behavior: "smooth",
                  });
                  setActiveIndex(index);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? "bg-accent w-8"
                    : "bg-border w-1.5 hover:bg-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
