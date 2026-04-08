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
  const isSquare = format === "square";
  const [width, height] = isSquare ? [1080, 1080] : [1200, 630];

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  // Get to Know Me — the 3 hero albums
  const { data: gtkmItems } = await supabase
    .from("get_to_know_me")
    .select("position, albums(artwork_url, title, artist_name)")
    .eq("user_id", profile.id)
    .order("position")
    .limit(3);

  const covers: { url: string | null; title: string | null; artist: string | null }[] = [
    { url: null, title: null, artist: null },
    { url: null, title: null, artist: null },
    { url: null, title: null, artist: null },
  ];
  if (gtkmItems) {
    for (const item of gtkmItems as any[]) {
      const idx = item.position - 1;
      if (idx >= 0 && idx < 3 && item.albums) {
        covers[idx] = {
          url: artworkUrl(item.albums.artwork_url, 600),
          title: item.albums.title,
          artist: item.albums.artist_name,
        };
      }
    }
  }

  // Story count + lyric count
  const [{ count: storyCount }, { count: lyricCount }] = await Promise.all([
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("lyric_pins").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);

  const displayName = profile.display_name || profile.username;
  const coverSize = isSquare ? 280 : 200;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          padding: isSquare ? "60px" : "50px 60px",
          fontFamily: "sans-serif",
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255, 20, 147, 0.18) 0%, rgba(0, 0, 0, 0) 60%)",
          position: "relative",
        }}
      >
        {/* Top: brand bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isSquare ? 50 : 30 }}>
          <div style={{ fontSize: 18, color: "#52525b", letterSpacing: "0.22em", fontWeight: 700, display: "flex" }}>EUTERPY</div>
          <div style={{ fontSize: 16, color: "#52525b", letterSpacing: "0.16em", display: "flex" }}>euterpy.app/{profile.username}</div>
        </div>

        {/* Identity row: name + handle */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: isSquare ? 40 : 28 }}>
          <div
            style={{
              fontSize: isSquare ? 88 : 64,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              display: "flex",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontSize: isSquare ? 28 : 22,
              color: "#FF1493",
              marginTop: 12,
              display: "flex",
            }}
          >
            @{profile.username}
          </div>
        </div>

        {/* Bio (if present) */}
        {profile.bio && (
          <div
            style={{
              fontSize: isSquare ? 22 : 18,
              color: "#a1a1aa",
              marginBottom: isSquare ? 36 : 24,
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maxWidth: "85%",
              fontStyle: "italic",
            }}
          >
            {profile.bio}
          </div>
        )}

        {/* Get to Know Me — 3 covers */}
        <div style={{ display: "flex", gap: 14, marginBottom: isSquare ? 44 : 28 }}>
          {covers.map((cover, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                width: coverSize,
              }}
            >
              <div
                style={{
                  width: coverSize,
                  height: coverSize,
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #18181b",
                  boxShadow: "0 20px 60px -10px rgba(0, 0, 0, 0.6)",
                }}
              >
                {cover.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.url}
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
                      fontSize: 60,
                    }}
                  >
                    ♪
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Bottom: identity stats + tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid #18181b",
            paddingTop: isSquare ? 24 : 18,
          }}
        >
          <div style={{ display: "flex", gap: isSquare ? 36 : 24 }}>
            <Stat label="ALBUMS" value={String(profile.album_count || 0)} big={isSquare} />
            <Stat label="STORIES" value={String(storyCount || 0)} big={isSquare} />
            <Stat label="LYRICS" value={String(lyricCount || 0)} big={isSquare} />
          </div>
          <div
            style={{
              fontSize: isSquare ? 14 : 12,
              color: "#52525b",
              fontStyle: "italic",
              display: "flex",
              maxWidth: 260,
              textAlign: "right",
            }}
          >
            A music identity.
          </div>
        </div>
      </div>
    ),
    { width, height }
  );
}

function Stat({ label, value, big }: { label: string; value: string; big: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: big ? 40 : 30,
          color: "#ffffff",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          display: "flex",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: big ? 13 : 11,
          color: "#52525b",
          marginTop: 6,
          letterSpacing: "0.16em",
          display: "flex",
        }}
      >
        {label}
      </div>
    </div>
  );
}
