export default function DiscoverLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="h-8 w-40 bg-card rounded-lg animate-pulse mb-8" />

      {/* Top Rated section skeleton */}
      <div className="mb-10">
        <div className="h-4 w-24 bg-card rounded animate-pulse mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0 w-36">
              <div className="w-36 h-36 rounded-xl bg-card animate-pulse mb-2" />
              <div className="h-3 w-24 bg-card rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-card rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Active Users section skeleton */}
      <div className="mb-10">
        <div className="h-4 w-28 bg-card rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-card/50 border border-border">
              <div className="w-12 h-12 rounded-full bg-card animate-pulse mx-auto mb-2" />
              <div className="h-3 w-20 bg-card rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
