import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";

/**
 * The Three card — the highest-leverage shareable artifact in Euterpy.
 *
 * Renders a profile's three GTKM albums as a magazine-grade poster
 * meant to be downloaded and posted on Twitter, Instagram Stories,
 * iMessage, etc. Format is 1080×1350 (Instagram post 4:5) which is
 * the most universally usable share size.
 *
 * This card is the Euterpy equivalent of Letterboxd's Four Favourites.
 * It needs to be print-quality. Treat it as the most important image
 * the product produces.
 */

function artworkUrl(template: string | null, size: number): string | null {
  if (!template) return null;
  return template.replace("{w}", size.toString()).replace("{h}", size.toString());
}

const SLOT_LABELS = [
  "Shaped me",
  "I keep coming back to",
  "Changed everything",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio")
    .eq("username", username)
    .single();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const { data: gtkmItems } = await supabase
    .from("get_to_know_me")
    .select("position, story, albums(artwork_url, title, artist_name)")
    .eq("user_id", profile.id)
    .order("position")
    .limit(3);

  const slots: { url: string | null; title: string | null; artist: string | null; story: string | null }[] = [
    { url: null, title: null, artist: null, story: null },
    { url: null, title: null, artist: null, story: null },
    { url: null, title: null, artist: null, story: null },
  ];
  if (gtkmItems) {
    for (const item of gtkmItems as any[]) {
      const idx = item.position - 1;
      if (idx >= 0 && idx < 3 && item.albums) {
        slots[idx] = {
          url: artworkUrl(item.albums.artwork_url, 600),
          title: item.albums.title,
          artist: item.albums.artist_name,
          story: item.story,
        };
      }
    }
  }

  const displayName = profile.display_name || profile.username;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          padding: "70px 64px 56px 64px",
          fontFamily: "serif",
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(255, 20, 147, 0.16) 0%, rgba(0, 0, 0, 0) 55%)",
          position: "relative",
        }}
      >
        {/* Masthead */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 24,
            borderBottom: "1px solid #18181b",
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: "#71717a",
              letterSpacing: "0.32em",
              fontWeight: 700,
              display: "flex",
            }}
          >
            EUTERPY
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#FF1493",
              letterSpacing: "0.22em",
              display: "flex",
            }}
          >
            — THE THREE
          </div>
        </div>

        {/* Headline block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 36,
            marginBottom: 38,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#71717a",
              fontStyle: "italic",
              display: "flex",
              marginBottom: 10,
            }}
          >
            The three albums that explain
          </div>
          <div
            style={{
              fontSize: 76,
              color: "#ffffff",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              display: "flex",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </div>
        </div>

        {/* The three covers */}
        <div
          style={{
            display: "flex",
            gap: 22,
            marginBottom: 36,
          }}
        >
          {slots.map((slot, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 296,
              }}
            >
              <div
                style={{
                  width: 296,
                  height: 296,
                  borderRadius: 10,
                  overflow: "hidden",
                  display: "flex",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #1f1f23",
                  boxShadow: "0 30px 60px -20px rgba(0, 0, 0, 0.8)",
                }}
              >
                {slot.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slot.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#27272a",
                      fontSize: 80,
                    }}
                  >
                    ♪
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 18,
                  paddingRight: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#FF1493",
                    letterSpacing: "0.18em",
                    fontWeight: 700,
                    fontFamily: "sans-serif",
                    textTransform: "uppercase",
                    display: "flex",
                    marginBottom: 8,
                  }}
                >
                  {String(i + 1).padStart(2, "0")} · {SLOT_LABELS[i]}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    color: "#fafafa",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.1,
                    display: "flex",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {slot.title
                    ? slot.title.length > 30
                      ? slot.title.slice(0, 30) + "…"
                      : slot.title
                    : "—"}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: "#71717a",
                    fontStyle: "italic",
                    marginTop: 4,
                    display: "flex",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {slot.artist
                    ? slot.artist.length > 32
                      ? slot.artist.slice(0, 32) + "…"
                      : slot.artist
                    : ""}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingTop: 24,
            borderTop: "1px solid #18181b",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 14,
                color: "#52525b",
                fontStyle: "italic",
                display: "flex",
                fontFamily: "serif",
              }}
            >
              A music identity —
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#FF1493",
                marginTop: 4,
                letterSpacing: "0.04em",
                fontFamily: "sans-serif",
                fontWeight: 600,
                display: "flex",
              }}
            >
              euterpy.com/{profile.username}
            </div>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#52525b",
              letterSpacing: "0.18em",
              fontFamily: "sans-serif",
              display: "flex",
            }}
          >
            VOL. I
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
