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

  const { data: story } = await supabase
    .from("stories")
    .select("kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, profiles(username, display_name, avatar_url)")
    .eq("id", id)
    .single();

  if (!story) {
    return new Response("Not found", { status: 404 });
  }

  const author = (story.profiles as any) || {};
  const cover = art(story.target_artwork_url, 600);

  // Pull a 280-char excerpt
  const excerpt = story.body.length > 280 ? story.body.slice(0, 280).trimEnd() + "…" : story.body;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          padding: "60px",
          fontFamily: "sans-serif",
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255, 20, 147, 0.18) 0%, rgba(0, 0, 0, 0) 60%)",
        }}
      >
        {/* Brand bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 18, color: "#52525b", letterSpacing: "0.22em", fontWeight: 700, display: "flex" }}>EUTERPY</div>
          <div style={{ fontSize: 16, color: "#52525b", letterSpacing: "0.16em", display: "flex" }}>— A STORY</div>
        </div>

        {/* Subject card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            paddingBottom: 24,
            borderBottom: "1px solid #18181b",
            marginBottom: 28,
          }}
        >
          {cover && (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: story.kind === "artist" ? 40 : 12,
                overflow: "hidden",
                display: "flex",
                border: "1px solid #18181b",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: "#FF1493", letterSpacing: "0.18em", textTransform: "uppercase", display: "flex", marginBottom: 4 }}>
              On a {story.kind}
            </div>
            <div style={{ fontSize: 28, color: "#fafafa", fontWeight: 700, letterSpacing: "-0.02em", display: "flex" }}>
              {story.target_title.length > 30 ? story.target_title.slice(0, 30) + "…" : story.target_title}
            </div>
            {story.target_artist && story.kind !== "artist" && (
              <div style={{ fontSize: 16, color: "#71717a", fontStyle: "italic", marginTop: 2, display: "flex" }}>
                {story.target_artist.length > 36 ? story.target_artist.slice(0, 36) + "…" : story.target_artist}
              </div>
            )}
          </div>
        </div>

        {/* Headline */}
        {story.headline && (
          <div
            style={{
              fontSize: 60,
              color: "#ffffff",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: 32,
              maxWidth: "100%",
            }}
          >
            {story.headline}
          </div>
        )}

        {/* Pull-quote */}
        <div
          style={{
            fontSize: story.headline ? 24 : 32,
            color: "#d4d4d8",
            fontStyle: "italic",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: story.headline ? 5 : 8,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            paddingLeft: 24,
            borderLeft: "2px solid #FF1493",
          }}
        >
          &ldquo;{excerpt}&rdquo;
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Footer: author + brand */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #18181b",
            paddingTop: 24,
            marginTop: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                overflow: "hidden",
                backgroundColor: "#0a0a0a",
                border: "1px solid #18181b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#52525b",
                fontSize: 22,
              }}
            >
              {author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                author.username?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, color: "#fafafa", fontWeight: 600, display: "flex" }}>
                {author.display_name || author.username}
              </div>
              <div style={{ fontSize: 14, color: "#FF1493", marginTop: 2, display: "flex" }}>
                euterpy.com/{author.username}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: "#52525b", fontStyle: "italic", display: "flex" }}>
            A music identity.
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
