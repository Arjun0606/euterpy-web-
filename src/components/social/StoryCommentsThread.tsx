"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import VerifiedMark from "@/components/ui/VerifiedMark";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified?: boolean;
    verified_label?: string | null;
  } | null;
}

interface Props {
  storyId: string;
  initial: Comment[];
  currentUserId: string | null;
  storyOwnerId: string;
}

export default function StoryCommentsThread({ storyId, initial, currentUserId, storyOwnerId }: Props) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function handlePost() {
    if (!body.trim() || posting) return;
    if (!currentUserId) {
      window.location.href = "/signup";
      return;
    }
    setPosting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("story_comments")
        .insert({
          story_id: storyId,
          user_id: currentUserId,
          body: body.trim(),
        })
        .select("id, body, created_at, user_id, profiles(username, display_name, avatar_url, is_verified, verified_label)")
        .single();
      if (error) throw error;
      if (data) {
        setComments([...comments, data as any]);
        setBody("");
        // Notify the story owner (silent on failure)
        if (storyOwnerId !== currentUserId) {
          await supabase.from("notifications").insert({
            user_id: storyOwnerId,
            actor_id: currentUserId,
            type: "letter",
            data: { story_id: storyId, comment_id: data.id },
          });
        }
      }
    } catch {
      toast.error("Couldn't post comment");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("story_comments").delete().eq("id", commentId);
      if (error) throw error;
      setComments(comments.filter((c) => c.id !== commentId));
      toast("Deleted");
    } catch {
      toast.error("Couldn't delete");
    }
  }

  return (
    <div className="mt-12 pt-10 border-t border-white/[0.04]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">
        — Letters to the writer {comments.length > 0 && <span className="text-zinc-700">({comments.length})</span>}
      </p>

      {/* Composer */}
      {currentUserId ? (
        <div className="mb-8">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Say something to the writer..."
            maxLength={2000}
            rows={3}
            className="editorial w-full bg-card border border-border rounded-2xl p-4 text-base text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 resize-none transition-colors"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-zinc-700 tabular-nums">{body.length} / 2000</span>
            <button
              onClick={handlePost}
              disabled={posting || !body.trim()}
              className="px-5 py-2 bg-accent text-white text-xs font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-30"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-card border border-border rounded-2xl text-center">
          <Link href="/signup" className="text-sm text-accent hover:underline">
            Sign up to leave a comment →
          </Link>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-sm text-zinc-700 text-center py-6">No letters yet. Be the first to write one.</p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => {
            const author = comment.profiles;
            const canDelete =
              currentUserId === comment.user_id || currentUserId === storyOwnerId;
            return (
              <div key={comment.id} className="flex gap-3">
                <Link
                  href={`/${author?.username}`}
                  className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-xs text-zinc-500 overflow-hidden shrink-0 hover:border-accent/40 transition-colors"
                >
                  {author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    author?.username?.[0]?.toUpperCase() || "?"
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Link
                      href={`/${author?.username}`}
                      className="text-sm font-medium hover:text-accent transition-colors inline-flex items-center gap-1"
                    >
                      {author?.display_name || author?.username}
                      {author?.is_verified && <VerifiedMark label={author.verified_label} size="sm" />}
                    </Link>
                    <span className="text-[10px] text-zinc-700">
                      {new Date(comment.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="ml-auto text-[10px] text-zinc-700 hover:text-red-400 transition-colors"
                      >
                        delete
                      </button>
                    )}
                  </div>
                  <p className="editorial text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
