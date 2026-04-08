import { NextRequest, NextResponse } from "next/server";
import { getAlbum } from "@/lib/apple-music/client";
import { createServiceClient } from "@/lib/supabase/server";

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
    // If we have the album but missing editorial data, try to enrich it
    if (!existing.editorial_notes && !existing.record_label) {
      const appleAlbum = await getAlbum(appleId);
      if (appleAlbum?.attributes) {
        const attrs = appleAlbum.attributes;
        const editorialText = attrs.editorialNotes?.standard || attrs.editorialNotes?.short || null;
        if (editorialText || attrs.recordLabel) {
          await supabase.from("albums").update({
            editorial_notes: editorialText ? stripHtml(editorialText) : null,
            record_label: attrs.recordLabel || null,
            copyright: attrs.copyright || null,
            apple_url: attrs.url || null,
            is_single: attrs.isSingle || false,
          }).eq("id", existing.id);

          existing.editorial_notes = editorialText ? stripHtml(editorialText) : null;
          existing.record_label = attrs.recordLabel || null;
          existing.copyright = attrs.copyright || null;
          existing.apple_url = attrs.url || null;
          existing.is_single = attrs.isSingle || false;
        }
      }
    }
    return NextResponse.json({ album: existing });
  }

  // Fetch from Apple Music
  const appleAlbum = await getAlbum(appleId);
  if (!appleAlbum) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const attrs = appleAlbum.attributes;
  const editorialText = attrs.editorialNotes?.standard || attrs.editorialNotes?.short || null;
  const albumType = deriveAlbumType(attrs);

  const { data: album, error } = await supabase
    .from("albums")
    .insert({
      apple_id: appleId,
      title: attrs.name,
      artist_name: attrs.artistName,
      release_date: attrs.releaseDate || null,
      artwork_url: attrs.artwork.url,
      genre_names: attrs.genreNames,
      track_count: attrs.trackCount,
      editorial_notes: editorialText ? stripHtml(editorialText) : null,
      record_label: attrs.recordLabel || null,
      copyright: attrs.copyright || null,
      apple_url: attrs.url || null,
      is_single: attrs.isSingle || false,
      album_type: albumType,
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function deriveAlbumType(attrs: any): "album" | "ep" | "single" | "compilation" {
  if (attrs.isSingle) return "single";
  if (attrs.isCompilation) return "compilation";
  // Apple Music doesn't reliably tag EPs, so use track count heuristic
  if (attrs.trackCount && attrs.trackCount >= 2 && attrs.trackCount <= 6 && !attrs.isSingle) return "ep";
  return "album";
}
