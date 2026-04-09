import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAnnualData } from "@/lib/annual";
import { getArtworkUrl } from "@/lib/apple-music/client";

export const metadata = { title: "The Annual — Preview" };
export const dynamic = "force-dynamic";

/**
 * /annual/preview — DEBUG PAGE for the Annual data heuristics layer.
 *
 * This is NOT the magazine. The magazine is a September/October build.
 * This page is a developer-facing preview that calls getAnnualData()
 * for the current user with the current year and renders the raw
 * structure as readable, debuggable blocks. The point is for me and
 * the founder to look at the editorial sentences, the pull quotes,
 * the vocabulary, and the top-readers logic on REAL data — and tell
 * me if the voice is right BEFORE I commit to the magazine layout.
 *
 * Once the real /annual page ships in fall, this debug route stays
 * around as a behind-the-scenes inspector for editing the heuristics.
 */

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default async function AnnualPreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const year = new Date().getFullYear();
  const data = await getAnnualData(supabase, user.id, year);

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-12 pb-6 border-b border-border">
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-3">
          — Debug preview · not the magazine
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mb-4">
          The Annual {year}
        </h1>
        <p className="text-sm text-zinc-500 italic editorial max-w-xl">
          A behind-the-scenes look at what getAnnualData() computes for
          @{user.email}. The real magazine page ships in late fall —
          this is the data going into it. Tell me if the voice in the
          editorial paragraph is right.
        </p>
      </div>

      {!data && (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="font-display text-2xl mb-2">No data for {year}.</p>
          <p className="text-sm text-zinc-500">
            getAnnualData() returned null. The user has no activity in this year.
          </p>
        </div>
      )}

      {data && !data.hasContent && (
        <div className="mb-12 p-8 border border-dashed border-border rounded-2xl">
          <p className="font-display text-2xl mb-2">No content yet for {year}.</p>
          <p className="text-sm text-zinc-500 max-w-md italic editorial">
            The Annual would not render. Try collecting an album, writing a story, or pinning a lyric.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* THE EDITORIAL — the riskiest piece */}
          <section className="mb-14">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold mb-4">
              — The editorial paragraph
            </p>
            <div className="bg-card border border-accent/30 rounded-2xl p-7 sm:p-10">
              <p className="editorial text-xl sm:text-2xl text-zinc-200 leading-[1.65] italic">
                {data.editorial}
              </p>
            </div>
            <p className="text-[10px] text-zinc-600 mt-3 italic">
              ↑ This is computed from fixed sentence templates triggered by data signals.
              No LLM. The voice is fixed in code; only the variables come from your data.
            </p>
          </section>

          {/* COUNTS */}
          <section className="mb-14">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold mb-4">
              — Counts for {data.year}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ["Stories", data.counts.stories],
                ["Lyric pins", data.counts.lyricPins],
                ["Lists", data.counts.listsCreated],
                ["Albums", data.counts.albumsCollected],
                ["Songs", data.counts.songsCollected],
              ].map(([label, value]) => (
                <div key={label} className="bg-card border border-border rounded-xl p-5">
                  <p className="font-display text-3xl tabular-nums">{value}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* THE THREE AT END */}
          <section className="mb-14">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold mb-4">
              — The Three at end of year
            </p>
            <div className="grid grid-cols-3 gap-4">
              {data.threeAtEnd.map((slot) => {
                const cover = art(slot.album?.artworkUrl || null, 500);
                return (
                  <div key={slot.position} className="bg-card border border-border rounded-2xl p-4">
                    <div className="aspect-square rounded-lg overflow-hidden bg-background border border-border mb-3">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-3xl">♪</div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.16em] mb-1">
                      Position {slot.position}
                    </p>
                    <p className="font-display text-base tracking-tight truncate">
                      {slot.album?.title || "—"}
                    </p>
                    <p className="text-xs text-zinc-500 italic truncate">
                      {slot.album?.artistName || ""}
                    </p>
                  </div>
                );
              })}
            </div>
            {data.threeAtStart === null && (
              <p className="text-[11px] text-zinc-600 mt-3 italic">
                threeAtStart is null — no historical GTKM table yet.
                Will backfill before launch.
              </p>
            )}
          </section>

          {/* TOP STORIES */}
          {data.topStories.length > 0 && (
            <section className="mb-14">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold mb-4">
                — Top stories ({data.topStories.length})
              </p>
              <div className="space-y-4">
                {data.topStories.map((story, i) => (
                  <div key={story.storyId} className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-baseline justify-between mb-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                        #{i + 1} · {story.marksReceived} mark{story.marksReceived === 1 ? "" : "s"}
                      </p>
                      <p className="text-[10px] text-zinc-700">
                        {new Date(story.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    {story.headline && (
                      <h3 className="font-display text-2xl tracking-tight mb-3">
                        {story.headline}
                      </h3>
                    )}
                    {story.pullQuote && (
                      <blockquote className="border-l-2 border-accent pl-5 py-1 mb-3">
                        <p className="editorial italic text-base text-zinc-300 leading-relaxed">
                          &ldquo;{story.pullQuote}&rdquo;
                        </p>
                      </blockquote>
                    )}
                    <p className="text-[11px] text-zinc-600 italic">
                      on {story.targetTitle}
                      {story.targetArtist && <span> · {story.targetArtist}</span>}
                    </p>
                    <p className="text-[10px] text-zinc-700 mt-2">
                      Pull quote chars: {story.pullQuote?.length || 0} · Body chars: {story.body.length}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LYRIC PINS */}
          {data.lyricPins.length > 0 && (
            <section className="mb-14">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold mb-4">
                — Lyric pins ({data.lyricPins.length})
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.lyricPins.map((pin) => (
                  <div key={pin.id} className="bg-card border border-border rounded-2xl p-6">
                    <p className="font-display italic text-xl sm:text-2xl tracking-tight leading-[1.25] text-zinc-100 mb-4 line-clamp-4">
                      &ldquo;{pin.lyric}&rdquo;
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {pin.songTitle} · <span className="italic">{pin.songArtist}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TOP READERS */}
          {data.topReaders.length > 0 && (
            <section className="mb-14">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold mb-4">
                — Top readers ({data.topReaders.length})
              </p>
              <div className="space-y-2">
                {data.topReaders.map((reader, i) => (
                  <Link
                    key={reader.id}
                    href={`/${reader.username}`}
                    className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-accent/30 transition-colors"
                  >
                    <p className="font-display text-2xl text-zinc-700 tabular-nums w-8">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden flex items-center justify-center text-xs text-zinc-600">
                      {reader.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reader.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        reader.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {reader.displayName || reader.username}
                      </p>
                      <p className="text-[11px] text-zinc-600">@{reader.username}</p>
                    </div>
                    <p className="text-[11px] text-accent uppercase tracking-[0.14em] font-semibold">
                      {reader.marksGiven} {reader.marksGiven === 1 ? "mark" : "marks"}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* VOCABULARY */}
          {data.vocabulary.length > 0 && (
            <section className="mb-14">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold mb-4">
                — Vocabulary ({data.vocabulary.length})
              </p>
              <div className="bg-card border border-border rounded-2xl p-7 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                {data.vocabulary.map(({ word, count }) => {
                  // Scale font size by frequency, capped.
                  const max = data.vocabulary[0].count;
                  const scale = Math.min(count / max, 1);
                  const fontSize = 14 + scale * 24; // 14px to 38px
                  const opacity = 0.4 + scale * 0.6;
                  return (
                    <span
                      key={word}
                      className="font-display tracking-tight text-zinc-200"
                      style={{ fontSize: `${fontSize}px`, opacity }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-600 mt-3 italic">
                ↑ Word frequency from story bodies + headlines + lyric pin contents.
                Stopwords removed. Top 30. The basis for the future vocabulary spread in the magazine.
              </p>
            </section>
          )}

          {/* PROFILE DEBUG */}
          <section className="mb-14">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold mb-4">
              — Raw profile
            </p>
            <pre className="bg-card border border-border rounded-2xl p-5 text-[10px] text-zinc-500 overflow-x-auto">
              {JSON.stringify(data.profile, null, 2)}
            </pre>
          </section>
        </>
      )}
    </main>
  );
}
