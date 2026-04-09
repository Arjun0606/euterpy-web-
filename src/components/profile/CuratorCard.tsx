import Link from "next/link";
import { getArtworkUrl } from "@/lib/apple-music/client";
import type { CuratorRow } from "@/lib/curatorQuery";

interface Props {
  curator: CuratorRow;
  /** "default" = full magazine portrait, "compact" = smaller for grids */
  variant?: "default" | "compact";
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

/**
 * The CuratorCard — a magazine-grade portrait of a curator.
 *
 * The constitution: show the work, not the score. Each card displays
 * the person's three GTKM covers as the main visual content (because
 * those covers ARE their identity), with the curator label as a small
 * editorial eyebrow above the name. No follower counts. No engagement
 * metrics. Just: who they are, what they curate, what they've made.
 *
 * Default variant is wide and detailed for the dedicated /curators
 * page. Compact variant fits in horizontal grid sections like
 * /discover.
 */
export default function CuratorCard({ curator, variant = "default" }: Props) {
  if (variant === "compact") {
    return (
      <Link
        href={`/${curator.username}`}
        className="group block bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors"
      >
        {/* Three covers strip */}
        <div className="flex gap-1.5 mb-4">
          {[0, 1, 2].map((i) => {
            const cover = art(curator.threeCovers[i] || null, 200);
            return (
              <div
                key={i}
                className="flex-1 aspect-square rounded-md overflow-hidden bg-background border border-border"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-background border border-border overflow-hidden flex items-center justify-center text-xs text-zinc-600 shrink-0">
            {curator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={curator.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              curator.username[0].toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
              {curator.display_name || curator.username}
            </p>
            <p className="text-[10px] text-zinc-600 truncate">@{curator.username}</p>
          </div>
        </div>

        {/* Label */}
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mt-3 font-semibold">
          — {curator.label}
        </p>
      </Link>
    );
  }

  // Default — wide magazine portrait for /curators
  return (
    <Link
      href={`/${curator.username}`}
      className="group block bg-card border border-border rounded-2xl p-6 sm:p-7 hover:border-accent/40 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-6">
        {/* Identity column */}
        <div className="sm:w-56 shrink-0 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-background border border-border overflow-hidden flex items-center justify-center text-sm text-zinc-600 shrink-0">
              {curator.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={curator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                curator.username[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg tracking-tight truncate group-hover:text-accent transition-colors">
                {curator.display_name || curator.username}
              </p>
              <p className="text-[11px] text-zinc-600">@{curator.username}</p>
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold mb-3">
            — {curator.label}
          </p>

          {curator.bio && (
            <p className="text-xs text-zinc-500 italic editorial leading-relaxed line-clamp-3">
              {curator.bio}
            </p>
          )}

          {/* Tiny portfolio counts — kept understated, just signal */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 text-[10px] text-zinc-600">
            {curator.storyCount > 0 && (
              <span>
                <span className="text-zinc-400 font-medium tabular-nums">{curator.storyCount}</span>{" "}
                {curator.storyCount === 1 ? "story" : "stories"}
              </span>
            )}
            {curator.lyricCount > 0 && (
              <span>
                <span className="text-zinc-400 font-medium tabular-nums">{curator.lyricCount}</span>{" "}
                {curator.lyricCount === 1 ? "lyric" : "lyrics"}
              </span>
            )}
            {curator.listCount > 0 && (
              <span>
                <span className="text-zinc-400 font-medium tabular-nums">{curator.listCount}</span>{" "}
                {curator.listCount === 1 ? "list" : "lists"}
              </span>
            )}
          </div>
        </div>

        {/* Three covers — the work */}
        <div className="flex-1 flex gap-2 sm:gap-3">
          {[0, 1, 2].map((i) => {
            const cover = art(curator.threeCovers[i] || null, 400);
            return (
              <div
                key={i}
                className="flex-1 aspect-square rounded-lg overflow-hidden bg-background border border-border group-hover:border-zinc-700 transition-colors"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-800 text-3xl">♪</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
