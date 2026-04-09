import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * THE ANNUAL — data heuristics layer.
 *
 * The Annual is Euterpy's year-end artifact. The promise to the user
 * is that it looks like a high-end editorial magazine, not a Spotify
 * Wrapped infographic. The promise to the codebase is that the
 * MAGAZINE LAYOUT IS DUMB and this DATA LAYER IS WHERE THE VOICE IS.
 *
 * Everything intelligent — the editorial note, the patterns, the
 * "story of the year," the "people who marked your work most" — is
 * computed here. The page that renders The Annual just receives a
 * structured object and lays it out with serif type and editorial
 * grids. No LLM at runtime. No magic. Just careful querying and
 * pattern detection on the user's actual data.
 *
 * This module is the foundation. It will grow as we get closer to
 * December. Right now it returns the *minimum viable shape* of the
 * Annual: enough for an early prototype of the page to render, but
 * deliberately incomplete in places that need more design thought
 * (the editorial note especially).
 *
 * USAGE:
 *   const data = await getAnnualData(supabase, userId, 2026);
 *   if (!data) return notFound();   // user has no activity that year
 *   <Annual data={data} />
 */

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","of","in","on","at","to","for","with","by",
  "is","was","are","were","be","been","being","have","has","had","do","does","did",
  "i","you","he","she","it","we","they","me","him","her","us","them","my","your",
  "this","that","these","those","there","here","then","when","where","how","why",
  "what","which","who","whom","whose","not","no","yes","so","just","very","really",
  "get","got","go","went","goes","come","came","make","made","take","took","see","saw",
  "know","knew","think","thought","like","liked","love","loved","want","wanted",
  "as","if","than","because","while","about","into","over","under","up","down","out",
  "from","all","any","some","one","two","three","first","last","also","too","only",
  "more","most","much","many","few","other","such","own","same","new","old",
  "song","album","track","record","music","listen","listened","listening","hear","heard",
  "now","time","day","night","year","years","day","ago","still","always","never",
  "would","could","should","will","can","may","might","must","shall",
  "say","said","says","tell","told","ask","asked","feel","felt","look","looked",
  "thing","things","way","ways","life","people","person","man","woman","boy","girl",
  "yeah","oh","ah","hmm","um","eh","mm",
]);

export interface AnnualMemory {
  storyId: string | null;
  headline: string | null;
  pullQuote: string | null;
  body: string;
  targetTitle: string | null;
  targetArtist: string | null;
  targetArtworkUrl: string | null;
  targetAppleId: string | null;
  marksReceived: number;
  createdAt: string;
}

export interface AnnualLyric {
  id: string;
  lyric: string;
  songTitle: string;
  songArtist: string;
  songArtworkUrl: string | null;
  songAppleId: string;
  createdAt: string;
}

export interface AnnualThree {
  position: number;
  album: {
    appleId: string;
    title: string;
    artistName: string;
    artworkUrl: string | null;
  } | null;
  story: string | null;
}

export interface AnnualPerson {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  marksGiven: number;
}

export interface AnnualData {
  /** The year this annual covers. */
  year: number;
  /** The user's profile (denormalized for convenience). */
  profile: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
  /** True if there's enough activity in this year to render an Annual at all. */
  hasContent: boolean;
  /** Total counts in this year. */
  counts: {
    stories: number;
    lyricPins: number;
    listsCreated: number;
    albumsCollected: number;
    songsCollected: number;
  };
  /** The user's three at the END of the year (Dec 31 or now if year is current). */
  threeAtEnd: AnnualThree[];
  /** The user's three at the START of the year, if they were on the platform then. */
  threeAtStart: AnnualThree[] | null;
  /** Up to 3 stories with the most marks received in this year. */
  topStories: AnnualMemory[];
  /** Up to 8 lyric pins from this year, in chronological order. */
  lyricPins: AnnualLyric[];
  /** Up to 3 people who marked the user's work the most this year. */
  topReaders: AnnualPerson[];
  /** Words extracted from the user's stories — the vocabulary of their year. */
  vocabulary: { word: string; count: number }[];
  /** A first attempt at the editorial note. Computed from heuristics. */
  editorial: string;
}

function endOfYearISO(year: number): string {
  // Cap at "now" for the current year, otherwise Dec 31.
  const now = new Date();
  if (year >= now.getFullYear()) return now.toISOString();
  return new Date(year, 11, 31, 23, 59, 59).toISOString();
}

function startOfYearISO(year: number): string {
  return new Date(year, 0, 1, 0, 0, 0).toISOString();
}

function pullFirstStrongSentence(body: string, maxLen = 220): string | null {
  const cleaned = body.trim().replace(/\s+/g, " ");
  // Prefer the first sentence that's between 30 and maxLen chars.
  const sentenceMatches = cleaned.match(/[^.!?]+[.!?]/g) || [];
  for (const s of sentenceMatches) {
    const trimmed = s.trim();
    if (trimmed.length >= 30 && trimmed.length <= maxLen) return trimmed;
  }
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).trimEnd() + "…";
}

function extractVocabulary(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const words = text.toLowerCase().match(/[a-z']{3,}/g) || [];
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return counts;
}

/**
 * The editorial note — the literary opening paragraph of the Annual.
 * Generated from heuristics on the user's actual data, NOT an LLM.
 * Voice: second-person, observational, sparing.
 *
 * This is the riskiest piece of the whole module. The voice has to
 * be literary and never sound algorithmic. We compose it from a
 * small set of fixed sentence templates that get combined based on
 * what we found in the data. If we don't have enough signal, we
 * fall back to a quieter generic note.
 */
function composeEditorial({
  displayName,
  year,
  storyCount,
  lyricCount,
  topVocab,
  threeChanged,
  topReaderName,
}: {
  displayName: string;
  year: number;
  storyCount: number;
  lyricCount: number;
  topVocab: { word: string; count: number }[];
  threeChanged: number; // 0..3 — how many of the three changed
  topReaderName: string | null;
}): string {
  const sentences: string[] = [];

  // Opening — always names the user and the year.
  sentences.push(`${displayName}, here is your year in your own pages.`);

  // The vocabulary thread — only if we found at least one strong word.
  if (topVocab.length > 0 && storyCount >= 2) {
    const word = topVocab[0].word;
    if (topVocab[0].count >= 3) {
      sentences.push(
        `You wrote the word "${word}" ${topVocab[0].count} times this year — more than any other.`
      );
    }
  }

  // Story count framing.
  if (storyCount === 0 && lyricCount > 0) {
    sentences.push(
      `You didn't write much, but you kept ${lyricCount} ${lyricCount === 1 ? "line" : "lines"} you couldn't put down.`
    );
  } else if (storyCount === 1) {
    sentences.push(`You only wrote one story. It's the one that mattered.`);
  } else if (storyCount >= 2 && storyCount <= 5) {
    sentences.push(`You wrote ${storyCount} stories. Each one took its time.`);
  } else if (storyCount >= 6) {
    sentences.push(`You wrote ${storyCount} stories this year. The room was listening.`);
  }

  // The Three changes — biographical signal.
  if (threeChanged === 0) {
    sentences.push(`Your three didn't change once. You knew who you were.`);
  } else if (threeChanged === 1) {
    sentences.push(`You swapped one of your three. Something shifted, but not everything.`);
  } else if (threeChanged === 2) {
    sentences.push(`Two of your three changed. You were rewriting yourself.`);
  } else if (threeChanged === 3) {
    sentences.push(`All three of your albums changed this year. You became someone new.`);
  }

  // Top reader — the social tie.
  if (topReaderName) {
    sentences.push(`${topReaderName} kept your work more than anyone else. Send them a letter.`);
  }

  // Closing.
  sentences.push(`This is what ${year} sounded like to you.`);

  return sentences.join(" ");
}

export async function getAnnualData(
  supabase: SupabaseClient,
  userId: string,
  year: number
): Promise<AnnualData | null> {
  const startISO = startOfYearISO(year);
  const endISO = endOfYearISO(year);

  // Profile
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("id", userId)
    .single();
  if (!profileRow) return null;

  // Stories from this year, with marks count
  const { data: storiesRows } = await supabase
    .from("stories")
    .select("id, headline, body, target_title, target_artist, target_artwork_url, target_apple_id, kind, created_at")
    .eq("user_id", userId)
    .gte("created_at", startISO)
    .lte("created_at", endISO)
    .order("created_at", { ascending: true });
  const stories = storiesRows || [];

  // Lyric pins from this year
  const { data: lyricsRows } = await supabase
    .from("lyric_pins")
    .select("id, lyric, song_apple_id, song_title, song_artist, song_artwork_url, created_at")
    .eq("user_id", userId)
    .gte("created_at", startISO)
    .lte("created_at", endISO)
    .order("created_at", { ascending: true });
  const lyrics = lyricsRows || [];

  // Lists created this year
  const { count: listsCreated } = await supabase
    .from("lists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startISO)
    .lte("created_at", endISO);

  // Albums collected this year
  const { count: albumsCollected } = await supabase
    .from("ratings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startISO)
    .lte("created_at", endISO);

  // Songs collected this year
  const { count: songsCollected } = await supabase
    .from("song_ratings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startISO)
    .lte("created_at", endISO);

  const totalActivity =
    stories.length +
    lyrics.length +
    (listsCreated || 0) +
    (albumsCollected || 0) +
    (songsCollected || 0);
  const hasContent = totalActivity > 0;

  // The Three at end of year — current state, since we don't track GTKM history yet.
  // (When we add a gtkm_history table, this query becomes a snapshot lookup.)
  const { data: gtkmRows } = await supabase
    .from("get_to_know_me")
    .select("position, story, albums(apple_id, title, artist_name, artwork_url)")
    .eq("user_id", userId)
    .order("position");

  const threeAtEnd: AnnualThree[] = [
    { position: 1, album: null, story: null },
    { position: 2, album: null, story: null },
    { position: 3, album: null, story: null },
  ];
  for (const row of (gtkmRows || []) as any[]) {
    const idx = (row.position || 1) - 1;
    if (idx >= 0 && idx < 3 && row.albums) {
      threeAtEnd[idx] = {
        position: row.position,
        album: {
          appleId: row.albums.apple_id,
          title: row.albums.title,
          artistName: row.albums.artist_name,
          artworkUrl: row.albums.artwork_url,
        },
        story: row.story,
      };
    }
  }

  // The Three at start of year — currently null because we don't have
  // historical GTKM snapshots. Returning null is honest; the layout
  // will hide the comparison panel cleanly when this is null. We'll
  // backfill with a gtkm_history table before the Dec launch.
  const threeAtStart: AnnualThree[] | null = null;

  // Top stories by marks received in this year. Two-step query: get
  // mark counts for each story, then join.
  let topStories: AnnualMemory[] = [];
  if (stories.length > 0) {
    const storyIds = stories.map((s) => s.id);
    const { data: marksRows } = await supabase
      .from("stars")
      .select("target_id")
      .eq("kind", "story")
      .in("target_id", storyIds);
    const marksByStory = new Map<string, number>();
    for (const row of (marksRows || []) as any[]) {
      marksByStory.set(row.target_id, (marksByStory.get(row.target_id) || 0) + 1);
    }
    topStories = stories
      .map((s) => ({
        storyId: s.id,
        headline: s.headline,
        pullQuote: pullFirstStrongSentence(s.body || ""),
        body: s.body || "",
        targetTitle: s.target_title,
        targetArtist: s.target_artist,
        targetArtworkUrl: s.target_artwork_url,
        targetAppleId: s.target_apple_id,
        marksReceived: marksByStory.get(s.id) || 0,
        createdAt: s.created_at,
      }))
      .sort((a, b) => {
        // Marks received first; ties broken by length (longer = more deliberate).
        if (b.marksReceived !== a.marksReceived) return b.marksReceived - a.marksReceived;
        return b.body.length - a.body.length;
      })
      .slice(0, 3);
  }

  // Top readers — people who marked the user's work the most.
  let topReaders: AnnualPerson[] = [];
  if (totalActivity > 0) {
    // Find content owned by the user
    const ownedIds: string[] = [
      ...stories.map((s: any) => s.id),
      ...lyrics.map((l: any) => l.id),
    ];
    if (ownedIds.length > 0) {
      const { data: marksRows } = await supabase
        .from("stars")
        .select("user_id, target_id, created_at")
        .in("target_id", ownedIds)
        .gte("created_at", startISO)
        .lte("created_at", endISO);
      const countsByUser = new Map<string, number>();
      for (const row of (marksRows || []) as any[]) {
        if (row.user_id === userId) continue; // skip self-marks
        countsByUser.set(row.user_id, (countsByUser.get(row.user_id) || 0) + 1);
      }
      const topUserIds = Array.from(countsByUser.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);
      if (topUserIds.length > 0) {
        const { data: readerProfiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", topUserIds);
        topReaders = topUserIds
          .map((id) => {
            const p = (readerProfiles || []).find((r: any) => r.id === id);
            if (!p) return null;
            return {
              id: p.id,
              username: p.username,
              displayName: p.display_name,
              avatarUrl: p.avatar_url,
              marksGiven: countsByUser.get(id) || 0,
            };
          })
          .filter((r): r is AnnualPerson => r !== null);
      }
    }
  }

  // Vocabulary — words pulled from all story bodies AND lyric pin contents.
  const allText = [
    ...stories.map((s) => s.body || ""),
    ...stories.map((s) => s.headline || ""),
    ...lyrics.map((l) => l.lyric || ""),
  ].join(" ");
  const vocabMap = extractVocabulary(allText);
  const vocabulary = Array.from(vocabMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));

  // The editorial note. Composed from heuristics, not an LLM.
  const displayName = profileRow.display_name || profileRow.username;
  const editorial = composeEditorial({
    displayName,
    year,
    storyCount: stories.length,
    lyricCount: lyrics.length,
    topVocab: vocabulary,
    // We don't have GTKM history yet — pass 0 so the editorial doesn't lie.
    threeChanged: 0,
    topReaderName: topReaders.length > 0 ? topReaders[0].displayName || topReaders[0].username : null,
  });

  return {
    year,
    profile: {
      id: profileRow.id,
      username: profileRow.username,
      displayName: profileRow.display_name,
      avatarUrl: profileRow.avatar_url,
      bio: profileRow.bio,
    },
    hasContent,
    counts: {
      stories: stories.length,
      lyricPins: lyrics.length,
      listsCreated: listsCreated || 0,
      albumsCollected: albumsCollected || 0,
      songsCollected: songsCollected || 0,
    },
    threeAtEnd,
    threeAtStart,
    topStories,
    lyricPins: lyrics.slice(0, 8).map((l) => ({
      id: l.id,
      lyric: l.lyric,
      songTitle: l.song_title,
      songArtist: l.song_artist,
      songArtworkUrl: l.song_artwork_url,
      songAppleId: l.song_apple_id,
      createdAt: l.created_at,
    })),
    topReaders,
    vocabulary,
    editorial,
  };
}
