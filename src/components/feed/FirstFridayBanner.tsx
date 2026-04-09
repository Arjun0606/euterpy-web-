import Link from "next/link";
import { isFirstFriday, nextFirstFridayLabel, daysUntilNextFirstFriday } from "@/lib/firstFriday";

interface Props {
  /**
   * How many friends have updated their three today (only relevant
   * when isFirstFriday). Pass 0 if you haven't computed it yet.
   */
  friendsUpdatedToday?: number;
}

/**
 * The First Friday banner — Euterpy's monthly cultural date, surfaced
 * on the home feed. Two visual states:
 *
 *   - On First Friday itself: a festive, accent-bordered hero with a
 *     CTA to update your three and a count of how many friends have
 *     updated theirs today. Links to the dedicated /first-friday page
 *     where you see everyone's new threes side-by-side.
 *
 *   - Other days: a quiet one-liner anticipating the next one. Just
 *     enough to plant the date in the user's mind without spamming.
 *
 * Crucially: ALWAYS visible. Not a notification, not a push. The user
 * can ignore it forever. The point is that the date *exists*, and
 * everyone in the room knows it.
 */
export default function FirstFridayBanner({ friendsUpdatedToday = 0 }: Props) {
  const today = isFirstFriday();

  if (today) {
    return (
      <section className="mb-14">
        <Link
          href="/first-friday"
          className="group block rounded-3xl border border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card hover:border-accent transition-colors overflow-hidden relative"
        >
          {/* Soft glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-accent/[0.08] rounded-full blur-[100px] -z-0 pointer-events-none" />

          <div className="relative z-10 px-7 py-9 sm:px-12 sm:py-12">
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-4">
              — A Euterpy holiday
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight leading-[0.95] mb-4">
              Today is <span className="italic text-accent">First Friday.</span>
            </h2>
            <p className="editorial italic text-base sm:text-lg text-zinc-400 leading-relaxed mb-7 max-w-xl">
              Once a month, everyone is invited to revisit their three. Swap one,
              keep them all, or just look at them again. The whole room is doing
              it today.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/gtkm"
                className="inline-flex items-center px-6 py-3 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-hover transition-colors"
              >
                Visit your three →
              </Link>
              <Link
                href="/first-friday"
                className="text-[12px] uppercase tracking-[0.18em] text-zinc-500 hover:text-accent font-semibold transition-colors"
              >
                See everyone&apos;s →
              </Link>
              {friendsUpdatedToday > 0 && (
                <p className="text-xs text-zinc-500 italic ml-auto">
                  {friendsUpdatedToday}{" "}
                  {friendsUpdatedToday === 1 ? "person you follow has" : "people you follow have"}{" "}
                  already.
                </p>
              )}
            </div>
          </div>
        </Link>
      </section>
    );
  }

  // Quiet anticipation state — used on every other day of the month.
  const days = daysUntilNextFirstFriday();
  const label = nextFirstFridayLabel();

  return (
    <section className="mb-10">
      <Link
        href="/first-friday"
        className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/40 px-5 py-4 hover:border-accent/30 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600 font-semibold mb-1 group-hover:text-accent transition-colors">
            — First Friday
          </p>
          <p className="text-sm text-zinc-400">
            <span className="italic editorial">The next monthly visit to your three is </span>
            <span className="text-foreground font-medium">{label.toLowerCase()}</span>
            <span className="italic editorial text-zinc-500">
              {days >= 7 ? "." : days === 0 ? "." : `, ${days} ${days === 1 ? "day" : "days"} away.`}
            </span>
          </p>
        </div>
        <span className="text-[11px] text-zinc-600 group-hover:text-accent transition-colors shrink-0 hidden sm:inline">
          Read about it →
        </span>
      </Link>
    </section>
  );
}
