import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * OEmbed endpoint — when someone pastes a euterpy.app URL on Twitter,
 * Notion, Bluesky, Discord, etc, the platform requests this endpoint
 * to get a rich card preview.
 *
 * Spec: https://oembed.com/
 *
 * Supported URL patterns:
 *   /story/[id]
 *   /list/[id]
 *   /[username]
 */

const ROOT = "https://euterpy.app";

interface OembedResponse {
  version: "1.0";
  type: "link" | "rich" | "photo" | "video";
  provider_name: string;
  provider_url: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  width?: number;
  height?: number;
}

function art(template: string | null | undefined, size: number): string | null {
  if (!template) return null;
  return template.replace("{w}", String(size)).replace("{h}", String(size));
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const format = request.nextUrl.searchParams.get("format") || "json";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }
  if (format !== "json") {
    return NextResponse.json({ error: "Only json format supported" }, { status: 501 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  // Only handle our own URLs
  if (!parsed.hostname.endsWith("euterpy.app") && parsed.hostname !== "localhost") {
    return NextResponse.json({ error: "Unsupported url" }, { status: 404 });
  }

  const supabase = createServiceClient();
  const segments = parsed.pathname.split("/").filter(Boolean);

  // /story/[id]
  if (segments[0] === "story" && segments[1]) {
    const { data: story } = await supabase
      .from("stories")
      .select("id, headline, body, target_title, target_artist, target_artwork_url, profiles(username, display_name)")
      .eq("id", segments[1])
      .single();
    if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const author = (story.profiles as any) || {};
    const title = story.headline || `${author.display_name || author.username} on ${story.target_title}`;
    const body: OembedResponse = {
      version: "1.0",
      type: "link",
      provider_name: "Euterpy",
      provider_url: ROOT,
      title,
      author_name: author.display_name || author.username,
      author_url: `${ROOT}/${author.username}`,
      thumbnail_url: `${ROOT}/api/og/story/${story.id}`,
      thumbnail_width: 1080,
      thumbnail_height: 1350,
    };
    return NextResponse.json(body);
  }

  // /list/[id]
  if (segments[0] === "list" && segments[1]) {
    const { data: list } = await supabase
      .from("lists")
      .select("id, title, subtitle, profiles(username, display_name)")
      .eq("id", segments[1])
      .single();
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const author = (list.profiles as any) || {};
    const body: OembedResponse = {
      version: "1.0",
      type: "link",
      provider_name: "Euterpy",
      provider_url: ROOT,
      title: list.title,
      author_name: author.display_name || author.username,
      author_url: `${ROOT}/${author.username}`,
      thumbnail_url: `${ROOT}/api/og/list/${list.id}`,
      thumbnail_width: 1080,
      thumbnail_height: 1350,
    };
    return NextResponse.json(body);
  }

  // /[username] — single segment, not a reserved word
  const reserved = new Set([
    "story", "list", "album", "song", "artist", "playlist",
    "feed", "search", "settings", "login", "signup", "discover",
    "notifications", "welcome", "shelf", "gtkm", "recap", "api",
  ]);
  if (segments.length === 1 && !reserved.has(segments[0])) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, bio")
      .eq("username", segments[0])
      .single();
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body: OembedResponse = {
      version: "1.0",
      type: "link",
      provider_name: "Euterpy",
      provider_url: ROOT,
      title: `${profile.display_name || profile.username} — a music identity`,
      author_name: profile.display_name || profile.username,
      author_url: `${ROOT}/${profile.username}`,
      thumbnail_url: `${ROOT}/api/og/profile/${profile.username}`,
      thumbnail_width: 1200,
      thumbnail_height: 630,
    };
    return NextResponse.json(body);
  }

  return NextResponse.json({ error: "URL not handled" }, { status: 404 });
}
