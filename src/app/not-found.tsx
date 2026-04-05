import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-display text-6xl mb-4 text-muted/20">404</h1>
        <h2 className="text-xl font-semibold mb-2">This record hasn&apos;t been pressed yet</h2>
        <p className="text-sm text-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist. Maybe it was moved, or maybe it was never here.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/search"
            className="px-6 py-2.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors text-sm"
          >
            Search for music
          </Link>
          <Link
            href="/feed"
            className="px-6 py-2.5 border border-border text-muted font-medium rounded-full hover:text-foreground transition-colors text-sm"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
