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
  album_type?: string;
}

type SortBy = "recent" | "rating" | "artist";
type FilterType = "all" | "album" | "ep" | "single" | "song";

interface Props {
  items: RatingItem[];
  title?: string;
  showSort?: boolean;
}

function artwork(url: string | null, size = 400): string | null {
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

/**
 * The collection grid. Used to be wrapped in physical "shelf" chrome
 * (wood / marble / glass frames). The metaphor never paid off — the
 * shelf containers fought the editorial dark layout instead of
 * complementing it, and the metaphor was confusing once lists also
 * appeared on the page (a list-of-records doesn't sit on a shelf the
 * way an album collection does).
 *
 * Now this is just a clean responsive grid of cover thumbnails with
 * filter + sort controls. Each cover lifts on hover and reveals
 * title / artist / stars below it. The visual language is the same
 * as Discover and the rest of the editorial dark surfaces in the
 * product, which is what we wanted in the first place.
 */
export default function RecordShelf({ items, title = "Collection", showSort = true }: Props) {
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
        <div className="flex items-center gap-2 mb-6 flex-wrap">
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

      {/* Grid — responsive cover thumbnails */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
        {sorted.map((item) => {
          const coverUrl = artwork(item.artwork_url, 400);
          const href = item.type === "album" ? `/album/${item.apple_id}` : `/song/${item.apple_id}`;

          return (
            <Link key={item.id} href={href} className="group block">
              <div className="aspect-square rounded-lg overflow-hidden bg-card border border-border relative shadow-xl shadow-black/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-accent/30 group-hover:shadow-2xl group-hover:shadow-accent/10">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-2xl">♪</div>
                )}

                {/* Type badge */}
                {item.type === "song" ? (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">SONG</div>
                ) : item.album_type === "ep" ? (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-accent/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">EP</div>
                ) : item.album_type === "single" ? (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-accent/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">SINGLE</div>
                ) : item.album_type === "compilation" ? (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-zinc-700/90 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider">COMP</div>
                ) : null}

                {/* Ownership glyph */}
                {item.ownership && item.ownership !== "digital" && (
                  <div className="absolute bottom-1.5 right-1.5 text-[12px]">
                    {item.ownership === "vinyl" ? "🎵" : item.ownership === "cd" ? "💿" : "📼"}
                  </div>
                )}
              </div>

              {/* Title + artist + stars (always visible, not hover-only — that was a discoverability bug) */}
              <div className="mt-2.5 px-0.5">
                <p className="text-xs font-medium truncate group-hover:text-accent transition-colors">{item.title}</p>
                <p className="text-[11px] text-zinc-500 truncate">{item.artist_name}</p>
                {item.score > 0 && (
                  <div className="mt-0.5">
                    <Stars score={item.score} size="sm" />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
