/**
 * Notification copy and routing — the language of letters from friends.
 *
 * Generic social-app notifications read like spam ("Maya marked your post").
 * The constitution says Euterpy is a place for deliberate acts and intentional
 * voice — so notifications need to read like brief notes, not engagement ping
 * grammar. The copy here is deliberately writerly: verbs that describe what
 * actually happened in a human sense ("carried into her collection," "wrote
 * you a letter," "kept a line you'd kept too").
 *
 * Every notification produces a Sentence and a Href. Both surfaces (the bell
 * dropdown and the full notifications page) call this same function so the
 * voice never drifts.
 */

export interface NotificationLike {
  /** The notification's ID is used to seed the variant rotation so the
   * sentence is stable for any given row but varies across rows. */
  id?: string;
  type: string;
  data: any;
  actor?: {
    username: string;
    display_name?: string | null;
  };
}

/**
 * Tiny stable hash → integer index. Used to pick a sentence variant
 * for a notification in a way that doesn't change between renders.
 * Falls back to 0 when no id is present.
 */
function variantIndex(seed: string | undefined, length: number): number {
  if (!seed || length <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

function pick<T>(seed: string | undefined, options: T[]): T {
  return options[variantIndex(seed, options.length)];
}

export interface RenderedNotification {
  /** Verb phrase that comes after the actor name. e.g. "wrote you a letter." */
  message: string;
  /** Where the notification routes to when clicked. */
  href: string;
}

function targetHrefFor(kind: string, targetId: string, actorUsername?: string): string {
  if (kind === "story") return `/story/${targetId}`;
  if (kind === "list") return `/list/${targetId}`;
  if (kind === "lyric") return actorUsername ? `/${actorUsername}` : "/";
  if (kind === "chart") return actorUsername ? `/${actorUsername}/charts` : "/";
  return "/";
}

/**
 * Render a notification as a literary sentence + a destination URL.
 * The actor's name is rendered separately by the caller (so it can be
 * styled), so `message` is the rest of the sentence — starting lowercase,
 * ending with a period.
 */
export function renderNotification(n: NotificationLike): RenderedNotification {
  const kind = n.data?.kind || "story";
  const targetId = n.data?.target_id;
  const actorUsername = n.actor?.username;
  const seed = n.id;

  switch (n.type) {
    case "follow":
      return {
        message: pick(seed, [
          "is following you now.",
          "is keeping an eye on your pages.",
          "joined your readers.",
        ]),
        href: actorUsername ? `/${actorUsername}` : "/",
      };

    case "follow_request":
      return {
        message: "asked to follow you.",
        href: "/settings",
      };

    case "mark":
      // "Marked" is the validation primitive. Translate it to a more human verb
      // depending on what was marked. Multiple variants per kind so the feed
      // doesn't read like a script.
      if (kind === "story") {
        return {
          message: pick(seed, [
            "kept your story.",
            "marked your story to come back to.",
            "added your story to her keepsakes.",
          ]),
          href: targetId ? targetHrefFor("story", targetId) : "/",
        };
      }
      if (kind === "lyric") {
        return {
          message: pick(seed, [
            "kept a line you'd kept too.",
            "carries a line you wrote down.",
            "marked one of your lyrics.",
          ]),
          href: targetHrefFor("lyric", targetId, actorUsername),
        };
      }
      if (kind === "list") {
        return {
          message: pick(seed, [
            "kept your list.",
            "marked your list to come back to.",
          ]),
          href: targetId ? targetHrefFor("list", targetId) : "/",
        };
      }
      if (kind === "chart") {
        return {
          message: "kept your chart.",
          href: targetHrefFor("chart", targetId, actorUsername),
        };
      }
      return {
        message: "kept your work.",
        href: targetId ? targetHrefFor(kind, targetId, actorUsername) : "/",
      };

    case "echo":
      // Echo = repost. Frame it as carrying the work somewhere new.
      if (kind === "story") {
        return {
          message: pick(seed, [
            "carried your story into her own pages.",
            "passed your story along.",
            "echoed your story to her readers.",
          ]),
          href: targetId ? targetHrefFor("story", targetId) : "/",
        };
      }
      if (kind === "lyric") {
        return {
          message: pick(seed, [
            "carried your lyric into her own.",
            "echoed a line you pinned.",
          ]),
          href: targetHrefFor("lyric", targetId, actorUsername),
        };
      }
      if (kind === "list") {
        return {
          message: pick(seed, [
            "carried your list into her own.",
            "passed your list along.",
          ]),
          href: targetId ? targetHrefFor("list", targetId) : "/",
        };
      }
      return {
        message: "carried your work into her own.",
        href: targetId ? targetHrefFor(kind, targetId, actorUsername) : "/",
      };

    case "letter":
      return {
        message: pick(seed, [
          "wrote you a letter.",
          "left a letter on your story.",
          "answered your story with one of her own.",
        ]),
        href: n.data?.story_id ? `/story/${n.data.story_id}` : "/",
      };

    case "review_vote":
      return {
        message: n.data?.vote_type === "up"
          ? "agreed with your review."
          : "disagreed with your review.",
        href: n.data?.album_apple_id ? `/album/${n.data.album_apple_id}` : "/",
      };

    case "badge_earned":
      // Self-notifications: there's no actor, the system speaks.
      return {
        message: `You earned the "${n.data?.badge_name}" badge.`,
        href: actorUsername ? `/${actorUsername}` : "/",
      };

    default:
      return {
        message: "interacted with your profile.",
        href: actorUsername ? `/${actorUsername}` : "/",
      };
  }
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
