import { NextRequest, NextResponse } from "next/server";
import { getAlbum } from "@/lib/apple-music/client";
import { createServiceClient } from "@/lib/supabase/server";

// Route param is now apple_id, keeping [mbid] folder name for URL compatibility
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mbid: string }> }
) {
  const { mbid: appleId } = await params;
  const supabase = createServiceClient();

  // Check DB first
  const { data: existing } = await supabase
    .from("albums")
    .select("*")
    .eq("apple_id", appleId)
    .single();

  if (existing) {
    return NextResponse.json({ album: existing });
  }

  // Fetch from Apple Music
  const appleAlbum = await getAlbum(appleId);
  if (!appleAlbum) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const { data: album, error } = await supabase
    .from("albums")
    .insert({
      apple_id: appleId,
      title: appleAlbum.attributes.name,
      artist_name: appleAlbum.attributes.artistName,
      release_date: appleAlbum.attributes.releaseDate || null,
      artwork_url: appleAlbum.attributes.artwork.url,
      genre_names: appleAlbum.attributes.genreNames,
      track_count: appleAlbum.attributes.trackCount,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("albums")
        .select("*")
        .eq("apple_id", appleId)
        .single();
      return NextResponse.json({ album: existing });
    }
    throw error;
  }

  return NextResponse.json({ album });
}
