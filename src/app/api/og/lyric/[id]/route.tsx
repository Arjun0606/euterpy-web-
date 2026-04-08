import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";

function art(template: string | null, size: number): string | null {
  if (!template) return null;
  return template.replace("{w}", size.toString()).replace("{h}", size.toString());
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: pin } = await supabase
    .from("lyric_pins")
    .select("lyric, song_apple_id, song_title, song_artist, song_artwork_url, profiles(username, display_name)")
    .eq("id", id)
    .single();

  if (!pin) {
    return new Response("Not found", { status: 404 });
  }

  const author = (pin.profiles as any) || {};
  const cover = art(pin.song_artwork_url, 600);

  // Pick a font size based on lyric length
  const lyricLen = pin.lyric.length;
  const lyricSize = lyricLen < 60 ? 84 : lyricLen < 120 ? 64 : lyricLen < 200 ? 48 : 38;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          padding: "70px",
          fontFamily: "sans-serif",
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255, 20, 147, 0.18) 0%, rgba(0, 0, 0, 0) 60%)",
          position: "relative",
        }}
      >
        {/* Top: brand bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 18, color: "#52525b", letterSpacing: "0.22em", fontWeight: 700, display: "flex" }}>EUTERPY</div>
          <div style={{ fontSize: 16, color: "#52525b", letterSpacing: "0.16em", display: "flex" }}>— A LYRIC</div>
        </div>

        {/* Big quotation mark */}
        <div
          style={{
            fontSize: 200,
            color: "#FF1493",
            fontStyle: "italic",
            lineHeight: 0.6,
            display: "flex",
            opacity: 0.3,
            marginBottom: -40,
            marginLeft: -10,
          }}
        >
          &ldquo;
        </div>

        {/* The lyric — centered, big italic serif */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <div
            style={{
              fontSize: lyricSize,
              color: "#fafafa",
              fontStyle: "italic",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              display: "flex",
              maxWidth: "100%",
            }}
          >
            {pin.lyric}
          </div>
        </div>

        {/* Footer: song + author */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 30,
            paddingTop: 24,
            borderTop: "1px solid #18181b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {cover && (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  overflow: "hidden",
                  display: "flex",
                  border: "1px solid #18181b",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, color: "#fafafa", fontWeight: 600, display: "flex" }}>
                {pin.song_title.length > 32 ? pin.song_title.slice(0, 32) + "…" : pin.song_title}
              </div>
              <div style={{ fontSize: 16, color: "#71717a", fontStyle: "italic", marginTop: 2, display: "flex" }}>
                {pin.song_artist.length > 36 ? pin.song_artist.slice(0, 36) + "…" : pin.song_artist}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 14, color: "#FF1493", display: "flex" }}>
              euterpy.app
            </div>
            <div style={{ fontSize: 12, color: "#52525b", marginTop: 4, display: "flex" }}>
              @{author.username}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
