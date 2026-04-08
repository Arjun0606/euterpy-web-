import { NextRequest, NextResponse } from "next/server";
import { getSong } from "@/lib/apple-music/client";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mbid: string }> }
) {
  const { mbid: appleId } = await params;
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("songs")
    .select("*")
    .eq("apple_id", appleId)
    .single();

  if (existing) {
    return NextResponse.json({ song: existing });
  }

  const appleSong = await getSong(appleId);
  if (!appleSong) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  // Extract parent album ID from the relationships include
  const parentAlbumId = appleSong.relationships?.albums?.data?.[0]?.id || null;

  const { data: song, error } = await supabase
    .from("songs")
    .insert({
      apple_id: appleId,
      title: appleSong.attributes.name,
      artist_name: appleSong.attributes.artistName,
      album_name: appleSong.attributes.albumName,
      album_apple_id: parentAlbumId,
      duration_ms: appleSong.attributes.durationInMillis,
      artwork_url: appleSong.attributes.artwork.url,
      track_number: appleSong.attributes.trackNumber,
      genre_names: appleSong.attributes.genreNames,
      composer_name: appleSong.attributes.composerName || null,
      apple_url: appleSong.attributes.url || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("songs")
        .select("*")
        .eq("apple_id", appleId)
        .single();
      return NextResponse.json({ song: existing });
    }
    throw error;
  }

  return NextResponse.json({ song });
}
