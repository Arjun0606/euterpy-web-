import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getArtworkUrl } from "@/lib/apple-music/client";
import ListShareCard from "./ListShareCard";
import ListEditButton from "./ListEditButton";
import MarkButton from "@/components/social/MarkButton";
import EchoButton from "@/components/social/EchoButton";
import ListShelf from "@/components/list/ListShelf";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function art(url: string | null, size = 600): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("lists")
    .select("title, subtitle, profiles(username, display_name)")
    .eq("id", id)
    .single();

  if (!list) return { title: "List Not Found" };
  const author = (list.profiles as any)?.display_name || (list.profiles as any)?.username || "Someone";
  const description = list.subtitle || `A music list by ${author} on Euterpy.`;

  return {
    title: `${list.title} — by ${author}`,
    description,
    openGraph: {
      title: `${list.title}`,
      description,
      images: [{ url: `/api/og/list/${id}`, width: 1080, height: 1350 }],
    },
    twitter: {
      card: "summary_large_image",
      title: list.title,
      description,
      images: [`/api/og/list/${id}`],
    },
    alternates: {
      types: {
        "application/json+oembed": `/api/oembed?url=${encodeURIComponent(`https://euterpy.com/list/${id}`)}`,
      },
    },
  };
}

export default async function ListPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("lists")
    .select("*, profiles(id, username, display_name, avatar_url, bio, shelf_style), items:list_items(*)")
    .eq("id", id)
    .single();

  if (!list) notFound();

  const author = (list.profiles as any) || {};
  const items = ((list.items as any[]) || []).sort((a, b) => a.position - b.position);

  const { data: { user } } = await supabase.auth.getUser();
  const isOwn = user?.id === author.id;

  // Mark + echo counts
  const [{ count: markCount }, { count: echoCount }] = await Promise.all([
    supabase.from("stars").select("id", { count: "exact", head: true }).eq("kind", "list").eq("target_id", id),
    supabase.from("reposts").select("id", { count: "exact", head: true }).eq("kind", "list").eq("target_id", id),
  ]);
  let myMark = false;
  if (user) {
    const { data: markRow } = await supabase
      .from("stars")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", "list")
      .eq("target_id", id)
      .maybeSingle();
    myMark = !!markRow;
  }

  // First 4 covers for backdrop
  const backdropCover = items[0]?.target_artwork_url ? art(items[0].target_artwork_url, 800) : null;

  const date = new Date(list.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {backdropCover && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backdropCover} alt="" className="w-full h-full object-cover opacity-25 blur-3xl scale-125" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
          </div>
        )}
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-6">— A list</p>

          <h1 className="font-display text-5xl sm:text-7xl tracking-tighter leading-[0.9] mb-5">
            {list.title}
          </h1>

          {list.subtitle && (
            <p className="editorial italic text-xl sm:text-2xl text-zinc-400 leading-relaxed mb-8 max-w-xl">
              {list.subtitle}
            </p>
          )}

          {/* Author + meta */}
          <div className="flex items-center gap-3 mb-12 pb-10 border-b border-white/[0.06]">
            <Link href={`/${author.username}`} className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-base text-zinc-500 overflow-hidden hover:border-accent/40 transition-colors">
              {author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                author.username?.[0]?.toUpperCase() || "?"
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/${author.username}`} className="text-sm font-medium hover:text-accent transition-colors">
                {author.display_name || author.username}
              </Link>
              <p className="text-[11px] text-zinc-600">@{author.username} · {date} · {items.length} {items.length === 1 ? "item" : "items"}</p>
            </div>
            <MarkButton kind="list" targetId={id} ownerId={author.id} initialCount={markCount || 0} initialMarked={myMark} size="sm" />
            <EchoButton kind="list" targetId={id} ownerId={author.id} initialCount={echoCount || 0} size="sm" />
            {isOwn && (
              <ListEditButton
                list={{
                  id: list.id,
                  title: list.title,
                  subtitle: list.subtitle,
                  items: items.map((it: any) => ({
                    kind: it.kind,
                    target_apple_id: it.target_apple_id,
                    target_title: it.target_title,
                    target_artist: it.target_artist,
                    target_artwork_url: it.target_artwork_url,
                    caption: it.caption,
                  })),
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Items — wrapped in the author's chosen shelf chrome
          (wood / marble / glass / minimal) so a list reads like
          another shelf in their record store. */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-16">
        <ListShelf items={items} shelfStyle={author.shelf_style} />

        {/* Share */}
        <div className="mt-16">
          <ListShareCard listId={id} title={list.title} username={author.username} />
        </div>
      </section>
    </div>
  );
}
