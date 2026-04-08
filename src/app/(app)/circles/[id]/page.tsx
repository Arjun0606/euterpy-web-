import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CircleDetailClient from "./CircleDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CircleDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: circle } = await supabase
    .from("circles")
    .select("*")
    .eq("id", id)
    .single();

  if (!circle) notFound();

  const isOwner = circle.owner_id === user.id;

  // Members
  const { data: memberRows } = await supabase
    .from("circle_members")
    .select("user_id, joined_at, profiles(id, username, display_name, avatar_url, is_verified, verified_label)")
    .eq("circle_id", id)
    .order("joined_at", { ascending: true });

  const members = (memberRows || []).map((r: any) => ({
    ...r.profiles,
    joined_at: r.joined_at,
  }));

  // Member feed: stories, lists, charts, lyrics from circle members
  const memberIds = members.map((m: any) => m.id);
  let storiesFromMembers: any[] = [];
  let listsFromMembers: any[] = [];
  let chartsFromMembers: any[] = [];
  let lyricsFromMembers: any[] = [];
  if (memberIds.length > 0) {
    const [s, l, c, ly] = await Promise.all([
      supabase
        .from("stories")
        .select("id, created_at, kind, target_apple_id, target_title, target_artist, target_artwork_url, headline, body, profiles(username, display_name, avatar_url, is_verified, verified_label)")
        .in("user_id", memberIds)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("lists")
        .select("id, created_at, title, subtitle, profiles(username, display_name, avatar_url), items:list_items(target_artwork_url, position)")
        .in("user_id", memberIds)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("charts")
        .select("id, created_at, period_label, profiles(username, display_name, avatar_url), items:chart_items(position, target_title)")
        .in("user_id", memberIds)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("lyric_pins")
        .select("id, created_at, lyric, song_apple_id, song_title, song_artist, song_artwork_url, profiles(username, display_name, avatar_url)")
        .in("user_id", memberIds)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    storiesFromMembers = s.data || [];
    listsFromMembers = l.data || [];
    chartsFromMembers = c.data || [];
    lyricsFromMembers = ly.data || [];
  }

  const feed: Array<{ type: string; data: any; date: string }> = [
    ...storiesFromMembers.map((s) => ({ type: "story", data: s, date: s.created_at })),
    ...listsFromMembers.map((l) => ({ type: "list", data: l, date: l.created_at })),
    ...chartsFromMembers.map((c) => ({ type: "chart", data: c, date: c.created_at })),
    ...lyricsFromMembers.map((ly) => ({ type: "lyric", data: ly, date: ly.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <Link href="/circles" className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-accent transition-colors">
        ← Your circles
      </Link>

      <div className="mt-5 mb-10">
        <div className="text-5xl mb-4">{circle.cover_emoji || "🎧"}</div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">{circle.name}</h1>
        {circle.description && (
          <p className="editorial italic text-base text-zinc-400 mt-3 max-w-xl">{circle.description}</p>
        )}
        <p className="text-[11px] text-zinc-700 mt-3">
          {members.length} {members.length === 1 ? "member" : "members"}
        </p>
      </div>

      <CircleDetailClient
        circleId={id}
        isOwner={isOwner}
        members={JSON.parse(JSON.stringify(members))}
        feed={JSON.parse(JSON.stringify(feed))}
      />
    </main>
  );
}
