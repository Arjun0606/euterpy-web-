import { NextResponse } from "next/server";
import { getAppleMusicCharts, getArtworkUrl } from "@/lib/apple-music/client";

export async function GET() {
  try {
    const albums = await getAppleMusicCharts(10);
    const results = albums.map((album) => ({
      appleId: album.id,
      title: album.attributes.name,
      artistName: album.attributes.artistName,
      artworkUrl: album.attributes.artwork?.url
        ? getArtworkUrl(album.attributes.artwork.url, 500, 500)
        : null,
      releaseDate: album.attributes.releaseDate || null,
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
