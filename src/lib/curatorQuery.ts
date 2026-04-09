import type { SupabaseClient } from "@supabase/supabase-js";
import { isCurator, curatorLabel, type CuratorInputs } from "./curator";

/**
 * Server-side curator discovery — finds users who pass the curator
 * thresholds and returns them with everything the UI needs to render
 * a magazine-grade portrait.
 *
 * Performance note: this does ~5 queries to assemble its results,
 * which is fine at small scale. When the platform grows past a few
 * thousand users we should denormalize an `is_curator` boolean +
 * portfolio counts onto profiles, refreshed by a trigger. For now
 * we cap the candidate pool at ~80 recently-active users and only
 * keep the ones who pass.
 */

export interface CuratorRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  label: string;
  storyCount: number;
  lyricCount: number;
  listCount: number;
  marksReceived: number;
  /** Apple Music artwork URL templates for the user's three GTKM albums, in position order. */
  threeCovers: (string | null)[];
}

export async function findCurators(
  supabase: SupabaseClient,
  options: { limit?: number; excludeIds?: string[] } = {}
): Promise<CuratorRow[]> {
  const { limit = 12, excludeIds = [] } = options;

  // Step 1: take a recent-activity slice of profiles. We'll filter
  // them down to just curators after gathering counts. Capping at 80
  // candidates keeps the multi-query cost bounded.
  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .order("updated_at", { ascending: false })
    .limit(80);
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.map((id) => `"${id}"`).join(",")})`);
  }
  const { data: candidates } = await query;
  if (!candidates || candidates.length === 0) return [];

  const candidateIds = candidates.map((c: any) => c.id);

  // Step 2: in parallel, fetch the counts that go into isCurator().
  // Single round-trip per source via group queries.
  const [storiesRes, lyricsRes, listsRes] = await Promise.all([
    supabase.from("stories").select("user_id").in("user_id", candidateIds),
    supabase.from("lyric_pins").select("user_id").in("user_id", candidateIds),
    supabase.from("lists").select("user_id").in("user_id", candidateIds),
  ]);

  function tally(rows: any[] | null): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows || []) {
      m.set(r.user_id, (m.get(r.user_id) || 0) + 1);
    }
    return m;
  }
  const storyCounts = tally(storiesRes.data as any[]);
  const lyricCounts = tally(lyricsRes.data as any[]);
  const listCounts = tally(listsRes.data as any[]);

  // Marks received: count rows in stars where target_id matches any
  // story / lyric / list id owned by a candidate. Two-step: first
  // collect owned-content ids per user, then count marks per id.
  const ownedContentByUser = new Map<string, string[]>();

  // Re-fetch with id this time so we can map content → owner.
  const [stories2Res, lyrics2Res, lists2Res] = await Promise.all([
    supabase.from("stories").select("id, user_id").in("user_id", candidateIds),
    supabase.from("lyric_pins").select("id, user_id").in("user_id", candidateIds),
    supabase.from("lists").select("id, user_id").in("user_id", candidateIds),
  ]);

  function indexById(rows: any[] | null): Map<string, string> {
    const m = new Map<string, string>();
    for (const r of rows || []) m.set(r.id, r.user_id);
    return m;
  }
  const storyOwners = indexById(stories2Res.data as any[]);
  const lyricOwners = indexById(lyrics2Res.data as any[]);
  const listOwners = indexById(lists2Res.data as any[]);

  for (const [id, uid] of storyOwners) {
    if (!ownedContentByUser.has(uid)) ownedContentByUser.set(uid, []);
    ownedContentByUser.get(uid)!.push(id);
  }
  for (const [id, uid] of lyricOwners) {
    if (!ownedContentByUser.has(uid)) ownedContentByUser.set(uid, []);
    ownedContentByUser.get(uid)!.push(id);
  }
  for (const [id, uid] of listOwners) {
    if (!ownedContentByUser.has(uid)) ownedContentByUser.set(uid, []);
    ownedContentByUser.get(uid)!.push(id);
  }

  // Now count marks against any owned id.
  const allOwnedIds = Array.from(
    new Set([
      ...storyOwners.keys(),
      ...lyricOwners.keys(),
      ...listOwners.keys(),
    ])
  );

  const marksByUser = new Map<string, number>();
  if (allOwnedIds.length > 0) {
    const { data: marksRows } = await supabase
      .from("stars")
      .select("target_id")
      .in("target_id", allOwnedIds);
    // Reverse-lookup: for each star, find the owner of target_id.
    for (const row of (marksRows || []) as any[]) {
      const owner =
        storyOwners.get(row.target_id) ||
        lyricOwners.get(row.target_id) ||
        listOwners.get(row.target_id);
      if (owner) marksByUser.set(owner, (marksByUser.get(owner) || 0) + 1);
    }
  }

  // Step 3: filter to just users who pass isCurator().
  const curators: (typeof candidates[number] & { inputs: CuratorInputs })[] = [];
  for (const c of candidates) {
    const inputs: CuratorInputs = {
      storyCount: storyCounts.get(c.id) || 0,
      lyricCount: lyricCounts.get(c.id) || 0,
      listCount: listCounts.get(c.id) || 0,
      marksReceived: marksByUser.get(c.id) || 0,
    };
    if (isCurator(inputs)) {
      curators.push({ ...c, inputs });
    }
  }

  // Sort: marks received first (room signal), then story count.
  curators.sort((a, b) => {
    if (b.inputs.marksReceived !== a.inputs.marksReceived) {
      return b.inputs.marksReceived - a.inputs.marksReceived;
    }
    return b.inputs.storyCount - a.inputs.storyCount;
  });

  const top = curators.slice(0, limit);

  // Step 4: fetch GTKM covers for the surviving curators in one query.
  const topIds = top.map((c) => c.id);
  const coversByUser = new Map<string, (string | null)[]>();
  if (topIds.length > 0) {
    const { data: gtkmRows } = await supabase
      .from("get_to_know_me")
      .select("user_id, position, albums(artwork_url)")
      .in("user_id", topIds)
      .order("position");
    for (const row of (gtkmRows || []) as any[]) {
      const url = row.albums?.artwork_url || null;
      if (!coversByUser.has(row.user_id)) coversByUser.set(row.user_id, []);
      coversByUser.get(row.user_id)!.push(url);
    }
  }

  return top.map((c) => ({
    id: c.id,
    username: c.username,
    display_name: c.display_name,
    avatar_url: c.avatar_url,
    bio: c.bio,
    label: curatorLabel(c.inputs),
    storyCount: c.inputs.storyCount,
    lyricCount: c.inputs.lyricCount,
    listCount: c.inputs.listCount,
    marksReceived: c.inputs.marksReceived,
    threeCovers: coversByUser.get(c.id) || [],
  }));
}
