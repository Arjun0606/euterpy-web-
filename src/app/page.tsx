import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Subtle nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 px-6 sm:px-12 py-6 flex items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-tight">Euterpy</Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-foreground transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="text-sm bg-accent text-white px-5 py-2 rounded-full font-medium hover:bg-accent-hover transition-colors">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero — editorial */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 relative">
        {/* Pink ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-accent/[0.06] rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-3xl text-center relative z-10">
          <p className="text-[11px] text-accent mb-8 tracking-[0.2em] uppercase">A home for music curators</p>

          <h1 className="font-display text-6xl sm:text-8xl tracking-tight leading-[0.95] mb-10">
            Music is how<br />
            <span className="italic text-accent">we know ourselves.</span>
          </h1>

          <p className="editorial text-xl sm:text-2xl text-zinc-400 max-w-xl mx-auto mb-12">
            Rate albums. Build your shelf. Tell your story in three records.
            Find people who hear what you hear.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="px-10 py-4 bg-accent text-white text-base font-medium rounded-full hover:bg-accent-hover transition-all hover:shadow-2xl hover:shadow-accent/30">
              Start your shelf
            </Link>
            <Link href="/login"
              className="px-10 py-4 text-zinc-400 text-base hover:text-foreground transition-colors">
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Three pillars — editorial cards */}
      <section className="px-6 sm:px-12 py-32 max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[11px] text-accent tracking-[0.2em] uppercase mb-4">What you build</p>
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight">A profile that means something</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-12 sm:gap-16">
          <div>
            <p className="font-display text-4xl mb-4 text-accent">01</p>
            <h3 className="font-display text-2xl mb-3">The Shelf</h3>
            <p className="editorial text-base text-zinc-400 leading-relaxed">
              Every album, single, and song you rate lives on your shelf.
              Vinyl, CD, cassette, stream — track how you own it.
            </p>
          </div>
          <div>
            <p className="font-display text-4xl mb-4 text-accent">02</p>
            <h3 className="font-display text-2xl mb-3">Three Albums</h3>
            <p className="editorial text-base text-zinc-400 leading-relaxed">
              Pick three records that define you. Write why.
              This is the first thing people see when they visit your profile.
            </p>
          </div>
          <div>
            <p className="font-display text-4xl mb-4 text-accent">03</p>
            <h3 className="font-display text-2xl mb-3">Taste Match</h3>
            <p className="editorial text-base text-zinc-400 leading-relaxed">
              Find curators who share your ear. See how your taste compares.
              Discover albums through people, not algorithms.
            </p>
          </div>
        </div>
      </section>

      {/* The pitch */}
      <section className="px-6 sm:px-12 py-32 border-t border-border relative">
        {/* Subtle bottom glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/[0.04] rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-8 leading-tight">
            Your music taste says more about you than <span className="italic text-accent">anything else.</span>
          </h2>
          <p className="editorial text-lg text-zinc-400 mb-12">
            Give it a home. Make it a portrait. Share it with the world.
          </p>
          <Link href="/signup"
            className="inline-block px-12 py-4 bg-accent text-white text-base font-medium rounded-full hover:bg-accent-hover transition-all hover:shadow-2xl hover:shadow-accent/30">
            Start your shelf
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 text-center">
        <p className="font-display text-2xl mb-2 text-accent">Euterpy</p>
        <p className="text-xs text-zinc-600">A home for music curators.</p>
      </footer>
    </div>
  );
}
