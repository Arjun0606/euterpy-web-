import * as jwt from "jsonwebtoken";

const APPLE_MUSIC_API = "https://api.music.apple.com/v1";

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Generate a developer token for Apple Music API.
 * Uses your MusicKit private key from Apple Developer account.
 */
function getDeveloperToken(): string {
  const now = Math.floor(Date.now() / 1000);

  // Reuse token if still valid (tokens last 6 months, we refresh every 30 days)
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!teamId || !keyId || !privateKey) {
    throw new Error(
      "Apple Music not configured. Set APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, and APPLE_MUSIC_PRIVATE_KEY in .env.local"
    );
  }

  const token = jwt.sign(
    {
      iss: teamId,
      iat: now,
      exp: now + 30 * 24 * 60 * 60,
    },
    privateKey,
    {
      algorithm: "ES256",
      header: {
        alg: "ES256",
        kid: keyId,
      },
    }
  );

  cachedToken = token;
  tokenExpiry = now + 30 * 24 * 60 * 60; // 30 days

  return token;
}

async function appleRequest(path: string): Promise<any> {
  const token = getDeveloperToken();

  const res = await fetch(`${APPLE_MUSIC_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Apple Music API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ============================================================
// Types
// ============================================================

export interface AppleMusicAlbum {
  id: string;
  type: "albums";
  attributes: {
    name: string;
    artistName: string;
    releaseDate?: string;
    artwork: {
      url: string; // template: {w}x{h}
      width: number;
      height: number;
    };
    genreNames: string[];
    trackCount: number;
    isComplete: boolean;
  };
}

export interface AppleMusicSong {
  id: string;
  type: "songs";
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    releaseDate?: string;
    durationInMillis: number;
    artwork: {
      url: string;
      width: number;
      height: number;
    };
    genreNames: string[];
    trackNumber: number;
  };
}

// ============================================================
// Artwork URL helper
// ============================================================

/**
 * Convert Apple Music artwork URL template to a real URL.
 * Template format: https://.../{w}x{h}bb.jpg
 */
export function getArtworkUrl(
  template: string,
  width: number,
  height: number
): string {
  return template
    .replace("{w}", width.toString())
    .replace("{h}", height.toString());
}

// ============================================================
// Search
// ============================================================

export interface SearchResults {
  albums: AppleMusicAlbum[];
  songs: AppleMusicSong[];
}

export async function searchMusic(
  query: string,
  types: ("albums" | "songs")[] = ["albums", "songs"],
  limit = 15
): Promise<SearchResults> {
  const typesParam = types.join(",");
  const encoded = encodeURIComponent(query);
  const path = `/catalog/us/search?term=${encoded}&types=${typesParam}&limit=${limit}`;

  const data = await appleRequest(path);

  return {
    albums: data.results?.albums?.data || [],
    songs: data.results?.songs?.data || [],
  };
}

export async function getAlbum(
  appleId: string
): Promise<AppleMusicAlbum | null> {
  try {
    const data = await appleRequest(`/catalog/us/albums/${appleId}`);
    return data.data?.[0] || null;
  } catch {
    return null;
  }
}

export async function getSong(
  appleId: string
): Promise<AppleMusicSong | null> {
  try {
    const data = await appleRequest(`/catalog/us/songs/${appleId}`);
    return data.data?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get album tracks (songs within an album).
 */
export async function getAlbumTracks(
  appleId: string
): Promise<AppleMusicSong[]> {
  try {
    const data = await appleRequest(
      `/catalog/us/albums/${appleId}/tracks`
    );
    return data.data || [];
  } catch {
    return [];
  }
}
