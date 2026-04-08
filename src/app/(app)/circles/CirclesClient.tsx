"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Circle {
  id: string;
  name: string;
  description: string | null;
  cover_emoji: string | null;
  created_at: string;
}

interface Props {
  ownedCircles: Circle[];
  memberCircles: Circle[];
}

const EMOJI_OPTIONS = ["🎧", "🎶", "🎵", "💽", "💿", "📼", "🎤", "🎸", "🎹", "🥁", "🌙", "☀️", "🔥", "💫", "🌊", "🌹"];

export default function CirclesClient({ ownedCircles, memberCircles }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Give your circle a name");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in");
        return;
      }
      const { data, error } = await supabase
        .from("circles")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          cover_emoji: emoji,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Add owner as a member too so the policies treat them as a member
      await supabase.from("circle_members").insert({ circle_id: data.id, user_id: user.id });
      toast("Circle created");
      setName("");
      setDescription("");
      setCreating(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create circle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Owned circles */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">Circles you started</h2>
          <button
            onClick={() => setCreating(!creating)}
            className="text-xs text-accent hover:underline"
          >
            {creating ? "Cancel" : "+ New circle"}
          </button>
        </div>

        {creating && (
          <div className="mb-6 p-5 bg-card border border-border rounded-2xl">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Circle name — e.g. the listening crew"
              maxLength={100}
              className="w-full bg-transparent border-none text-2xl font-display tracking-tight text-white placeholder:text-zinc-700 focus:outline-none mb-2"
              autoFocus
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this circle? (optional)"
              maxLength={500}
              rows={2}
              className="editorial w-full bg-transparent border-none text-sm text-zinc-400 italic placeholder:text-zinc-700 focus:outline-none resize-none mb-4"
            />
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-700 mb-2">— Cover</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg border text-xl transition-colors ${
                    emoji === e
                      ? "bg-accent/15 border-accent/40"
                      : "bg-input border-border hover:border-zinc-700"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="px-5 py-2 bg-accent text-white text-xs font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-30"
            >
              {saving ? "Creating..." : "Create circle"}
            </button>
          </div>
        )}

        {ownedCircles.length === 0 && !creating ? (
          <div className="border border-dashed border-border rounded-2xl py-10 px-6 text-center">
            <p className="font-display text-2xl mb-2">No circles yet.</p>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-4">
              Make a circle for the people closer than followers.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="text-xs text-accent hover:underline"
            >
              Start your first circle →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ownedCircles.map((c) => (
              <Link
                key={c.id}
                href={`/circles/${c.id}`}
                className="bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors group"
              >
                <div className="text-3xl mb-3">{c.cover_emoji || "🎧"}</div>
                <p className="font-display text-xl tracking-tight group-hover:text-accent transition-colors">{c.name}</p>
                {c.description && <p className="text-xs text-zinc-500 italic mt-1 line-clamp-2">{c.description}</p>}
                <p className="text-[10px] text-zinc-700 mt-2">You own this</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Member circles */}
      {memberCircles.length > 0 && (
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium mb-4">Circles you&apos;re in</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {memberCircles.map((c) => (
              <Link
                key={c.id}
                href={`/circles/${c.id}`}
                className="bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors group"
              >
                <div className="text-3xl mb-3">{c.cover_emoji || "🎧"}</div>
                <p className="font-display text-xl tracking-tight group-hover:text-accent transition-colors">{c.name}</p>
                {c.description && <p className="text-xs text-zinc-500 italic mt-1 line-clamp-2">{c.description}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
