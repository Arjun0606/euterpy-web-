/**
 * First Friday — Euterpy's monthly cultural ritual.
 *
 * The first Friday of every month, everyone is invited to revisit
 * (and update, if they want) their three. The whole community sees
 * each other's new threes that day. It's a calendar moment, like
 * Bandcamp Friday — not a notification, not a streak, not a forced
 * update. Just a date that exists, that anyone is welcome to
 * participate in.
 *
 * The constitution: voluntary, collective, low-pressure. The user
 * who ignores First Friday loses nothing. The user who participates
 * sees themselves in a feed of other people doing the same gesture
 * at the same time.
 *
 * This module is the canonical source of truth for "is today First
 * Friday?" and "when's the next one?" — used by the home banner,
 * the dedicated /first-friday page, and any future surfaces.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the first Friday of the given month, normalized to local
 * midnight. The first Friday is the earliest date with weekday=5
 * (Friday = 5 in JS getDay()) within the month.
 */
export function firstFridayOf(year: number, month: number): Date {
  // Start at the 1st of the month, walk forward until we hit Friday.
  const d = new Date(year, month, 1, 0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  // JS getDay: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
  // Days to add until we land on Friday:
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  d.setDate(1 + daysUntilFriday);
  return d;
}

/**
 * Is the given date First Friday in the user's timezone? We treat
 * the entire day (00:00–23:59 local time) as First Friday.
 */
export function isFirstFriday(now: Date = new Date()): boolean {
  const ff = firstFridayOf(now.getFullYear(), now.getMonth());
  return (
    now.getFullYear() === ff.getFullYear() &&
    now.getMonth() === ff.getMonth() &&
    now.getDate() === ff.getDate()
  );
}

/**
 * Returns the next First Friday from `now`. If today IS First Friday,
 * returns today. Otherwise returns the upcoming one (could be later
 * this month or the next).
 */
export function nextFirstFriday(now: Date = new Date()): Date {
  const thisMonthFF = firstFridayOf(now.getFullYear(), now.getMonth());
  // If we're still on or before this month's First Friday, return it.
  // Compare by day-of-month at local midnight to avoid timezone drift.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today.getTime() <= thisMonthFF.getTime()) return thisMonthFF;
  // Otherwise compute next month's first Friday.
  const nextMonth = now.getMonth() + 1;
  const yearOverflow = nextMonth > 11;
  return firstFridayOf(yearOverflow ? now.getFullYear() + 1 : now.getFullYear(), yearOverflow ? 0 : nextMonth);
}

/**
 * Days until the next First Friday. Returns 0 if today is the day.
 */
export function daysUntilNextFirstFriday(now: Date = new Date()): number {
  const next = nextFirstFriday(now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((next.getTime() - today.getTime()) / DAY_MS);
}

/**
 * Human label for the next First Friday.
 *   - 0 → "Today"
 *   - 1 → "Tomorrow"
 *   - 2-6 → "In N days" (e.g. "In 3 days")
 *   - 7+ → "Friday, March 6" (locale-formatted)
 */
export function nextFirstFridayLabel(now: Date = new Date()): string {
  const days = daysUntilNextFirstFriday(now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  const next = nextFirstFriday(now);
  return next.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/**
 * The local-midnight ISO timestamp for the start of today. Used for
 * Supabase queries to find GTKM rows updated today.
 */
export function todayStartISO(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return d.toISOString();
}

/**
 * The local-midnight ISO timestamp for the end of today (start of
 * tomorrow). Used together with todayStartISO() for a [start, end)
 * range query.
 */
export function tomorrowStartISO(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return d.toISOString();
}
