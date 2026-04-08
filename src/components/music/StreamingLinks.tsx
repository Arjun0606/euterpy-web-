import { getSonglink, PLATFORM_ORDER, PLATFORM_LABELS, appleMusicAlbumUrl, appleMusicSongUrl, appleMusicArtistUrl } from "@/lib/songlink";

interface Props {
  kind: "album" | "song" | "artist";
  appleId: string;
  appleUrl?: string | null;
}

/**
 * Streaming-platform link row. Server component — fetches Songlink
 * once and caches for 24h. Surfaces the streaming-agnostic principle:
 * we know you might be on Spotify, Tidal, YouTube — and we love you.
 */
export default async function StreamingLinks({ kind, appleId, appleUrl }: Props) {
  // Resolve which Apple URL to feed Songlink
  const targetUrl =
    appleUrl ||
    (kind === "album" ? appleMusicAlbumUrl(appleId)
    : kind === "song" ? appleMusicSongUrl(appleId)
    : appleMusicArtistUrl(appleId));

  const result = await getSonglink(targetUrl);
  if (!result) return null;

  const links = PLATFORM_ORDER
    .map((platform) => ({ platform, link: result.linksByPlatform[platform] }))
    .filter((p) => p.link?.url);

  if (links.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-700 mb-2">— Listen anywhere</p>
      <div className="flex flex-wrap gap-1.5">
        {links.map(({ platform, link }) => (
          <a
            key={platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 bg-card border border-border rounded-full text-[10px] uppercase tracking-[0.14em] font-semibold text-zinc-500 hover:text-accent hover:border-accent/40 transition-colors"
          >
            {PLATFORM_LABELS[platform] || platform}
          </a>
        ))}
      </div>
    </div>
  );
}
