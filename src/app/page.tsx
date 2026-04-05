import Link from "next/link";

const MOCK_COVERS = [
  { color: "from-pink-500/20 to-purple-500/20", initial: "OK" },
  { color: "from-amber-500/20 to-red-500/20", initial: "KL" },
  { color: "from-blue-500/20 to-cyan-500/20", initial: "BL" },
  { color: "from-green-500/20 to-emerald-500/20", initial: "AB" },
  { color: "from-violet-500/20 to-fuchsia-500/20", initial: "IG" },
  { color: "from-orange-500/20 to-yellow-500/20", initial: "MM" },
  { color: "from-rose-500/20 to-pink-500/20", initial: "FL" },
  { color: "from-teal-500/20 to-blue-500/20", initial: "DS" },
  { color: "from-indigo-500/20 to-violet-500/20", initial: "TN" },
  { color: "from-red-500/20 to-orange-500/20", initial: "RA" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center min-h-[85vh] px-6">
        {/* Floating album covers background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.07]">
          <div className="absolute top-[10%] left-[5%] w-32 h-32 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 rotate-[-8deg]" />
          <div className="absolute top-[20%] right-[8%] w-28 h-28 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 rotate-[12deg]" />
          <div className="absolute bottom-[25%] left-[12%] w-24 h-24 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 rotate-[6deg]" />
          <div className="absolute bottom-[15%] right-[15%] w-36 h-36 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 rotate-[-4deg]" />
          <div className="absolute top-[45%] left-[45%] w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 rotate-[15deg]" />
        </div>

        <main className="relative flex flex-col items-center text-center max-w-2xl z-10">
          <h1 className="font-display text-6xl sm:text-8xl tracking-tight mb-4">
            Euterpy
          </h1>
          <p className="text-xl sm:text-2xl text-muted mb-3">
            Your music taste, curated.
          </p>
          <p className="text-base text-muted/60 mb-10 max-w-md leading-relaxed">
            Rate albums. Build your collection. Tell your story in 3 records.
            Discover people who hear what you hear.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-all hover:scale-105 text-base"
            >
              Claim Your Username
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border border-border text-foreground font-medium rounded-full hover:bg-card-hover transition-colors text-base"
            >
              Log In
            </Link>
          </div>
          <p className="text-xs text-muted/30">Free forever. No streaming account needed.</p>
        </main>
      </div>

      {/* Value Props */}
      <div className="max-w-4xl mx-auto px-6 py-20 border-t border-border/30">
        <div className="grid sm:grid-cols-3 gap-12 sm:gap-8">
          <div className="text-center sm:text-left">
            <div className="text-3xl mb-3">★</div>
            <h3 className="font-semibold text-lg mb-2">Log Your Taste</h3>
            <p className="text-sm text-muted leading-relaxed">
              Rate albums 1-5. Track what you own on vinyl, CD, or stream.
              Every rating builds your taste profile.
            </p>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-3xl mb-3">◈</div>
            <h3 className="font-semibold text-lg mb-2">Build Your Identity</h3>
            <p className="text-sm text-muted leading-relaxed">
              Tell your story in 3 albums. Curate shelves. Your profile becomes
              a living portrait of who you are through music.
            </p>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-3xl mb-3">◉</div>
            <h3 className="font-semibold text-lg mb-2">Discover Through People</h3>
            <p className="text-sm text-muted leading-relaxed">
              Find people who hear what you hear. Taste matching connects you
              by what you love, not who you know.
            </p>
          </div>
        </div>
      </div>

      {/* Mock Profile Card */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-card border border-border rounded-2xl p-8 sm:p-10">
          <p className="text-xs uppercase tracking-widest text-muted/40 mb-6 text-center">
            Your profile could look like this
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
            <div className="w-16 h-16 rounded-full bg-background border-2 border-accent/30 flex items-center justify-center text-2xl font-display text-accent">
              ?
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl font-semibold">Your Name</p>
              <p className="text-accent text-sm">@yourname</p>
              <p className="text-muted text-sm mt-1 italic">&ldquo;Music is my autobiography&rdquo;</p>
            </div>
          </div>

          {/* Mock GTKM */}
          <p className="text-xs uppercase tracking-widest text-muted/40 mb-3">Get to Know Me</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {["The album that shaped me", "The one I keep coming back to", "The one that changed everything"].map((label, i) => (
              <div key={i} className="text-center">
                <div className={`aspect-square rounded-xl bg-gradient-to-br ${MOCK_COVERS[i].color} border border-border/50 flex items-center justify-center mb-2`}>
                  <span className="text-2xl text-muted/30 font-display">{MOCK_COVERS[i].initial}</span>
                </div>
                <p className="text-[10px] text-muted/40">{label}</p>
              </div>
            ))}
          </div>

          {/* Mock shelf */}
          <p className="text-xs uppercase tracking-widest text-muted/40 mb-3">Collection</p>
          <div className="flex gap-2 overflow-hidden">
            {MOCK_COVERS.slice(0, 7).map((cover, i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-lg bg-gradient-to-br ${cover.color} border border-border/30 shrink-0 flex items-center justify-center`}
              >
                <span className="text-xs text-muted/20 font-mono">{cover.initial}</span>
              </div>
            ))}
            <div className="w-14 h-14 rounded-lg border border-dashed border-border/30 shrink-0 flex items-center justify-center">
              <span className="text-xs text-muted/20">+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center px-6 pb-24">
        <p className="text-muted/60 mb-6 text-sm">
          Join the curators who take their taste seriously.
        </p>
        <Link
          href="/signup"
          className="inline-block px-10 py-4 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-all hover:scale-105"
        >
          Get Started — It&apos;s Free
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 text-center">
        <p className="text-xs text-muted/30">
          Euterpy — Your music taste, curated.
        </p>
      </footer>
    </div>
  );
}
