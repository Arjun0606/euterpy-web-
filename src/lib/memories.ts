import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * On-this-day memories — a return mechanic that doesn't coerce.
 *
 * The premise: the act of curating is the habit, and curation creates a
 * personal archive worth visiting. Every morning the home page can ask
 * "remember this?" — surfacing one item from the user's own past,
 * usually one that feels like a small time capsule.
 *
 * We deliberately do NOT use streaks, daily prompts, or anything that
 * coerces. The user can ignore the memory and nothing bad happens. It's
 * just a quiet thing waiting on their home page when they happen to
 * visit, like a printed photograph found in a drawer.
 *
 * Lookback windows, in priority order:
 *   - exactly 1 year ago (the strongest emotional beat)
 *   - 2, 3, 4, 5+ years ago (each year of platform history is fair game)
 *   - 6 months ago (half-year mark)
 *   - 1 month ago (recent enough to remember exactly where you were)
 *
 * For each window we check three sources, in order:
 *   1. Stories (the richest memory — has a headline + body)
 *   2. Lyric pins (the most evocative — a quoted line)
 *   3. Album collection adds (the simplest — "you collected this")
 *
 * The first hit wins. Returns null if the user has no history at all
 * for any of those windows — fresh accounts see nothing, no fake content.
 */

export interface Memory {
  kind: "story" | "lyric" | "album";
  /** How long ago in human terms — "a year ago today", "6 months ago", etc. */
  agoLabel: string;
  /** ISO timestamp of the original event */
  createdAt: string;
  /** Where the memory routes to when clicked */
  href: string;
  /** Title of the song/album/story */
  title: string;
  /** Artist or author attribution */
  subtitle: string | null;
  /** Cover/artwork URL template (Apple Music format) */
  artworkUrl: string | null;
  /** For stories: a one-line preview pulled from the body */
  preview: string | null;
}

/**
 * Get a list of (target date, label) pairs to query, in priority order.
 * The window is +/- 1 day so we don't miss memories logged just before or
 * after midnight.
 */
function getLookbackWindows(): { start: Date; end: Date; label: string }[] {
  const now = new Date();
  const windows: { start: Date; end: Date; label: string }[] = [];

  // Years ago (1, 2, 3, 4, 5)
  for (let years = 1; years <= 5; years++) {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - years);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    windows.push({
      start,
      end,
      label: years === 1 ? "A year ago today" : `${years} years ago today`,
    });
  }

  // 6 months ago
  {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 6);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    windows.push({ start, end, label: "Six months ago today" });
  }

  // 1 month ago
  {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    windows.push({ start, end, label: "A month ago today" });
  }

  return windows;
}

function firstSentence(text: string, maxLen = 140): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  const sentenceMatch = cleaned.match(/^[^.!?]{10,}[.!?]/);
  if (sentenceMatch && sentenceMatch[0].length <= maxLen) return sentenceMatch[0];
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).trimEnd() + "…";
}

export async function getOnThisDayMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<Memory | null> {
  const windows = getLookbackWindows();

  for (const w of windows) {
    const startISO = w.start.toISOString();
    const endISO = w.end.toISOString();

    // 1. Stories first — the richest memory.
    {
      const { data: stories } = await supabase
        .from("stories")
        .select("id, headline, body, target_apple_id, target_title, target_artist, target_artwork_url, kind, created_at")
        .eq("user_id", userId)
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .order("created_at", { ascending: false })
        .limit(1);
      if (stories && stories.length > 0) {
        const s = stories[0];
        return {
          kind: "story",
          agoLabel: w.label,
          createdAt: s.created_at,
          href: `/story/${s.id}`,
          title: s.headline || `On ${s.target_title}`,
          subtitle: s.target_artist || s.target_title,
          artworkUrl: s.target_artwork_url,
          preview: s.body ? firstSentence(s.body) : null,
        };
      }
    }

    // 2. Lyric pins — the most evocative.
    {
      const { data: pins } = await supabase
        .from("lyric_pins")
        .select("id, lyric, song_apple_id, song_title, song_artist, song_artwork_url, created_at")
        .eq("user_id", userId)
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .order("created_at", { ascending: false })
        .limit(1);
      if (pins && pins.length > 0) {
        const p = pins[0];
        return {
          kind: "lyric",
          agoLabel: w.label,
          createdAt: p.created_at,
          href: `/song/${p.song_apple_id}`,
          title: p.song_title,
          subtitle: p.song_artist,
          artworkUrl: p.song_artwork_url,
          preview: p.lyric,
        };
      }
    }

    // 3. Album collection adds — the simplest.
    {
      const { data: ratings } = await supabase
        .from("ratings")
        .select("id, created_at, albums(apple_id, title, artist_name, artwork_url)")
        .eq("user_id", userId)
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .order("created_at", { ascending: false })
        .limit(1);
      if (ratings && ratings.length > 0) {
        const r = ratings[0] as any;
        const album = r.albums;
        if (album) {
          return {
            kind: "album",
            agoLabel: w.label,
            createdAt: r.created_at,
            href: `/album/${album.apple_id}`,
            title: album.title,
            subtitle: album.artist_name,
            artworkUrl: album.artwork_url,
            preview: null,
          };
        }
      }
    }
  }

  return null;
}
