"use client";

import { useState } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Stars from "@/components/ui/Stars";
import Link from "next/link";

interface RatingItem {
  id: string;
  score: number;
  reaction: string | null;
  created_at: string;
  type: "album" | "song";
  ownership?: string | null;
  apple_id: string;
  title: string;
  artist_name: string;
  artwork_url: string | null;
  album_name?: string | null;
}

type SortBy = "recent" | "rating" | "artist";
type ShelfStyle = "minimal" | "wood" | "ornate" | "glass";

interface Props {
  items: RatingItem[];
  title?: string;
  showSort?: boolean;
  shelfStyle?: ShelfStyle;
}

const SHELF_STYLES: Record<ShelfStyle, { ledge: React.CSSProperties; shadow: React.CSSProperties }> = {
  // Minimal — thin dark line, modernist
  minimal: {
    ledge: {
      background: "linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.04) inset",
      height: "5px",
      borderRadius: "1px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)", height: "16px" },
  },

  // Wood — warm honey oak with horizontal grain, like an actual record store shelf
  wood: {
    ledge: {
      backgroundImage: `
        repeating-linear-gradient(180deg,
          rgba(0,0,0,0.0) 0px,
          rgba(0,0,0,0.12) 1px,
          rgba(255,200,140,0.08) 2px,
          rgba(0,0,0,0.0) 4px
        ),
        linear-gradient(to bottom,
          #d49060 0%,
          #b66f3a 25%,
          #8a4f22 60%,
          #5a3010 100%
        )
      `,
      boxShadow: `
        0 8px 24px rgba(0,0,0,0.85),
        0 4px 8px rgba(255,200,140,0.25) inset,
        0 -3px 3px rgba(0,0,0,0.6) inset,
        0 0 0 1px rgba(80,40,15,0.6)
      `,
      height: "18px",
      borderRadius: "2px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(50,25,5,0.85) 0%, rgba(50,25,5,0.2) 50%, transparent 100%)", height: "32px" },
  },

  // Ornate — polished brass with decorative engraved appearance
  ornate: {
    ledge: {
      backgroundImage: `
        linear-gradient(to bottom,
          #f5d99a 0%,
          #e8b870 12%,
          #c89548 30%,
          #966828 55%,
          #5a3c0e 90%,
          #2e1f06 100%
        )
      `,
      boxShadow: `
        0 10px 32px rgba(0,0,0,0.9),
        0 5px 0 rgba(245,217,154,0.5) inset,
        0 -3px 0 rgba(0,0,0,0.6) inset,
        0 0 0 1px rgba(245,217,154,0.6),
        0 0 0 3px rgba(40,25,5,0.8),
        0 0 24px rgba(232,184,112,0.35)
      `,
      height: "22px",
      borderRadius: "4px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(40,25,5,0.85) 0%, rgba(40,25,5,0.2) 50%, transparent 100%)", height: "36px" },
  },

  // Glass — frosted display case with bright top edge
  glass: {
    ledge: {
      background: "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.02) 100%)",
      boxShadow: `
        0 6px 24px rgba(0,0,0,0.5),
        0 3px 0 rgba(255,255,255,0.5) inset,
        0 -1px 0 rgba(255,255,255,0.1) inset,
        0 0 32px rgba(255,255,255,0.08)
      `,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      height: "16px",
      borderRadius: "3px",
      border: "1px solid rgba(255,255,255,0.18)",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)", height: "24px" },
  },
};

function artwork(url: string | null, size = 300): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

function sortItems(items: RatingItem[], by: SortBy): RatingItem[] {
  const sorted = [...items];
  switch (by) {
    case "recent":
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "rating":
      return sorted.sort((a, b) => b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "artist":
      return sorted.sort((a, b) => a.artist_name.localeCompare(b.artist_name));
    default:
      return sorted;
  }
}

export default function RecordShelf({ items, title = "The Shelf", showSort = true, shelfStyle = "minimal" }: Props) {
  const style = SHELF_STYLES[shelfStyle] || SHELF_STYLES.minimal;
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [filter, setFilter] = useState<"all" | "album" | "song">("all");

  if (items.length === 0) {
    return (
      <div className="mb-10">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">{title}</h2>
        <p className="text-muted/60 text-sm">Nothing logged yet. Start rating to build your shelf.</p>
      </div>
    );
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);
  const sorted = sortItems(filtered, sortBy);
  const albumCount = items.filter((i) => i.type === "album").length;
  const songCount = items.filter((i) => i.type === "song").length;

  // Group into rows of 5
  const shelves: RatingItem[][] = [];
  for (let i = 0; i < sorted.length; i += 5) {
    shelves.push(sorted.slice(i, i + 5));
  }

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
        <span className="text-[11px] text-zinc-600">
          {albumCount} {albumCount === 1 ? "album" : "albums"}
          {songCount > 0 && ` · ${songCount} ${songCount === 1 ? "song" : "songs"}`}
        </span>
      </div>

      {/* Filter + Sort */}
      {showSort && (
        <div className="flex items-center gap-2 mb-5">
          <div className="flex gap-0.5 bg-card rounded-lg p-0.5 border border-border">
            {([["all", "All"], ["album", "Albums"], ["song", "Songs"]] as [typeof filter, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                  filter === f ? "bg-accent text-white" : "text-zinc-600 hover:text-zinc-300 transition-colors"
                }`}>{label}</button>
            ))}
          </div>
          <div className="flex gap-1 ml-auto">
            {([["recent", "Recent"], ["rating", "Top Rated"], ["artist", "Artist"]] as [SortBy, string][]).map(([s, label]) => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-2 py-1 text-[11px] rounded transition-colors ${
                  sortBy === s ? "text-accent" : "text-zinc-700 hover:text-zinc-400 transition-colors"
                }`}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Shelf rows */}
      <div className="space-y-2">
        {shelves.map((row, rowIndex) => (
          <div key={rowIndex} className="relative">
            {/* Items on the shelf */}
            <div className="flex gap-2 sm:gap-3 pb-2 relative z-10">
              {row.map((item) => {
                const coverUrl = artwork(item.artwork_url, 300);
                const href = item.type === "album" ? `/album/${item.apple_id}` : `/song/${item.apple_id}`;

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="group flex-1 min-w-0 max-w-[20%]"
                  >
                    <div
                      className="aspect-square rounded-sm overflow-hidden shadow-lg border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-accent/10 relative"
                      style={{ transformOrigin: "bottom center" }}
                    >
                      {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-card flex items-center justify-center text-border">♪</div>
                      )}
                      {/* Song badge */}
                      {item.type === "song" && (
                        <div className="absolute top-1 left-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                          <span className="text-[8px] text-white">♪</span>
                        </div>
                      )}
                      {/* Ownership badge */}
                      {item.ownership && item.ownership !== "digital" && (
                        <div className="absolute bottom-1 right-1 text-[10px]">
                          {item.ownership === "vinyl" ? "🎵" : item.ownership === "cd" ? "💿" : "📼"}
                        </div>
                      )}
                    </div>

                    {/* Hover info */}
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted truncate">{item.artist_name}</p>
                      <Stars score={item.score} size="sm" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Shelf ledge */}
            <div className="rounded-full relative z-0" style={style.ledge} />
            <div className="-mt-1" style={style.shadow} />
          </div>
        ))}
      </div>
    </div>
  );
}
