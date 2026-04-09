/**
 * Curator status — meritocratic, automatic, derived from actual work.
 *
 * Letterboxd has Patrons (paid) and HQ (staff). RYM has nothing. Most apps
 * gate "verified" status behind manual review or money. We deliberately
 * killed that path (see migration 020). Instead: a profile is treated as a
 * Curator if its published portfolio crosses any of three thresholds. The
 * thresholds are designed so a serious user passes them in a couple weeks
 * and a casual user never does, without anyone gatekeeping.
 *
 * The label is shown to *visitors* of the profile (so they know whose work
 * they're looking at) and is hidden from the owner themselves — exactly
 * like a magazine doesn't tell its writers they're "verified," readers
 * just see the masthead. Feels less performative that way.
 *
 * No badge migration needed: this is computed at render time from the
 * social counts already gathered for the profile page.
 */

export interface CuratorInputs {
  storyCount: number;
  lyricCount: number;
  listCount: number;
  marksReceived: number;
}

/**
 * The thresholds. Any one of these is sufficient.
 *   - Prolific writer:   10+ stories
 *   - Active curator:    5+ lists OR 15+ lyric pins
 *   - Recognized voice:  50+ marks received from other people
 *
 * The third path is the only one that depends on social signal — by design.
 * It's the "the room thinks you matter" channel for people who don't write
 * many stories but whose taste resonates.
 */
export function isCurator(inputs: CuratorInputs): boolean {
  if (inputs.storyCount >= 10) return true;
  if (inputs.listCount >= 5) return true;
  if (inputs.lyricCount >= 15) return true;
  if (inputs.marksReceived >= 50) return true;
  return false;
}

/**
 * Returns the strongest reason this user qualifies, for the eyebrow tag.
 * Falls back to "A Euterpy curator." for the generic case.
 */
export function curatorLabel(inputs: CuratorInputs): string {
  if (inputs.marksReceived >= 50) return "A voice the room follows";
  if (inputs.storyCount >= 10) return "A Euterpy writer";
  if (inputs.listCount >= 5) return "A Euterpy curator";
  if (inputs.lyricCount >= 15) return "A keeper of lines";
  return "A Euterpy curator";
}
