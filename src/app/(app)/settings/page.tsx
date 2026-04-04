"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface GtkmItem {
  id: string;
  position: number;
  album_id: string;
  story: string | null;
  albums: {
    title: string;
    artist_name: string;
    artwork_url: string | null;
    apple_id: string;
  };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gtkmItems, setGtkmItems] = useState<GtkmItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
      }

      // Get to Know Me items
      const { data: gtkm } = await supabase
        .from("get_to_know_me")
        .select("*, albums(*)")
        .eq("user_id", user.id)
        .order("position");

      if (gtkm) setGtkmItems(gtkm);
    });
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", profile.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/feed">
            <h1 className="font-display text-2xl">Euterpy</h1>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link
              href={`/${profile.username}`}
              className="text-muted hover:text-foreground transition-colors"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-8">Edit Profile</h2>

        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center text-xl text-muted">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>
            <div>
              <p className="font-medium">@{profile.username}</p>
              <p className="text-xs text-muted/40">
                Username cannot be changed
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="One sentence about your relationship with music..."
              maxLength={160}
              rows={2}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors resize-none"
            />
            <p className="text-right text-xs text-muted/30 mt-1">
              {bio.length}/160
            </p>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>

        {/* Get to Know Me */}
        <div className="mt-12">
          <h3 className="text-xs uppercase tracking-widest text-muted mb-4">
            Get to Know Me
          </h3>
          <p className="text-sm text-muted/60 mb-4">
            Choose 3 albums that define you. Search and add them from the{" "}
            <Link href="/search" className="text-accent hover:underline">
              search page
            </Link>
            .
          </p>

          <div className="space-y-3">
            {[1, 2, 3].map((position) => {
              const item = gtkmItems.find((i) => i.position === position);
              const labels = [
                "The album that shaped me",
                "The one I keep coming back to",
                "The one that changed everything",
              ];

              return (
                <div
                  key={position}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                >
                  <span className="text-accent font-semibold text-lg w-6 text-center">
                    {position}
                  </span>
                  {item ? (
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.albums.title}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {item.albums.artist_name}
                      </p>
                      {item.story && (
                        <p className="text-xs text-muted/60 mt-1 italic truncate">
                          {item.story}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted/40 italic">
                      {labels[position - 1]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sign Out */}
        <div className="mt-12 pt-8 border-t border-border">
          <button
            onClick={handleSignOut}
            className="w-full py-3 border border-border text-muted rounded-xl hover:border-red-500/50 hover:text-red-400 transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
