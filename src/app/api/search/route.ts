import { NextRequest, NextResponse } from "next/server";
import { searchMusic, getArtworkUrl } from "@/lib/apple-music/client";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ albums: [], songs: [] });
  }

  const trimmed = query.trim();

  try {
    const { albums, songs } = await searchMusic(trimmed, ["albums", "songs"], 12);

    const albumResults = albums.map((album) => ({
      kind: "album" as const,
      appleId: album.id,
      title: album.attributes.name,
      artistName: album.attributes.artistName,
      releaseDate: album.attributes.releaseDate || null,
      artworkUrl: getArtworkUrl(album.attributes.artwork.url, 500, 500),
    }));

    const songResults = songs.map((song) => ({
      kind: "song" as const,
      appleId: song.id,
      title: song.attributes.name,
      artistName: song.attributes.artistName,
      albumName: song.attributes.albumName,
      artworkUrl: getArtworkUrl(song.attributes.artwork.url, 500, 500),
      durationMs: song.attributes.durationInMillis,
    }));

    return NextResponse.json({ albums: albumResults, songs: songResults });
  } catch {
    return NextResponse.json({ albums: [], songs: [] });
  }
}
