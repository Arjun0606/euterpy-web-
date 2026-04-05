export default function FeedLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      <div className="h-8 w-32 bg-card rounded-lg animate-pulse mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border">
            <div className="w-10 h-10 rounded-full bg-card animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-card rounded animate-pulse" />
              <div className="h-3 w-48 bg-card rounded animate-pulse" />
              <div className="flex items-center gap-3 mt-2">
                <div className="w-12 h-12 rounded bg-card animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 w-24 bg-card rounded animate-pulse" />
                  <div className="h-3 w-16 bg-card rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
