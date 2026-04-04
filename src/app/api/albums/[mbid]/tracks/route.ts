import { NextRequest, NextResponse } from "next/server";
import { getAlbumTracks, getArtworkUrl } from "@/lib/apple-music/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mbid: string }> }
) {
  const { mbid: appleId } = await params;

  const tracks = await getAlbumTracks(appleId);

  const results = tracks.map((song) => ({
    appleId: song.id,
    title: song.attributes.name,
    artistName: song.attributes.artistName,
    trackNumber: song.attributes.trackNumber,
    durationMs: song.attributes.durationInMillis,
    artworkUrl: getArtworkUrl(song.attributes.artwork.url, 200, 200),
  }));

  return NextResponse.json({ tracks: results });
}
