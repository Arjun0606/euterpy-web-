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

  const { data: chart } = await supabase
    .from("charts")
    .select("period_label, created_at, profiles(username, display_name)")
    .eq("id", id)
    .single();

  if (!chart) {
    return new Response("Not found", { status: 404 });
  }

  const { data: items } = await supabase
    .from("chart_items")
    .select("position, target_title, target_artist, target_artwork_url")
    .eq("chart_id", id)
    .order("position")
    .limit(10);

  const author = (chart.profiles as any) || {};
  const itemRows = (items || []).map((it: any) => ({
    position: it.position,
    title: it.target_title,
    artist: it.target_artist,
    cover: art(it.target_artwork_url, 200),
  }));

  const periodLabel =
    chart.period_label ||
    new Date(chart.created_at).toLocaleString("en-US", { month: "long", year: "numeric" });

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 18, color: "#52525b", letterSpacing: "0.22em", fontWeight: 700, display: "flex" }}>EUTERPY</div>
          <div style={{ fontSize: 16, color: "#52525b", letterSpacing: "0.16em", display: "flex" }}>— THE CHART</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
              display: "flex",
            }}
          >
            My ten
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: "#FF1493",
              fontStyle: "italic",
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
              display: "flex",
            }}
          >
            right now.
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#a1a1aa",
              fontStyle: "italic",
              marginTop: 14,
              display: "flex",
            }}
          >
            {periodLabel}
          </div>
        </div>

        {/* Items in a 2-column grid */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
          {[0, 1, 2, 3, 4].map((row) => {
            const left = itemRows[row * 2];
            const right = itemRows[row * 2 + 1];
            return (
              <div
                key={row}
                style={{
                  display: "flex",
                  gap: 14,
                  paddingBottom: 8,
                  paddingTop: 8,
                  borderBottom: row < 4 ? "1px solid #18181b" : "none",
                }}
              >
                {[left, right].map((it, col) => (
                  <div
                    key={col}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "50%",
                      minWidth: 0,
                    }}
                  >
                    {it ? (
                      <>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: "#3f3f46",
                            letterSpacing: "-0.02em",
                            width: 36,
                            textAlign: "right",
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          {String(it.position).padStart(2, "0")}
                        </div>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 6,
                            overflow: "hidden",
                            display: "flex",
                            backgroundColor: "#0a0a0a",
                            border: "1px solid #18181b",
                          }}
                        >
                          {it.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#27272a", fontSize: 18 }}>♪</div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 16,
                              color: "#fafafa",
                              fontWeight: 600,
                              letterSpacing: "-0.01em",
                              display: "flex",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {it.title.length > 22 ? it.title.slice(0, 22) + "…" : it.title}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#71717a",
                              fontStyle: "italic",
                              marginTop: 1,
                              display: "flex",
                            }}
                          >
                            {it.artist.length > 26 ? it.artist.slice(0, 26) + "…" : it.artist}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ width: "100%", display: "flex" }} />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #18181b",
            paddingTop: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, color: "#fafafa", fontWeight: 600, display: "flex" }}>
              {author.display_name || author.username}
            </div>
            <div style={{ fontSize: 16, color: "#FF1493", marginTop: 4, display: "flex" }}>
              euterpy.com/{author.username}
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
