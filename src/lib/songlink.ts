/**
 * Songlink (Odesli) — free API that resolves any music URL into the
 * equivalent links on every other streaming platform. We use it so
 * every album/song/artist page can show streaming icons for Spotify,
 * YouTube Music, Tidal, etc., not just Apple Music.
 *
 * Honors the streaming-agnostic principle: Apple is the catalog,
 * but the listener uses whatever they want.
 */

const SONGLINK_API = "https://api.song.link/v1-alpha.1/links";

export interface SonglinkPlatformLink {
  url: string;
  nativeAppUriMobile?: string;
  nativeAppUriDesktop?: string;
  entityUniqueId?: string;
}

export interface SonglinkResponse {
  entityUniqueId: string;
  pageUrl: string;
  linksByPlatform: Record<string, SonglinkPlatformLink>;
}

export async function getSonglink(appleMusicUrl: string): Promise<SonglinkResponse | null> {
  try {
    const url = `${SONGLINK_API}?url=${encodeURIComponent(appleMusicUrl)}`;
    const res = await fetch(url, {
      // Cache for 24h — these mappings change rarely
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Build the Apple Music URL we pass to Songlink given an album / song / artist.
 * Songlink accepts the canonical Apple Music URL.
 */
export function appleMusicAlbumUrl(appleId: string): string {
  return `https://music.apple.com/us/album/${appleId}`;
}

export function appleMusicSongUrl(appleId: string): string {
  return `https://music.apple.com/us/song/${appleId}`;
}

export function appleMusicArtistUrl(appleId: string): string {
  return `https://music.apple.com/us/artist/${appleId}`;
}

// Platforms we surface as icons. Order matters — most popular first.
export const PLATFORM_ORDER = [
  "spotify",
  "appleMusic",
  "youtube",
  "youtubeMusic",
  "tidal",
  "amazonMusic",
  "deezer",
  "soundcloud",
  "bandcamp",
  "pandora",
] as const;

export const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtube: "YouTube",
  youtubeMusic: "YouTube Music",
  tidal: "Tidal",
  amazonMusic: "Amazon Music",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  pandora: "Pandora",
};
