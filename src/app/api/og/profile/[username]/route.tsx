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
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const format = request.nextUrl.searchParams.get("format");
  const [width, height] = format === "square" ? [1080, 1080] : [1200, 630];

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  // Get to Know Me albums for the card
  const { data: gtkmItems } = await supabase
    .from("get_to_know_me")
    .select("position, albums(artwork_url, title)")
    .eq("user_id", profile.id)
    .order("position")
    .limit(3);

  const covers = [null, null, null] as (string | null)[];
  if (gtkmItems) {
    for (const item of gtkmItems as any[]) {
      const idx = item.position - 1;
      if (idx >= 0 && idx < 3) {
        covers[idx] = artworkUrl(item.albums?.artwork_url, 500);
      }
    }
  }

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
        {/* Get to Know Me — 3 album covers */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {covers.map((url, i) => (
            <div
              key={i}
              style={{
                width: format === "square" ? "280px" : "180px",
                height: format === "square" ? "280px" : "180px",
                borderRadius: "12px",
                overflow: "hidden",
                display: "flex",
                backgroundColor: url ? "transparent" : "#18181b",
              }}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3f3f46",
                    fontSize: "32px",
                  }}
                >
                  ♪
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Profile info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginLeft: "48px",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: format === "square" ? "48px" : "36px",
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: "8px",
            }}
          >
            {profile.display_name || profile.username}
          </div>
          <div
            style={{
              fontSize: format === "square" ? "28px" : "22px",
              color: "#FF1493",
              marginBottom: "24px",
            }}
          >
            @{profile.username}
          </div>
          {profile.bio && (
            <div
              style={{
                fontSize: format === "square" ? "24px" : "18px",
                color: "#a1a1aa",
                marginBottom: "24px",
                lineHeight: 1.4,
              }}
            >
              {profile.bio}
            </div>
          )}
          <div
            style={{
              fontSize: format === "square" ? "22px" : "16px",
              color: "#52525b",
            }}
          >
            {profile.album_count} albums · euterpy.app/{profile.username}
          </div>
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
    { width, height }
  );
}
