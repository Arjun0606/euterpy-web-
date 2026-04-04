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
    .from("albums")
    .select("apple_id, title, artist_name, release_date, artwork_url")
    .or(`title.ilike.%${trimmed}%,artist_name.ilike.%${trimmed}%`)
    .limit(10);

  const localResults = (cached || []).map((a) => ({
    appleId: a.apple_id,
    title: a.title,
    artistName: a.artist_name,
    releaseDate: a.release_date,
    artworkUrl: a.artwork_url ? getArtworkUrl(a.artwork_url, 500, 500) : null,
  }));

  // Search Apple Music
  try {
    const { albums } = await searchMusic(trimmed, ["albums"], 15);

    const appleResults = albums.map((album) => ({
      appleId: album.id,
      title: album.attributes.name,
      artistName: album.attributes.artistName,
      releaseDate: album.attributes.releaseDate || null,
      artworkUrl: getArtworkUrl(album.attributes.artwork.url, 500, 500),
    }));

    // Merge: local first, then Apple results
    const seenIds = new Set(localResults.map((r) => r.appleId));
    const merged = [...localResults];
    for (const album of appleResults) {
      if (!seenIds.has(album.appleId)) {
        merged.push(album);
        seenIds.add(album.appleId);
      }
    }

    return NextResponse.json({ results: merged.slice(0, 20) });
  } catch (error: any) {
    console.error("Apple Music search error:", error?.message || error);
    // Return error details in dev for debugging
    return NextResponse.json({
      results: localResults,
      error: error?.message || "Apple Music search failed",
    });
  }
}
