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
  minimal: {
    ledge: {
      background: "linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.04) inset",
      height: "4px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)", height: "16px" },
  },
  wood: {
    ledge: {
      background: "linear-gradient(to bottom, #a0633d 0%, #7a4a2c 30%, #5c3517 70%, #3e1f0b 100%)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.7), 0 2px 4px rgba(255,180,120,0.15) inset, 0 -1px 1px rgba(0,0,0,0.5) inset",
      height: "10px",
      borderRadius: "1px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(50,25,5,0.7) 0%, transparent 100%)", height: "20px" },
  },
  ornate: {
    ledge: {
      background: "linear-gradient(to bottom, #d4a574 0%, #b8865a 25%, #8b5a2b 60%, #5a3a1a 100%)",
      boxShadow: "0 5px 20px rgba(0,0,0,0.7), 0 2px 4px rgba(255,215,120,0.25) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 0 0 1px rgba(212,165,116,0.3)",
      height: "12px",
      borderRadius: "2px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(40,20,5,0.7) 0%, transparent 100%)", height: "22px" },
  },
  glass: {
    ledge: {
      background: "linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 100%)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.18) inset, 0 -1px 0 rgba(255,255,255,0.05) inset",
      backdropFilter: "blur(12px)",
      height: "8px",
      borderRadius: "1px",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, transparent 100%)", height: "18px" },
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
