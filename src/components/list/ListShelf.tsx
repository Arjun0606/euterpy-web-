import Link from "next/link";
import { getArtworkUrl } from "@/lib/apple-music/client";
import { resolveShelfStyle, type ShelfStyle } from "@/lib/shelfStyles";

interface ListItemRow {
  id: string;
  position: number;
  kind: "song" | "album";
  target_apple_id: string;
  target_title: string;
  target_artist: string | null;
  target_artwork_url: string | null;
  caption: string | null;
}

interface Props {
  items: ListItemRow[];
  /**
   * The author's chosen shelf metaphor. Defaults to "minimal" if
   * the user hasn't picked one yet. Same scale as RecordShelf —
   * lists are just another shelf in the same store.
   */
  shelfStyle?: ShelfStyle | string | null;
}

function art(url: string | null, size = 400): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

/**
 * The shelf-themed list view. Wraps a curated list's items in the
 * same physical-shelf chrome (frame + ledge + shadow) that the
 * profile collection uses, so a list and a collection feel like
 * two shelves in the same record store.
 *
 * Layout shape: vertical numbered rows with cover + title + artist +
 * caption, wrapped inside the chosen shelf's frame container so the
 * wood grain / marble veining / glass frosting actually visible
 * around the items. The minimal style stays close to the original
 * generic list look — just a hairline ledge instead of a frame.
 *
 * The frame, ledge and floor shadow are all rendered as ordinary
 * div elements with inline styles pulled from the SHELF_STYLES
 * config, exactly the same way RecordShelf does it. No new design
 * decisions — just a different layout shape inside the same chrome.
 */
export default function ListShelf({ items, shelfStyle }: Props) {
  const { key, config } = resolveShelfStyle(shelfStyle);
  const isMinimal = key === "minimal";

  if (items.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-border rounded-2xl">
        <p className="font-display text-2xl mb-2">An empty shelf.</p>
        <p className="text-sm text-zinc-500 italic">No items in this list yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* The frame — the back wall + side walls of the shelf. Holds
          all the rows. For the minimal style this is invisible. */}
      <div
        style={{
          ...config.frame,
          padding: config.innerPadding,
        }}
      >
        <ol className={isMinimal ? "space-y-6" : "space-y-5"}>
          {items.map((item, idx) => {
            const cover = art(item.target_artwork_url, 400);
            const href =
              item.kind === "song"
                ? `/song/${item.target_apple_id}`
                : `/album/${item.target_apple_id}`;
            return (
              <li key={item.id}>
                <Link href={href} className="block group">
                  <div
                    className={`flex items-start gap-5 py-4 ${
                      isMinimal ? "border-b border-white/[0.04]" : ""
                    }`}
                  >
                    <span className="font-display text-4xl sm:text-5xl tracking-tighter text-zinc-700 group-hover:text-accent transition-colors w-12 sm:w-14 tabular-nums shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-card border border-border shrink-0 shadow-2xl shadow-black/40">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          ♪
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-display text-xl sm:text-2xl tracking-tight leading-tight group-hover:text-accent transition-colors mb-1">
                        {item.target_title}
                      </p>
                      {item.target_artist && (
                        <p className="text-sm text-zinc-500 italic mb-2">
                          {item.target_artist}
                        </p>
                      )}
                      {item.caption && (
                        <p className="editorial text-sm text-zinc-400 leading-relaxed italic">
                          &ldquo;{item.caption}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {/* The ledge — the front lip the records sit on. Always
          rendered, even for minimal (where it's a thin gradient line). */}
      <div style={config.ledge} />

      {/* The floor shadow — the soft fall-off below the ledge. */}
      <div style={config.shadow} />
    </div>
  );
}
