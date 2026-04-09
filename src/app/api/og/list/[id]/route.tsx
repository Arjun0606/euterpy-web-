import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";

function art(template: string | null, size: number): string | null {
  if (!template) return null;
  return template.replace("{w}", size.toString()).replace("{h}", size.toString());
}

/**
 * next/og's edge runtime ships only Latin sans-serif glyphs. Any
 * emoji, decorative symbol (★), or non-Latin character renders as
 * a tofu box. Strip them defensively from anything we display in
 * the share card so user-provided titles don't break the artifact.
 *
 * Allows: ASCII printable, Latin Supplement, common Latin Extended,
 * curly quotes, em/en dashes, ellipsis. Drops emoji and pictographs.
 */
function safe(text: string | null | undefined): string {
  if (!text) return "";
  return text
    // Strip anything outside Basic Latin + Latin-1 Supplement + Latin Extended-A
    // and the small set of typographic characters we use ourselves.
    .replace(/[^\x20-\x7E\u00A0-\u017F\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: list } = await supabase
    .from("lists")
    .select("title, subtitle, profiles(username, display_name)")
    .eq("id", id)
    .single();

  if (!list) {
    return new Response("Not found", { status: 404 });
  }

  const { data: items } = await supabase
    .from("list_items")
    .select("position, target_title, target_artist, target_artwork_url")
    .eq("list_id", id)
    .order("position")
    .limit(8);

  const author = (list.profiles as any) || {};
  const itemRows = (items || []).map((it: any, i: number) => ({
    position: i + 1,
    title: safe(it.target_title),
    artist: safe(it.target_artist),
    cover: art(it.target_artwork_url, 200),
  }));

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
          <div style={{ fontSize: 16, color: "#52525b", letterSpacing: "0.16em", display: "flex" }}>— A LIST</div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 76,
            color: "#ffffff",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 0.92,
            display: "flex",
            marginBottom: 14,
            maxWidth: "100%",
          }}
        >
          {(() => {
            const t = safe(list.title);
            return t.length > 60 ? t.slice(0, 60) + "…" : t;
          })()}
        </div>

        {/* Subtitle */}
        {list.subtitle && (
          <div
            style={{
              fontSize: 22,
              color: "#a1a1aa",
              fontStyle: "italic",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: 36,
              maxWidth: "85%",
            }}
          >
            {safe(list.subtitle)}
          </div>
        )}

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: list.subtitle ? 0 : 36 }}>
          {itemRows.slice(0, 6).map((it) => (
            <div
              key={it.position}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                paddingBottom: 12,
                borderBottom: "1px solid #18181b",
              }}
            >
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  color: "#3f3f46",
                  letterSpacing: "-0.04em",
                  width: 60,
                  textAlign: "right",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                {String(it.position).padStart(2, "0")}
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
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
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#27272a", fontSize: 24 }}>♪</div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 22,
                    color: "#fafafa",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    display: "flex",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.title.length > 38 ? it.title.slice(0, 38) + "…" : it.title}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: "#71717a",
                    fontStyle: "italic",
                    marginTop: 2,
                    display: "flex",
                  }}
                >
                  {it.artist.length > 42 ? it.artist.slice(0, 42) + "…" : it.artist}
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
