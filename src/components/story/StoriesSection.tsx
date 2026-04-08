import Link from "next/link";

interface Story {
  id: string;
  headline: string | null;
  body: string;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Props {
  stories: Story[];
  title?: string;
  emptyState?: React.ReactNode;
}

/**
 * Magazine-style list of stories. Used on album/song/artist pages
 * (where it shows community stories) and on profile pages.
 */
export default function StoriesSection({ stories, title = "Stories", emptyState }: Props) {
  if (stories.length === 0) {
    if (!emptyState) return null;
    return (
      <section className="mb-14">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">— {title}</p>
        {emptyState}
      </section>
    );
  }

  return (
    <section className="mb-14">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">— {title}</p>
      <div className="space-y-8">
        {stories.map((story) => {
          const author = story.profiles;
          const preview = story.body.length > 240 ? story.body.slice(0, 240).trimEnd() + "…" : story.body;

          return (
            <Link key={story.id} href={`/story/${story.id}`} className="block group">
              <article className="border-b border-white/[0.04] pb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs text-zinc-500 overflow-hidden shrink-0">
                    {author?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      author?.username?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-300">{author?.display_name || author?.username}</span>
                    <span className="text-zinc-700"> · {new Date(story.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </p>
                </div>

                {story.headline && (
                  <h3 className="font-display text-2xl sm:text-3xl tracking-tight leading-tight mb-3 group-hover:text-accent transition-colors">
                    {story.headline}
                  </h3>
                )}

                <p className="editorial text-base sm:text-lg text-zinc-400 leading-relaxed line-clamp-4 group-hover:text-zinc-300 transition-colors">
                  {preview}
                </p>

                <p className="text-[11px] text-zinc-700 mt-3 group-hover:text-accent transition-colors">Read more →</p>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
