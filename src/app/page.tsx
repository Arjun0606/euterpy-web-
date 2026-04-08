import Link from "next/link";
import { getAppleMusicCharts, getArtworkUrl } from "@/lib/apple-music/client";

function art(url: string | null, size = 400): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

export default async function Home() {
  // Real Apple Music chart data — the hero IS the content
  const charts = await getAppleMusicCharts(20);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl tracking-tight">Euterpy</Link>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-foreground transition-colors">Log in</Link>
            <Link href="/signup" className="text-sm bg-accent text-white px-5 py-2 rounded-full font-medium hover:bg-accent-hover transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — content-led, two-column on desktop */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 pt-12 sm:pt-20 pb-20">
        <div className="grid lg:grid-cols-[1.1fr,1fr] gap-12 lg:gap-20 items-center">
          {/* Left: editorial copy */}
          <div>
            <p className="font-display text-accent text-lg italic mb-6">— for music curators</p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[0.95] mb-8">
              The album-first<br />
              social network<br />
              for people who<br />
              <span className="italic text-accent">live for music.</span>
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-md">
              Rate albums. Build a shelf. Tell your story in three records.
              No streaming, no algorithms. Just taste.
            </p>
            <div className="flex items-center gap-5">
              <Link href="/signup"
                className="px-8 py-3.5 bg-accent text-white text-base font-medium rounded-full hover:bg-accent-hover transition-all hover:shadow-2xl hover:shadow-accent/30">
                Start your shelf
              </Link>
              <Link href="/login" className="text-sm text-zinc-500 hover:text-foreground transition-colors">
                I have an account →
              </Link>
            </div>
          </div>

          {/* Right: floating album collage from Apple Music */}
          {charts.length > 0 && (
            <div className="relative h-[600px] sm:h-[640px] lg:h-[700px]">
              {/* Multiple ambient glows for depth */}
              <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-accent/[0.12] rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-purple-500/[0.08] rounded-full blur-[100px] pointer-events-none" />

              {/* Asymmetric floating album positions — fills the column top to bottom */}
              {(() => {
                // Each album gets a hand-tuned position. Coordinates as % of container.
                const positions = [
                  { top: "0%",   left: "12%", size: "w-36 sm:w-40", rotate: -4 },
                  { top: "4%",   left: "58%", size: "w-32 sm:w-36", rotate: 3 },
                  { top: "20%",  left: "78%", size: "w-24 sm:w-28", rotate: -2 },
                  { top: "26%",  left: "32%", size: "w-40 sm:w-44", rotate: 2 },
                  { top: "44%",  left: "68%", size: "w-28 sm:w-32", rotate: -3 },
                  { top: "48%",  left: "0%",  size: "w-32 sm:w-36", rotate: 4 },
                  { top: "62%",  left: "38%", size: "w-32 sm:w-36", rotate: -2 },
                  { top: "70%",  left: "76%", size: "w-28 sm:w-32", rotate: 3 },
                  { top: "82%",  left: "8%",  size: "w-24 sm:w-28", rotate: -3 },
                ];

                return charts.slice(0, 9).map((album, i) => {
                  const pos = positions[i];
                  const url = art(album.attributes.artwork?.url, 400);
                  if (!url) return null;
                  return (
                    <div
                      key={album.id}
                      className={`absolute ${pos.size} aspect-square`}
                      style={{
                        top: pos.top,
                        left: pos.left,
                        transform: `rotate(${pos.rotate}deg)`,
                        animation: `float ${5 + (i % 3)}s ease-in-out ${i * 0.4}s infinite`,
                      }}
                    >
                      <Link
                        href={`/album/${album.id}`}
                        className="group block w-full h-full relative transition-transform duration-500 ease-out hover:scale-110 hover:z-20"
                      >
                        {/* Glow on hover */}
                        <div className="absolute -inset-2 rounded-2xl bg-accent/0 group-hover:bg-accent/30 blur-2xl transition-all duration-500 -z-10" />

                        {/* Album cover */}
                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] border border-white/[0.08] group-hover:shadow-[0_30px_80px_-15px_rgba(255,20,147,0.5)] group-hover:border-white/[0.18] transition-all duration-500">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={album.attributes.name} className="w-full h-full object-cover" />
                          {/* Inner shine gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/30 pointer-events-none" />
                        </div>
                      </Link>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </section>

      {/* PROOF — what people build */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24">
          <div className="grid lg:grid-cols-3 gap-16 lg:gap-20">
            <div>
              <p className="font-display text-5xl text-accent mb-4">01</p>
              <h3 className="font-display text-2xl tracking-tight mb-4">Your shelf, your record store</h3>
              <p className="editorial text-base text-zinc-400 leading-relaxed">
                Every album, single, and song you rate lives on your shelf.
                Mark it as vinyl, CD, cassette, or digital. Track what you actually own.
              </p>
            </div>
            <div>
              <p className="font-display text-5xl text-accent mb-4">02</p>
              <h3 className="font-display text-2xl tracking-tight mb-4">Three albums that define you</h3>
              <p className="editorial text-base text-zinc-400 leading-relaxed">
                Pick three records. Write why they matter. This sits at the top of your profile —
                the first thing anyone sees when they tap your link.
              </p>
            </div>
            <div>
              <p className="font-display text-5xl text-accent mb-4">03</p>
              <h3 className="font-display text-2xl tracking-tight mb-4">Find your people</h3>
              <p className="editorial text-base text-zinc-400 leading-relaxed">
                See your taste-match score with other curators. Discover albums through people,
                not algorithms. Follow ears you trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MORE REAL COVERS — second wall */}
      {charts.length > 9 && (
        <section className="border-t border-border overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24">
            <div className="text-center mb-16">
              <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-4">What everyone&apos;s playing</p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tight">
                Trending right now
              </h2>
            </div>
            <div className="flex gap-4 -mx-10 px-10 overflow-x-auto no-scrollbar pb-2">
              {charts.slice(9, 20).map((album) => {
                const url = art(album.attributes.artwork?.url, 400);
                if (!url) return null;
                return (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className="shrink-0 w-44 group"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden border border-border mb-3 group-hover:border-zinc-700 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-accent/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={album.attributes.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium truncate">{album.attributes.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{album.attributes.artistName}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CLOSER — make it personal */}
      <section className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-32 text-center">
          <h2 className="font-display text-5xl sm:text-6xl tracking-tight leading-[1] mb-8">
            What does your taste<br />
            <span className="italic text-accent">say about you?</span>
          </h2>
          <p className="editorial text-lg text-zinc-400 mb-12 max-w-md mx-auto">
            Your music says more about you than your bio ever could.
            Give it a home. Make it a portrait.
          </p>
          <Link href="/signup"
            className="inline-block px-12 py-4 bg-accent text-white text-base font-medium rounded-full hover:bg-accent-hover transition-all hover:shadow-2xl hover:shadow-accent/30">
            Start your shelf
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">
          <p className="font-display text-xl text-accent">Euterpy</p>
          <p className="text-xs text-zinc-600">A home for music curators.</p>
        </div>
      </footer>
    </div>
  );
}
