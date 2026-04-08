import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";

function artworkUrl(template: string | null, size: number): string | null {
  if (!template) return null;
  return template.replace("{w}", size.toString()).replace("{h}", size.toString());
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .single();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  // Top 4 albums of the year — by score, then recency
  const { data: ratings } = await supabase
    .from("ratings")
    .select("score, created_at, ownership, albums(title, artist_name, artwork_url)")
    .eq("user_id", profile.id)
    .gte("created_at", yearStart)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(4);

  const topAlbums = (ratings || [])
    .filter((r: any) => r.albums)
    .slice(0, 4)
    .map((r: any) => ({
      title: r.albums.title,
      artist: r.albums.artist_name,
      cover: artworkUrl(r.albums.artwork_url, 500),
    }));

  // Stats
  const totalCollected = (ratings || []).length;
  const mediumCounts: Record<string, number> = {};
  for (const r of (ratings || []) as any[]) {
    if (r.ownership) mediumCounts[r.ownership] = (mediumCounts[r.ownership] || 0) + 1;
  }
  const topMedium = Object.entries(mediumCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const year = new Date().getFullYear();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          padding: "60px 60px 80px 60px",
          fontFamily: "sans-serif",
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255, 20, 147, 0.18) 0%, rgba(0, 0, 0, 0) 60%)",
        }}
      >
        {/* Top: brand + year */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 50 }}>
          <div style={{ fontSize: 22, color: "#52525b", letterSpacing: "0.18em", fontWeight: 600, display: "flex" }}>EUTERPY</div>
          <div style={{ fontSize: 22, color: "#FF1493", letterSpacing: "0.18em", fontWeight: 600, display: "flex" }}>
            {year}
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 56 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 0.95, display: "flex" }}>
            My year
          </div>
          <div style={{ fontSize: 80, fontWeight: 800, color: "#FF1493", fontStyle: "italic", letterSpacing: "-0.04em", lineHeight: 0.95, display: "flex" }}>
            in sound.
          </div>
        </div>

        {/* Top 4 albums grid */}
        <div style={{ display: "flex", gap: 18, marginBottom: 56 }}>
          {[0, 1, 2, 3].map((i) => {
            const album = topAlbums[i];
            return (
              <div
                key={i}
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                }}
              >
                {album?.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3f3f46", fontSize: 60 }}>♪</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 50, marginBottom: 60 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 56, color: "#fff", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, display: "flex" }}>
              {totalCollected}
            </div>
            <div style={{ fontSize: 18, color: "#71717a", marginTop: 6, letterSpacing: "0.14em", display: "flex" }}>COLLECTED</div>
          </div>
          {topMedium && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 56, color: "#fff", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, textTransform: "capitalize", display: "flex" }}>
                {topMedium === "digital" ? "Stream" : topMedium}
              </div>
              <div style={{ fontSize: 18, color: "#71717a", marginTop: 6, letterSpacing: "0.14em", display: "flex" }}>FAVORED MEDIUM</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 56, color: "#fff", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, display: "flex" }}>
              @{profile.username}
            </div>
            <div style={{ fontSize: 18, color: "#71717a", marginTop: 6, letterSpacing: "0.14em", display: "flex" }}>EUTERPY.APP</div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Bottom: name */}
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #27272a", paddingTop: 24 }}>
          <div style={{ fontSize: 28, color: "#a1a1aa", display: "flex" }}>
            {profile.display_name || profile.username}&apos;s year in music
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
