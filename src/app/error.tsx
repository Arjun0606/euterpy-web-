"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-display text-4xl mb-4">Something skipped</h1>
        <p className="text-sm text-muted mb-8">
          The record hit a scratch. This is on us, not you.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
