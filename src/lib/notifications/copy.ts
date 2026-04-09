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
  type: string;
  data: any;
  actor?: {
    username: string;
    display_name?: string | null;
  };
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

  switch (n.type) {
    case "follow":
      return {
        message: "is following you now.",
        href: actorUsername ? `/${actorUsername}` : "/",
      };

    case "follow_request":
      return {
        message: "asked to follow you.",
        href: "/settings",
      };

    case "mark":
      // "Marked" is the validation primitive. Translate it to a more human verb
      // depending on what was marked.
      if (kind === "story") {
        return {
          message: "kept your story.",
          href: targetId ? targetHrefFor("story", targetId) : "/",
        };
      }
      if (kind === "lyric") {
        return {
          message: "kept a line you'd kept too.",
          href: targetHrefFor("lyric", targetId, actorUsername),
        };
      }
      if (kind === "list") {
        return {
          message: "kept your list.",
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
          message: "carried your story into her own pages.",
          href: targetId ? targetHrefFor("story", targetId) : "/",
        };
      }
      if (kind === "lyric") {
        return {
          message: "carried your lyric into her own.",
          href: targetHrefFor("lyric", targetId, actorUsername),
        };
      }
      if (kind === "list") {
        return {
          message: "carried your list into her own.",
          href: targetId ? targetHrefFor("list", targetId) : "/",
        };
      }
      return {
        message: "carried your work into her own.",
        href: targetId ? targetHrefFor(kind, targetId, actorUsername) : "/",
      };

    case "letter":
      return {
        message: "wrote you a letter.",
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
