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
  is_private: boolean;
  social_links: Record<string, string> | null;
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

interface BlockedUser {
  id: string;
  blocked_id: string;
  profiles: { username: string; display_name: string | null };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [socialLinks, setSocialLinks] = useState({ instagram: "", twitter: "", spotify: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gtkmItems, setGtkmItems] = useState<GtkmItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
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
        setIsPrivate(data.is_private || false);
        setSocialLinks({
          instagram: data.social_links?.instagram || "",
          twitter: data.social_links?.twitter || "",
          spotify: data.social_links?.spotify || "",
        });
      }

      // Get to Know Me items
      const { data: gtkm } = await supabase
        .from("get_to_know_me")
        .select("*, albums(*)")
        .eq("user_id", user.id)
        .order("position");
      if (gtkm) setGtkmItems(gtkm);

      // Blocked users
      const { data: blocked } = await supabase
        .from("blocked_users")
        .select("id, blocked_id, profiles:profiles!blocked_users_blocked_id_fkey(username, display_name)")
        .eq("blocker_id", user.id);
      if (blocked) setBlockedUsers(blocked as any);

      // Pending follow requests
      const { data: requests } = await supabase
        .from("follow_requests")
        .select("*, requester:profiles!follow_requests_requester_id_fkey(username, display_name, avatar_url)")
        .eq("target_id", user.id)
        .eq("status", "pending");
      if (requests) setPendingRequests(requests);
    });
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    const supabase = createClient();
    const links: Record<string, string> = {};
    if (socialLinks.instagram.trim()) links.instagram = socialLinks.instagram.trim();
    if (socialLinks.twitter.trim()) links.twitter = socialLinks.twitter.trim();
    if (socialLinks.spotify.trim()) links.spotify = socialLinks.spotify.trim();

    await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        is_private: isPrivate,
        social_links: Object.keys(links).length > 0 ? links : null,
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

  async function handleUnblock(blockedUserId: string) {
    const supabase = createClient();
    await supabase.from("blocked_users").delete().eq("blocker_id", profile!.id).eq("blocked_id", blockedUserId);
    setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== blockedUserId));
  }

  async function handleAcceptRequest(requestId: string, requesterId: string) {
    const supabase = createClient();
    // Accept: update request status and create follow
    await supabase.from("follow_requests").update({ status: "accepted" }).eq("id", requestId);
    await supabase.from("follows").insert({ follower_id: requesterId, following_id: profile!.id });
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  async function handleRejectRequest(requestId: string) {
    const supabase = createClient();
    await supabase.from("follow_requests").update({ status: "rejected" }).eq("id", requestId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
      <h2 className="text-xl font-semibold mb-8">Settings</h2>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center text-xl text-muted">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.username[0].toUpperCase()
            )}
          </div>
          <div>
            <p className="font-medium">@{profile.username}</p>
            <p className="text-xs text-muted/40">Username cannot be changed</p>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="One sentence about your relationship with music..."
            maxLength={160}
            rows={2}
            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 transition-colors resize-none"
          />
          <p className="text-right text-xs text-muted/30 mt-1">{bio.length}/160</p>
        </div>

        {/* Social Links */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted mb-2">Social Links</label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm w-6 text-center">📸</span>
              <input
                type="text"
                value={socialLinks.instagram}
                onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                placeholder="Instagram username"
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-6 text-center">𝕏</span>
              <input
                type="text"
                value={socialLinks.twitter}
                onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                placeholder="X / Twitter username"
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-6 text-center">🎧</span>
              <input
                type="text"
                value={socialLinks.spotify}
                onChange={(e) => setSocialLinks({ ...socialLinks, spotify: e.target.value })}
                placeholder="Spotify username"
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
          <div>
            <p className="text-sm font-medium">Private Profile</p>
            <p className="text-xs text-muted/60 mt-0.5">Only followers can see your collection</p>
          </div>
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className={`w-11 h-6 rounded-full transition-colors relative ${isPrivate ? "bg-accent" : "bg-border"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isPrivate ? "translate-x-5.5 left-[1px]" : "left-0.5"}`} />
          </button>
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

      {/* Pending Follow Requests */}
      {pendingRequests.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xs uppercase tracking-widest text-muted mb-4">Follow Requests</h3>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-sm text-muted shrink-0">
                  {req.requester?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.requester.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    req.requester?.username?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{req.requester?.display_name || req.requester?.username}</p>
                  <p className="text-xs text-muted">@{req.requester?.username}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req.id, req.requester_id)}
                    className="px-3 py-1 bg-accent text-white text-xs rounded-full hover:bg-accent-hover"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    className="px-3 py-1 border border-border text-xs text-muted rounded-full hover:text-red-400"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Get to Know Me */}
      <div className="mt-12">
        <h3 className="text-xs uppercase tracking-widest text-muted mb-4">Get to Know Me</h3>
        <p className="text-sm text-muted/60 mb-4">
          Choose 3 albums that define you. Search and add them from the{" "}
          <Link href="/search" className="text-accent hover:underline">search page</Link>.
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
              <div key={position} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                <span className="text-accent font-semibold text-lg w-6 text-center">{position}</span>
                {item ? (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.albums.title}</p>
                    <p className="text-xs text-muted truncate">{item.albums.artist_name}</p>
                    {item.story && <p className="text-xs text-muted/60 mt-1 italic truncate">{item.story}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted/40 italic">{labels[position - 1]}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked Users */}
      <div className="mt-12">
        <h3 className="text-xs uppercase tracking-widest text-muted mb-4">Blocked Users</h3>
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-muted/40">No blocked users.</p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                <div>
                  <p className="text-sm font-medium">{(b.profiles as any)?.display_name || (b.profiles as any)?.username}</p>
                  <p className="text-xs text-muted">@{(b.profiles as any)?.username}</p>
                </div>
                <button
                  onClick={() => handleUnblock(b.blocked_id)}
                  className="px-3 py-1 border border-border text-xs text-muted rounded-full hover:text-foreground"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
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
    </div>
  );
}
