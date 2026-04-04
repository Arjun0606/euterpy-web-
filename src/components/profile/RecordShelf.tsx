"use client";

import { getArtworkUrl } from "@/lib/apple-music/client";
import Stars from "@/components/ui/Stars";
import Link from "next/link";

interface RatingItem {
  id: string;
  score: number;
  reaction: string | null;
  albums: {
    apple_id: string;
    title: string;
    artist_name: string;
    artwork_url: string | null;
  };
}

interface Props {
  ratings: RatingItem[];
  title?: string;
}

function artwork(url: string | null, size = 300): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default function RecordShelf({ ratings, title = "Collection" }: Props) {
  if (ratings.length === 0) {
    return (
      <div className="mb-10">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-4">
          {title}
        </h2>
        <p className="text-muted/60 text-sm">No albums rated yet.</p>
      </div>
    );
  }

  // Group into rows of 5 (each row is a "shelf")
  const shelves: RatingItem[][] = [];
  for (let i = 0; i < ratings.length; i += 5) {
    shelves.push(ratings.slice(i, i + 5));
  }

  return (
    <div className="mb-10">
      <h2 className="text-xs uppercase tracking-widest text-muted mb-6">
        {title}
      </h2>

      <div className="space-y-2">
        {shelves.map((row, rowIndex) => (
          <div key={rowIndex} className="relative">
            {/* Albums on the shelf */}
            <div className="flex gap-2 sm:gap-3 pb-2 relative z-10">
              {row.map((rating) => {
                const album = rating.albums;
                const coverUrl = artwork(album.artwork_url, 300);

                return (
                  <Link
                    key={rating.id}
                    href={`/album/${album.apple_id}`}
                    className="group flex-1 min-w-0 max-w-[20%]"
                  >
                    {/* Album cover — slight tilt for realism */}
                    <div
                      className="aspect-square rounded-sm overflow-hidden shadow-lg border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-accent/10"
                      style={{
                        transformOrigin: "bottom center",
                      }}
                    >
                      {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverUrl}
                          alt={album.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-card flex items-center justify-center text-border">
                          ♪
                        </div>
                      )}
                    </div>

                    {/* Info below — visible on hover */}
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-xs font-medium truncate">
                        {album.title}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {album.artist_name}
                      </p>
                      <Stars score={rating.score} size="sm" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* The shelf — a subtle wooden ledge */}
            <div
              className="h-[3px] rounded-full relative z-0"
              style={{
                background:
                  "linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 50%, #111 100%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(255,255,255,0.03) inset",
              }}
            />
            {/* Shelf shadow */}
            <div
              className="h-4 -mt-1"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
