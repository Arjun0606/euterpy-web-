import { NextRequest, NextResponse } from "next/server";
import { searchMusic, getArtworkUrl } from "@/lib/apple-music/client";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const trimmed = query.trim();

  // Check local DB first
  const supabase = createServiceClient();
  const { data: cached } = await supabase
    .from("songs")
    .select("apple_id, title, artist_name, album_name, artwork_url, duration_ms")
    .or(`title.ilike.%${trimmed}%,artist_name.ilike.%${trimmed}%`)
    .limit(10);

  const localResults = (cached || []).map((s) => ({
    appleId: s.apple_id,
    title: s.title,
    artistName: s.artist_name,
    albumName: s.album_name,
    artworkUrl: s.artwork_url ? getArtworkUrl(s.artwork_url, 500, 500) : null,
    durationMs: s.duration_ms,
  }));

  // Search Apple Music
  try {
    const { songs } = await searchMusic(trimmed, ["songs"], 15);

    const appleResults = songs.map((song) => ({
      appleId: song.id,
      title: song.attributes.name,
      artistName: song.attributes.artistName,
      albumName: song.attributes.albumName,
      artworkUrl: getArtworkUrl(song.attributes.artwork.url, 500, 500),
      durationMs: song.attributes.durationInMillis,
    }));

    const seenIds = new Set(localResults.map((r) => r.appleId));
    const merged = [...localResults];
    for (const song of appleResults) {
      if (!seenIds.has(song.appleId)) {
        merged.push(song);
        seenIds.add(song.appleId);
      }
    }

    return NextResponse.json({ results: merged.slice(0, 20) });
  } catch (error) {
    console.error("Apple Music song search error:", error);
    return NextResponse.json({ results: localResults });
  }
}
