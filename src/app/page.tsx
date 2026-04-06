import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <div className="flex flex-col items-center justify-center min-h-[92vh] px-6 relative">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <main className="relative flex flex-col items-center text-center max-w-lg z-10">
          <h1 className="font-display text-7xl sm:text-[7rem] tracking-tight leading-none mb-8">
            Euterpy
          </h1>
          <p className="text-lg text-zinc-400 mb-3 leading-relaxed font-light">
            Your music taste, curated.
          </p>
          <p className="text-[13px] text-zinc-600 mb-12 max-w-xs leading-relaxed">
            Rate albums. Build your shelf. Tell your story in three records.
            Find people who hear what you hear.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/signup"
              className="px-8 py-3 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20">
              Sign Up
            </Link>
            <Link href="/login"
              className="px-8 py-3 border border-border text-zinc-300 text-sm font-medium rounded-full hover:bg-card-hover hover:border-zinc-700 transition-all">
              Log In
            </Link>
          </div>
        </main>
      </div>

      <div className="max-w-4xl mx-auto px-6 sm:px-12 py-20 border-t border-border">
        <div className="grid sm:grid-cols-3 gap-12 sm:gap-10">
          <div>
            <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-3">The Shelf</p>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Every album, single, and song you rate lives on your shelf.
              Vinyl, CD, cassette, stream — track how you own it.
            </p>
          </div>
          <div>
            <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-3">Three Albums</p>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Pick three records that define you.
              Write why. This is the first thing people see
              when they visit your profile.
            </p>
          </div>
          <div>
            <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-3">Taste Match</p>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Find curators who share your ear.
              See how your taste compares.
              Discover albums through people, not algorithms.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center px-6 py-20 border-t border-border">
        <p className="text-zinc-700 text-xs mb-8 uppercase tracking-widest">Free. No streaming account needed.</p>
        <Link href="/signup"
          className="inline-block px-10 py-3.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20">
          Sign Up
        </Link>
      </div>

      <footer className="border-t border-border py-8 text-center">
        <p className="text-[11px] text-zinc-800">Euterpy</p>
      </footer>
    </div>
  );
}
