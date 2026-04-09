import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { findCurators } from "@/lib/curatorQuery";
import CuratorCard from "@/components/profile/CuratorCard";

export const metadata: Metadata = {
  title: "Curators — Euterpy",
  description: "The people who've made something here. Stories, lyrics, lists — voices the room follows.",
};

export const dynamic = "force-dynamic";

/**
 * /curators — the dedicated browse-all page for the room.
 *
 * The constitution: this is not a leaderboard. It's a contact sheet
 * of people who have actually made things on Euterpy. Curator status
 * is meritocratic and computed at query time from real portfolio
 * counts (see /lib/curator.ts and /lib/curatorQuery.ts). The people
 * here are sorted by marks-received first (the room signal), then by
 * story count.
 *
 * Each curator is rendered with the default (wide) variant of
 * CuratorCard, which shows their three GTKM covers as the main
 * visual content. The page reads like a magazine masthead: every
 * person here has actually written, pinned, listed, or curated
 * something that other people on the platform thought was worth
 * keeping.
 */
export default async function CuratorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const curators = await findCurators(supabase, {
    limit: 60,
    excludeIds: user ? [user.id] : [],
  });

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      {/* Header */}
      <header className="mb-12 sm:mb-16">
        <Link
          href="/discover"
          className="text-[11px] uppercase tracking-[0.18em] text-zinc-600 hover:text-accent transition-colors"
        >
          ← Discover
        </Link>
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mt-4 mb-3">
          — The room
        </p>
        <h1 className="font-display text-5xl sm:text-7xl tracking-tighter leading-[0.92] mb-5">
          People who&apos;ve made <span className="italic text-accent">something here.</span>
        </h1>
        <p className="editorial italic text-lg sm:text-xl text-zinc-400 leading-[1.6] max-w-2xl">
          Not a leaderboard. Not a follower count. The people on this
          page have actually written stories, pinned lines, built lists,
          or had their work kept by others. Every name here earned the
          spot the same way.
        </p>
      </header>

      {curators.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-2xl">
          <p className="font-display text-3xl mb-3">The room is still filling.</p>
          <p className="text-sm text-zinc-500 max-w-md mx-auto italic editorial">
            No one has crossed the curator threshold yet. Be the first to write
            ten stories, build five lists, or pin fifteen lyrics — and your
            name will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:gap-6">
          {curators.map((c) => (
            <CuratorCard key={c.id} curator={c} variant="default" />
          ))}
        </div>
      )}

      {/* Footer explainer — what makes a curator? */}
      <section className="mt-20 pt-14 border-t border-border">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600 font-semibold mb-5">
          — How this page works
        </p>
        <div className="grid gap-8 sm:grid-cols-2 max-w-4xl">
          <div>
            <p className="font-display text-2xl tracking-tight mb-3">No verification.</p>
            <p className="text-sm text-zinc-500 leading-relaxed editorial italic">
              Nobody applies for this. Nobody pays. Nobody is approved by
              Euterpy. The label is computed from your actual work, in real
              time, every time someone visits this page.
            </p>
          </div>
          <div>
            <p className="font-display text-2xl tracking-tight mb-3">Four ways to qualify.</p>
            <p className="text-sm text-zinc-500 leading-relaxed editorial italic">
              Write ten stories. Or build five lists. Or pin fifteen lyrics.
              Or have your work kept by fifty different people. Any one of
              those is enough — your name appears here automatically.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
