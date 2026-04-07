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

          {/* Right: real album collage from Apple Music */}
          {charts.length > 0 && (
            <div className="relative h-[500px] sm:h-[600px] lg:h-[640px]">
              {/* Floating album covers — staggered, real data */}
              <div className="absolute inset-0">
                {charts.slice(0, 9).map((album, i) => {
                  const positions = [
                    { top: "0%", left: "20%", size: "w-40 h-40", rotate: "-rotate-3" },
                    { top: "8%", left: "62%", size: "w-32 h-32", rotate: "rotate-2" },
                    { top: "30%", left: "0%", size: "w-36 h-36", rotate: "rotate-1" },
                    { top: "28%", left: "42%", size: "w-44 h-44", rotate: "-rotate-2" },
                    { top: "35%", left: "78%", size: "w-28 h-28", rotate: "rotate-3" },
                    { top: "58%", left: "18%", size: "w-32 h-32", rotate: "rotate-2" },
                    { top: "62%", left: "55%", size: "w-36 h-36", rotate: "-rotate-1" },
                    { top: "75%", left: "5%", size: "w-24 h-24", rotate: "-rotate-3" },
                    { top: "78%", left: "82%", size: "w-28 h-28", rotate: "rotate-2" },
                  ];
                  const pos = positions[i];
                  const url = art(album.attributes.artwork?.url, 400);
                  if (!url) return null;
                  return (
                    <div
                      key={album.id}
                      className={`absolute ${pos.size} ${pos.rotate} rounded-xl overflow-hidden shadow-2xl border border-white/[0.08] hover:scale-110 hover:rotate-0 hover:z-20 transition-all duration-500 cursor-pointer`}
                      style={{ top: pos.top, left: pos.left }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={album.attributes.name} className="w-full h-full object-cover" />
                    </div>
                  );
                })}
              </div>
              {/* Subtle accent glow behind */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/[0.08] rounded-full blur-[120px] -z-10" />
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
              <p className="text-[11px] uppercase tracking-[0.18em] text-accent mb-4">Live from Apple Music</p>
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
