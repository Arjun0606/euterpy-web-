"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import VerifiedMark from "@/components/ui/VerifiedMark";

interface Member {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
  verified_label?: string | null;
  joined_at: string;
}

interface PersonResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FeedItem {
  type: string;
  data: any;
  date: string;
}

interface Props {
  circleId: string;
  isOwner: boolean;
  members: Member[];
  feed: FeedItem[];
}

function art(url: string | null, size = 200): string | null {
  if (!url) return null;
  return url.replace("{w}", size.toString()).replace("{h}", size.toString());
}

export default function CircleDetailClient({ circleId, isOwner, members, feed }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const memberIds = new Set(members.map((m) => m.id));

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const supabase = createClient();
      const term = q.trim().toLowerCase();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(8);
      setResults((data || []).filter((p) => !memberIds.has(p.id)));
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, [memberIds]);

  function handleSearchInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
  }

  async function addMember(person: PersonResult) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("circle_members")
        .insert({ circle_id: circleId, user_id: person.id });
      if (error) throw error;
      toast(`Added @${person.username}`);
      setQuery("");
      setResults([]);
      router.refresh();
    } catch (e: any) {
      if (e?.code === "23505") toast("Already in this circle");
      else toast.error("Couldn't add");
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove from circle?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("circle_members")
        .delete()
        .eq("circle_id", circleId)
        .eq("user_id", memberId);
      if (error) throw error;
      toast("Removed");
      router.refresh();
    } catch {
      toast.error("Couldn't remove");
    }
  }

  return (
    <div>
      {/* Members */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">Members</h2>
          {isOwner && (
            <button
              onClick={() => setAdding(!adding)}
              className="text-xs text-accent hover:underline"
            >
              {adding ? "Cancel" : "+ Add member"}
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-5 p-4 bg-card border border-border rounded-2xl">
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search by username or display name..."
              autoFocus
              className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
            />
            {searching && <p className="text-xs text-zinc-600 text-center py-3">Searching...</p>}
            {!searching && results.length === 0 && query.length >= 2 && (
              <p className="text-xs text-zinc-700 text-center py-3">No one found.</p>
            )}
            {results.length > 0 && (
              <div className="mt-2 space-y-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => addMember(r)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-xs text-zinc-600 overflow-hidden">
                      {r.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : r.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.display_name || r.username}</p>
                      <p className="text-[11px] text-accent">@{r.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {members.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-4 text-center group relative">
              <Link href={`/${m.username}`} className="block">
                <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-base text-zinc-600 mx-auto mb-2 overflow-hidden">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : m.username[0].toUpperCase()}
                </div>
                <p className="font-medium text-xs truncate inline-flex items-center gap-1 justify-center">
                  {m.display_name || m.username}
                  {m.is_verified && <VerifiedMark label={m.verified_label} size="sm" />}
                </p>
                <p className="text-[10px] text-zinc-700">@{m.username}</p>
              </Link>
              {isOwner && (
                <button
                  onClick={() => removeMember(m.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 text-[10px] transition-all"
                  aria-label="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Circle feed */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium mb-4">Recently from this circle</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-zinc-700 text-center py-12">No activity yet.</p>
        ) : (
          <div className="space-y-5">
            {feed.slice(0, 12).map((entry) => {
              const author = entry.data.profiles;
              const verb =
                entry.type === "story" ? "wrote a story" :
                entry.type === "list" ? "made a list" :
                entry.type === "chart" ? "published a chart" :
                "pinned a lyric";
              const href =
                entry.type === "story" ? `/story/${entry.data.id}` :
                entry.type === "list" ? `/list/${entry.data.id}` :
                entry.type === "chart" ? `/${author?.username}/charts` :
                `/song/${entry.data.song_apple_id}`;

              return (
                <Link key={`${entry.type}-${entry.data.id}`} href={href}
                  className="block bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors group">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Link href={`/${author?.username}`} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs text-zinc-600 shrink-0 overflow-hidden">
                      {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (author?.username?.[0]?.toUpperCase() || "?")}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      <span className="text-zinc-300 font-medium">{author?.display_name || author?.username}</span>
                      <span className="text-zinc-700"> · {verb}</span>
                    </p>
                  </div>
                  {entry.type === "story" && (
                    <>
                      {entry.data.headline && <p className="font-display text-xl tracking-tight line-clamp-2 group-hover:text-accent transition-colors">{entry.data.headline}</p>}
                      <p className="text-[11px] text-zinc-700 mt-1">on {entry.data.target_title}</p>
                    </>
                  )}
                  {entry.type === "list" && (
                    <>
                      <p className="font-display text-xl tracking-tight line-clamp-2 group-hover:text-accent transition-colors">{entry.data.title}</p>
                      {entry.data.subtitle && <p className="text-xs text-zinc-500 italic editorial mt-1 line-clamp-1">{entry.data.subtitle}</p>}
                    </>
                  )}
                  {entry.type === "chart" && (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-1">— Ten right now</p>
                      <p className="font-display text-xl tracking-tight italic">{entry.data.period_label || new Date(entry.data.created_at).toLocaleString("en-US", { month: "long", year: "numeric" })}</p>
                    </>
                  )}
                  {entry.type === "lyric" && (
                    <>
                      <p className="font-display italic text-lg tracking-tight leading-snug text-zinc-100 line-clamp-3 group-hover:text-white transition-colors">
                        &ldquo;{entry.data.lyric}&rdquo;
                      </p>
                      <p className="text-[11px] text-zinc-700 mt-2">{entry.data.song_title} · {entry.data.song_artist}</p>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
