import { getSonglink, PLATFORM_ORDER, PLATFORM_LABELS, appleMusicAlbumUrl, appleMusicSongUrl, appleMusicArtistUrl } from "@/lib/songlink";

interface Props {
  kind: "album" | "song" | "artist";
  appleId: string;
  appleUrl?: string | null;
  // Optional fallback search context — used when Songlink can't resolve
  // the link. Lets us still show Spotify/YouTube/Tidal as search-result
  // links so the user is never stuck.
  title?: string;
  artist?: string;
}

/**
 * Streaming-platform link row. Server component — fetches Songlink
 * once and caches for 24h. Surfaces the streaming-agnostic principle:
 * we know you might be on Spotify, Tidal, YouTube — and we love you.
 *
 * Falls back to search URLs on the major platforms if Songlink can't
 * resolve a direct link, so the row is never silently empty.
 */
export default async function StreamingLinks({ kind, appleId, appleUrl, title, artist }: Props) {
  // Resolve which Apple URL to feed Songlink
  const targetUrl =
    appleUrl ||
    (kind === "album" ? appleMusicAlbumUrl(appleId)
    : kind === "song" ? appleMusicSongUrl(appleId)
    : appleMusicArtistUrl(appleId));

  const result = await getSonglink(targetUrl);

  // Try Songlink first
  type Platform = typeof PLATFORM_ORDER[number];
  const songlinkLinks = result
    ? PLATFORM_ORDER
        .map((platform) => ({ platform, url: result.linksByPlatform[platform]?.url }))
        .filter((p): p is { platform: Platform; url: string } => !!p.url)
    : [];

  // Build a fallback list using search URLs for the major platforms.
  // Used when Songlink fails OR a platform isn't in the Songlink response.
  const searchQuery = encodeURIComponent([title, artist].filter(Boolean).join(" "));
  const fallbacks: Record<string, string> = searchQuery
    ? {
        spotify: `https://open.spotify.com/search/${searchQuery}`,
        appleMusic: targetUrl,
        youtubeMusic: `https://music.youtube.com/search?q=${searchQuery}`,
        youtube: `https://www.youtube.com/results?search_query=${searchQuery}`,
        tidal: `https://listen.tidal.com/search?q=${searchQuery}`,
        amazonMusic: `https://music.amazon.com/search/${searchQuery}`,
        deezer: `https://www.deezer.com/search/${searchQuery}`,
        soundcloud: `https://soundcloud.com/search?q=${searchQuery}`,
        bandcamp: `https://bandcamp.com/search?q=${searchQuery}`,
      }
    : { appleMusic: targetUrl };

  // Merge: Songlink direct links take priority. For platforms missing
  // from Songlink, fall back to a search URL (only if we have title/artist).
  const seen = new Set(songlinkLinks.map((l) => l.platform));
  const links: { platform: string; url: string; isSearch: boolean }[] = [
    ...songlinkLinks.map((l) => ({ ...l, isSearch: false })),
  ];
  for (const platform of PLATFORM_ORDER) {
    if (seen.has(platform)) continue;
    if (fallbacks[platform]) {
      links.push({ platform, url: fallbacks[platform], isSearch: true });
    }
  }

  // Always sort by PLATFORM_ORDER so Spotify is first
  links.sort((a, b) => {
    const ai = PLATFORM_ORDER.indexOf(a.platform as typeof PLATFORM_ORDER[number]);
    const bi = PLATFORM_ORDER.indexOf(b.platform as typeof PLATFORM_ORDER[number]);
    return ai - bi;
  });

  if (links.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-3">— Listen anywhere</p>
      <div className="flex flex-wrap gap-2">
        {links.map(({ platform, url, isSearch }) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center px-4 py-2 bg-card border rounded-full text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors ${
              isSearch
                ? "border-border text-zinc-600 hover:text-zinc-300 hover:border-zinc-700"
                : "border-border text-zinc-400 hover:text-accent hover:border-accent/40"
            }`}
            title={isSearch ? `Search on ${PLATFORM_LABELS[platform] || platform}` : `Open on ${PLATFORM_LABELS[platform] || platform}`}
          >
            {PLATFORM_LABELS[platform] || platform}
          </a>
        ))}
      </div>
    </div>
  );
}
