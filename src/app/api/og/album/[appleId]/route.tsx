import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";

function artworkUrl(template: string | null, size: number): string | null {
  if (!template) return null;
  return template.replace("{w}", size.toString()).replace("{h}", size.toString());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appleId: string }> }
) {
  const { appleId } = await params;
  const supabase = createServiceClient();

  const { data: album } = await supabase
    .from("albums")
    .select("title, artist_name, artwork_url, average_rating, rating_count, genre_names")
    .eq("apple_id", appleId)
    .single();

  if (!album) {
    return new Response("Not found", { status: 404 });
  }

  const cover = artworkUrl(album.artwork_url, 600);
  const genres = (album.genre_names || []).filter((g: string) => g !== "Music").slice(0, 3).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#000000",
          padding: "48px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Album artwork */}
        <div
          style={{
            width: "280px",
            height: "280px",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexShrink: 0,
            backgroundColor: "#18181b",
          }}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3f3f46", fontSize: "48px" }}>
              ♪
            </div>
          )}
        </div>

        {/* Album info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginLeft: "48px",
            flex: 1,
          }}
        >
          <div style={{ fontSize: "36px", fontWeight: 700, color: "#ffffff", marginBottom: "8px", lineHeight: 1.2 }}>
            {album.title}
          </div>
          <div style={{ fontSize: "24px", color: "#a1a1aa", marginBottom: "16px" }}>
            {album.artist_name}
          </div>
          {genres && (
            <div style={{ fontSize: "16px", color: "#52525b", marginBottom: "24px" }}>
              {genres}
            </div>
          )}
          {album.average_rating ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontSize: "48px", fontWeight: 700, color: "#FF1493" }}>
                {Number(album.average_rating).toFixed(1)}
              </span>
              <span style={{ fontSize: "18px", color: "#52525b" }}>
                / 5 from {album.rating_count} {album.rating_count === 1 ? "rating" : "ratings"}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: "18px", color: "#3f3f46" }}>Not yet rated</div>
          )}
        </div>

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            right: "48px",
            fontSize: "18px",
            color: "#27272a",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          EUTERPY
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
