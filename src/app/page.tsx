import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <main className="flex flex-col items-center text-center max-w-2xl">
        {/* Logo */}
        <h1 className="font-display text-6xl sm:text-8xl tracking-tight mb-6">
          Euterpy
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl text-muted mb-4">
          Your music taste, curated.
        </p>
        <p className="text-base text-muted/60 mb-12 max-w-md">
          Log albums. Rate them. Build your taste. Share who you are.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup"
            className="px-8 py-3 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-border text-foreground font-medium rounded-full hover:bg-card-hover transition-colors"
          >
            Log In
          </Link>
        </div>

        {/* Social proof placeholder */}
        <p className="mt-16 text-sm text-muted/40">
          The Letterboxd for music.
        </p>
      </main>
    </div>
  );
}
