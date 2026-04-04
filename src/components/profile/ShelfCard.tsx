import { getArtworkUrl } from "@/lib/apple-music/client";

interface ShelfItem {
  id: string;
  item_type: "album" | "song";
  position: number;
  note: string | null;
  albums?: {
    apple_id: string;
    title: string;
    artist_name: string;
    artwork_url: string | null;
  } | null;
  songs?: {
    apple_id: string;
    title: string;
    artist_name: string;
    artwork_url: string | null;
  } | null;
}

function artwork(url: string | null, size = 300): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

interface Shelf {
  id: string;
  title: string;
  description: string | null;
  is_favorites: boolean;
  item_count: number;
  items: ShelfItem[];
}

interface Props {
  shelf: Shelf;
  username: string;
}

export default function ShelfCard({ shelf }: Props) {
  const previewItems = shelf.items.slice(0, 4);

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden hover:border-border/80 transition-colors">
      {/* Cover art grid preview */}
      <div className="grid grid-cols-2 aspect-square">
        {[0, 1, 2, 3].map((i) => {
          const item = previewItems[i];
          const rawUrl =
            item?.item_type === "album"
              ? item.albums?.artwork_url
              : item?.songs?.artwork_url;
          const coverUrl = artwork(rawUrl ?? null);

          return (
            <div key={i} className="aspect-square bg-background overflow-hidden">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-border text-xs">
                  ♪
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shelf info */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">
          {shelf.is_favorites ? "★ Favorites" : shelf.title}
        </h3>
        <p className="text-xs text-muted mt-0.5">
          {shelf.item_count} {shelf.item_count === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
}
