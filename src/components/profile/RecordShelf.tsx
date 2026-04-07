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
      background: "linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 50%, #111 100%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(255,255,255,0.03) inset",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)" },
  },
  wood: {
    ledge: {
      background: "linear-gradient(to bottom, #5c3d2e 0%, #3e2723 40%, #2c1a12 100%)",
      boxShadow: "0 2px 10px rgba(0,0,0,0.5), 0 1px 2px rgba(255,200,150,0.08) inset",
      height: "5px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(30,15,5,0.5) 0%, transparent 100%)" },
  },
  ornate: {
    ledge: {
      background: "linear-gradient(to bottom, #6d4c41 0%, #4e342e 30%, #3e2723 100%)",
      boxShadow: "0 3px 12px rgba(0,0,0,0.6), 0 1px 3px rgba(255,215,0,0.1) inset, 0 -1px 0 rgba(255,215,0,0.05)",
      height: "6px",
      borderRadius: "2px",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(20,10,0,0.5) 0%, transparent 100%)" },
  },
  glass: {
    ledge: {
      background: "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset",
      backdropFilter: "blur(8px)",
    },
    shadow: { background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)" },
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
            <div className="h-[3px] rounded-full relative z-0" style={style.ledge} />
            <div className="h-4 -mt-1" style={style.shadow} />
          </div>
        ))}
      </div>
    </div>
  );
}
