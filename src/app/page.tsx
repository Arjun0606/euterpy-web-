import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-[90vh] px-6">
        <main className="flex flex-col items-center text-center max-w-xl">
          <h1 className="font-display text-7xl sm:text-9xl tracking-tight mb-6">
            Euterpy
          </h1>
          <p className="text-lg sm:text-xl text-muted mb-3 leading-relaxed">
            Your music taste, curated.
          </p>
          <p className="text-sm text-muted/50 mb-10 max-w-sm leading-relaxed">
            Rate albums. Build your shelf. Tell your story in three records.
            Find people who hear what you hear.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors text-center"
            >
              Claim Your Username
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border border-border text-foreground font-medium rounded-full hover:bg-card-hover transition-colors text-center"
            >
              Log In
            </Link>
          </div>
        </main>
      </div>

      {/* What is it */}
      <div className="max-w-3xl mx-auto px-6 py-16 border-t border-border/20">
        <div className="grid sm:grid-cols-3 gap-10">
          <div>
            <p className="text-accent text-sm font-medium mb-2">The Shelf</p>
            <p className="text-sm text-muted leading-relaxed">
              Every album, single, and song you rate lives on your shelf.
              Vinyl, CD, cassette, stream — track how you own it.
            </p>
          </div>
          <div>
            <p className="text-accent text-sm font-medium mb-2">Three Albums</p>
            <p className="text-sm text-muted leading-relaxed">
              Pick three records that define you.
              Write why. This is the first thing people see
              when they visit your profile.
            </p>
          </div>
          <div>
            <p className="text-accent text-sm font-medium mb-2">Taste Match</p>
            <p className="text-sm text-muted leading-relaxed">
              Find curators who share your ear.
              See how your taste compares.
              Discover albums through people, not algorithms.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center px-6 py-16 border-t border-border/20">
        <p className="text-muted/40 text-sm mb-6">
          Free. No streaming account needed.
        </p>
        <Link
          href="/signup"
          className="inline-block px-10 py-3.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors"
        >
          Claim Your Username
        </Link>
      </div>

      <footer className="border-t border-border/10 py-6 text-center">
        <p className="text-[11px] text-muted/20">Euterpy</p>
      </footer>
    </div>
  );
}
