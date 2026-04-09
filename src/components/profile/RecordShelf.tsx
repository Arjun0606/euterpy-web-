"use client";

import { useState } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";
import Stars from "@/components/ui/Stars";
import Link from "next/link";
import { SHELF_STYLES, type ShelfStyle } from "@/lib/shelfStyles";

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
  album_type?: string;
}

type SortBy = "recent" | "rating" | "artist";
type FilterType = "all" | "album" | "ep" | "single" | "song";

interface Props {
  items: RatingItem[];
  title?: string;
  showSort?: boolean;
  shelfStyle?: ShelfStyle;
}

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
  const [filter, setFilter] = useState<FilterType>("all");

  if (items.length === 0) {
    return (
      <div className="mb-10">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">{title}</h2>
        <p className="text-muted/60 text-sm italic">Nothing here yet.</p>
      </div>
    );
  }

  const filtered = filter === "all" ? items : items.filter((i) => {
    if (filter === "song") return i.type === "song";
    if (filter === "album") return i.type === "album" && (!i.album_type || i.album_type === "album" || i.album_type === "compilation");
    if (filter === "ep") return i.type === "album" && i.album_type === "ep";
    if (filter === "single") return i.type === "album" && i.album_type === "single";
    return true;
  });
  const epCount = items.filter((i) => i.type === "album" && i.album_type === "ep").length;
  const singleCount = items.filter((i) => i.type === "album" && i.album_type === "single").length;
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
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="flex gap-0.5 bg-card rounded-lg p-0.5 border border-border overflow-x-auto no-scrollbar">
            {([
              ["all", "All"],
              ["album", "Albums"],
              ...(epCount > 0 ? [["ep", "EPs"]] as [FilterType, string][] : []),
              ...(singleCount > 0 ? [["single", "Singles"]] as [FilterType, string][] : []),
              ["song", "Songs"],
            ] as [FilterType, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap ${
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
      <div className="space-y-6">
        {shelves.map((row, rowIndex) => (
          <div key={rowIndex} className="relative">
            {/* Frame (back wall + side walls) — wraps the row */}
            <div style={{ ...style.frame, padding: style.innerPadding }}>
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
                        className="aspect-square rounded-sm overflow-hidden shadow-2xl border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-accent/10 relative"
                        style={{
                          transformOrigin: "bottom center",
                          boxShadow: shelfStyle === "minimal"
                            ? "0 6px 16px rgba(0,0,0,0.6)"
                            : "0 8px 24px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.6)",
                        }}
                      >
                        {coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-card flex items-center justify-center text-border">♪</div>
                        )}
                        {/* Type badge */}
                        {item.type === "song" ? (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">SONG</div>
                        ) : item.album_type === "ep" ? (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">EP</div>
                        ) : item.album_type === "single" ? (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">SINGLE</div>
                        ) : item.album_type === "compilation" ? (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-zinc-700/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">COMP</div>
                        ) : null}
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
            </div>

            {/* Shelf ledge — front lip below the frame */}
            <div className="relative z-0" style={style.ledge} />
            <div style={style.shadow} />
          </div>
        ))}
      </div>
    </div>
  );
}
