import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import StoryEditButton from "./StoryEditButton";
import StoryShareCard from "./StoryShareCard";
import StarButton from "@/components/social/StarButton";
import StoryCommentsThread from "@/components/social/StoryCommentsThread";
import VerifiedMark from "@/components/ui/VerifiedMark";
import StoryBody from "@/components/story/StoryBody";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function art(url: string | null, size = 800): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: story } = await supabase
    .from("stories")
    .select("headline, body, target_title, target_artist, profiles(username, display_name)")
    .eq("id", id)
    .single();

  if (!story) return { title: "Story Not Found" };

  const author = (story.profiles as any)?.display_name || (story.profiles as any)?.username || "Someone";
  const title = story.headline || `${author} on ${story.target_title}`;
  const description = story.body.slice(0, 200) + (story.body.length > 200 ? "…" : "");

  return {
    title: `${title} — Euterpy`,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function StoryPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select("*, profiles(id, username, display_name, avatar_url, bio, is_verified, verified_label)")
    .eq("id", id)
    .single();

  if (!story) notFound();

  const author = (story.profiles as any) || {};
  const cover = art(story.target_artwork_url);

  // Star count + my star state
  const { count: starCount } = await supabase
    .from("stars")
    .select("id", { count: "exact", head: true })
    .eq("kind", "story")
    .eq("target_id", id);

  const { data: { user: maybeUser } } = await supabase.auth.getUser();
  let myStar = false;
  if (maybeUser) {
    const { data: starRow } = await supabase
      .from("stars")
      .select("id")
      .eq("user_id", maybeUser.id)
      .eq("kind", "story")
      .eq("target_id", id)
      .maybeSingle();
    myStar = !!starRow;
  }

  // Comments
  const { data: comments } = await supabase
    .from("story_comments")
    .select("id, body, created_at, user_id, profiles(username, display_name, avatar_url, is_verified, verified_label)")
    .eq("story_id", id)
    .order("created_at", { ascending: true });
  const isAlbum = story.kind === "album";
  const isSong = story.kind === "song";
  const isArtist = story.kind === "artist";

  const targetHref = isAlbum
    ? `/album/${story.target_apple_id}`
    : isSong
      ? `/song/${story.target_apple_id}`
      : `/artist/${story.target_apple_id}`;

  // Other stories about the same target
  const { data: relatedStories } = await supabase
    .from("stories")
    .select("id, headline, body, target_title, profiles(username, display_name, avatar_url)")
    .eq("kind", story.kind)
    .eq("target_apple_id", story.target_apple_id)
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(4);

  // More from this writer
  const { data: moreFromWriter } = await supabase
    .from("stories")
    .select("id, headline, body, target_title, target_artist, target_artwork_url, kind, target_apple_id")
    .eq("user_id", author.id)
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(4);

  const user = maybeUser;
  const isOwnStory = user?.id === author.id;

  const date = new Date(story.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — full bleed cover backdrop */}
      <section className="relative">
        {cover && (
          <div className="absolute inset-0 h-[60vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="w-full h-full object-cover opacity-25 blur-3xl scale-125" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
          </div>
        )}
        <div className="relative max-w-2xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10">
          {/* Subject pill */}
          <Link
            href={targetHref}
            className="inline-flex items-center gap-3 mb-10 group"
          >
            {cover && (
              <div className={`${isArtist ? "rounded-full" : "rounded-md"} w-12 h-12 overflow-hidden border border-white/[0.06] shrink-0`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt={story.target_title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-accent">A story about a {story.kind}</p>
              <p className="font-display text-xl tracking-tight truncate group-hover:text-accent transition-colors">
                {story.target_title}
                {story.target_artist && !isArtist && <span className="text-zinc-500 italic"> · {story.target_artist}</span>}
              </p>
            </div>
          </Link>

          {/* Headline */}
          {story.headline && (
            <h1 className="font-display text-4xl sm:text-6xl tracking-tighter leading-[0.95] mb-8">
              {story.headline}
            </h1>
          )}

          {/* Author + date */}
          <div className="flex items-center gap-3 mb-10 pb-10 border-b border-white/[0.06]">
            <Link href={`/${author.username}`} className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-base text-zinc-500 overflow-hidden hover:border-accent/40 transition-colors">
              {author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                author.username?.[0]?.toUpperCase() || "?"
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/${author.username}`} className="text-sm font-medium hover:text-accent transition-colors inline-flex items-center gap-1">
                {author.display_name || author.username}
                {author.is_verified && <VerifiedMark label={author.verified_label} size="sm" />}
              </Link>
              <p className="text-[11px] text-zinc-600">@{author.username} · {date}</p>
            </div>
            <StarButton kind="story" targetId={story.id} initialCount={starCount || 0} initialStarred={myStar} />
            {isOwnStory && (
              <StoryEditButton
                story={{
                  id: story.id,
                  headline: story.headline,
                  body: story.body,
                  kind: story.kind,
                  target_apple_id: story.target_apple_id,
                  target_title: story.target_title,
                  target_artist: story.target_artist,
                  target_artwork_url: story.target_artwork_url,
                }}
              />
            )}
          </div>

          {/* Body */}
          <article className="editorial text-lg sm:text-xl text-zinc-200 leading-[1.75] whitespace-pre-wrap">
            <StoryBody body={story.body} />
          </article>

          {/* Comments */}
          <StoryCommentsThread
            storyId={story.id}
            initial={JSON.parse(JSON.stringify(comments || []))}
            currentUserId={user?.id || null}
            storyOwnerId={author.id}
          />

          {/* Share */}
          <StoryShareCard storyId={story.id} username={author.username} />
        </div>
      </section>

      {/* Other stories about this thing */}
      {relatedStories && relatedStories.length > 0 && (
        <section className="max-w-2xl mx-auto px-5 sm:px-8 py-16 border-t border-white/[0.04] mt-16">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">— Other voices on this {story.kind}</p>
          <div className="space-y-5">
            {relatedStories.map((s: any) => {
              const a = s.profiles;
              const preview = s.body.length > 180 ? s.body.slice(0, 180).trimEnd() + "…" : s.body;
              return (
                <Link key={s.id} href={`/story/${s.id}`} className="block group">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-xs text-zinc-500 overflow-hidden shrink-0">
                      {a?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        a?.username?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 group-hover:text-white transition-colors mb-1">
                        <span className="font-medium">{a?.display_name || a?.username}</span>
                      </p>
                      {s.headline && (
                        <p className="font-display text-xl tracking-tight mb-1 group-hover:text-accent transition-colors">{s.headline}</p>
                      )}
                      <p className="editorial text-sm text-zinc-500 leading-relaxed line-clamp-2">{preview}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* More from this writer */}
      {moreFromWriter && moreFromWriter.length > 0 && (
        <section className="max-w-2xl mx-auto px-5 sm:px-8 py-16 border-t border-white/[0.04]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">— More from {author.display_name || author.username}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {moreFromWriter.map((s: any) => {
              const c = art(s.target_artwork_url, 200);
              return (
                <Link key={s.id} href={`/story/${s.id}`} className="block group bg-card border border-border rounded-2xl p-5 hover:border-accent/30 transition-colors">
                  {c && (
                    <div className="w-12 h-12 rounded-md overflow-hidden mb-3 border border-white/[0.06]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {s.headline ? (
                    <p className="font-display text-lg tracking-tight mb-1 group-hover:text-accent transition-colors line-clamp-2">{s.headline}</p>
                  ) : (
                    <p className="font-display text-lg tracking-tight mb-1 group-hover:text-accent transition-colors line-clamp-2">on {s.target_title}</p>
                  )}
                  <p className="text-[11px] text-zinc-600">{s.target_title}{s.target_artist ? ` · ${s.target_artist}` : ""}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
