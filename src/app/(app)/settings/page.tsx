"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AvatarUploader from "@/components/profile/AvatarUploader";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  shelf_style?: "minimal" | "wood" | "ornate" | "glass";
  social_links: Record<string, string> | null;
}

interface BlockedUser {
  id: string;
  blocked_id: string;
  profiles: { username: string; display_name: string | null } | null;
}

type Tab = "profile" | "appearance" | "privacy" | "requests";

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [shelfStyle, setShelfStyle] = useState<"minimal" | "wood" | "ornate" | "glass">("minimal");
  const [socialLinks, setSocialLinks] = useState({ instagram: "", twitter: "", spotify: "" });
  const [saving, setSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url);
        setIsPrivate(data.is_private || false);
        setShelfStyle(data.shelf_style || "minimal");
        setSocialLinks({
          instagram: data.social_links?.instagram || "",
          twitter: data.social_links?.twitter || "",
          spotify: data.social_links?.spotify || "",
        });
      }

      const { data: blocked } = await supabase
        .from("blocked_users")
        .select("id, blocked_id, profiles:profiles!blocked_users_blocked_id_fkey(username, display_name)")
        .eq("blocker_id", user.id);
      if (blocked) setBlockedUsers(blocked as any);

      const { data: requests } = await supabase
        .from("follow_requests")
        .select("*, requester:profiles!follow_requests_requester_id_fkey(username, display_name, avatar_url)")
        .eq("target_id", user.id)
        .eq("status", "pending");
      if (requests) setPendingRequests(requests);
    });
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    const links: Record<string, string> = {};
    if (socialLinks.instagram.trim()) links.instagram = socialLinks.instagram.trim();
    if (socialLinks.twitter.trim()) links.twitter = socialLinks.twitter.trim();
    if (socialLinks.spotify.trim()) links.spotify = socialLinks.spotify.trim();

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        social_links: Object.keys(links).length > 0 ? links : null,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast("Profile saved");
  }

  async function saveAppearance() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ shelf_style: shelfStyle })
      .eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast("Saved");
  }

  async function savePrivacy() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_private: isPrivate })
      .eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast("Privacy updated");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleUnblock(blockedId: string) {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from("blocked_users").delete().eq("blocker_id", profile.id).eq("blocked_id", blockedId);
    setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== blockedId));
    toast("Unblocked");
  }

  async function handleAcceptRequest(requestId: string, requesterId: string) {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from("follow_requests").update({ status: "accepted" }).eq("id", requestId);
    await supabase.from("follows").insert({ follower_id: requesterId, following_id: profile.id });
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    toast("Accepted");
  }

  async function handleRejectRequest(requestId: string) {
    const supabase = createClient();
    await supabase.from("follow_requests").update({ status: "rejected" }).eq("id", requestId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Loading...</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "profile", label: "Profile" },
    { id: "appearance", label: "Appearance" },
    { id: "privacy", label: "Privacy" },
    { id: "requests", label: "Requests", badge: pendingRequests.length },
  ];

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Manage</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-10 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? "text-white" : "text-zinc-600 hover:text-zinc-300"
            }`}
          >
            <span className="flex items-center gap-2">
              {t.label}
              {t.badge ? (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold">
                  {t.badge}
                </span>
              ) : null}
            </span>
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />}
          </button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {tab === "profile" && (
        <div className="space-y-8">
          {/* Avatar */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Profile Picture</label>
            <AvatarUploader
              userId={profile.id}
              currentUrl={avatarUrl}
              username={profile.username}
              onUploaded={(url) => setAvatarUrl(url || null)}
            />
          </div>

          {/* Username (read-only) */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Username</label>
            <p className="text-zinc-200 font-mono">@{profile.username}</p>
            <p className="text-xs text-zinc-700 mt-1">Username can&apos;t be changed</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Display Name</label>
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
            <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="One line about your relationship with music..."
              maxLength={160}
              rows={2}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 transition-colors resize-none"
            />
            <p className="text-right text-[11px] text-zinc-700 mt-1">{bio.length}/160</p>
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Social Links</label>
            <div className="space-y-2">
              {[
                { key: "instagram", icon: "📸", placeholder: "Instagram username" },
                { key: "twitter", icon: "𝕏", placeholder: "X / Twitter username" },
                { key: "spotify", icon: "🎧", placeholder: "Spotify username" },
              ].map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="text-sm w-6 text-center">{s.icon}</span>
                  <input
                    type="text"
                    value={(socialLinks as any)[s.key]}
                    onChange={(e) => setSocialLinks({ ...socialLinks, [s.key]: e.target.value })}
                    placeholder={s.placeholder}
                    className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm placeholder:text-muted/50 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="pt-4 border-t border-border">
            <Link href="/gtkm" className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-zinc-700 transition-colors group">
              <div>
                <p className="text-sm font-medium">Manage your three albums</p>
                <p className="text-xs text-zinc-600 mt-0.5">Edit your Get to Know Me carousel</p>
              </div>
              <span className="text-zinc-600 group-hover:text-accent transition-colors">→</span>
            </Link>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <div className="pt-4">
            <button onClick={handleSignOut} className="w-full py-3 border border-border text-zinc-500 rounded-xl hover:border-red-500/50 hover:text-red-400 transition-colors text-sm">
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* APPEARANCE TAB */}
      {tab === "appearance" && (
        <div className="space-y-8">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Shelf Style</label>
            <p className="text-xs text-zinc-600 mb-4">How your record shelf looks on your profile.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { id: "minimal" as const, label: "Minimal" },
                { id: "wood" as const, label: "Wood" },
                { id: "ornate" as const, label: "Marble" },
                { id: "glass" as const, label: "Glass" },
              ]).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShelfStyle(s.id)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    shelfStyle === s.id ? "border-accent bg-accent/5" : "border-border bg-card hover:border-zinc-700"
                  }`}
                >
                  <div className="h-8 mb-3 flex items-end">
                    <div
                      className="w-full rounded"
                      style={
                        s.id === "minimal" ? { background: "linear-gradient(to bottom, #2a2a2a, #111)", height: "5px" }
                        : s.id === "wood" ? { background: "linear-gradient(to bottom, #d49060, #4a2810)", height: "8px" }
                        : s.id === "ornate" ? { background: "linear-gradient(to bottom, #2a2a2e, #0f0f11)", height: "6px", boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }
                        : { background: "linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(255,255,255,0.05))", height: "6px", border: "1px solid rgba(255,255,255,0.15)" }
                      }
                    />
                  </div>
                  <p className={`text-xs font-medium ${shelfStyle === s.id ? "text-accent" : "text-zinc-400"}`}>{s.label}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveAppearance}
            disabled={saving}
            className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Appearance"}
          </button>
        </div>
      )}

      {/* PRIVACY TAB */}
      {tab === "privacy" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
            <div>
              <p className="text-sm font-medium">Private Profile</p>
              <p className="text-xs text-zinc-600 mt-0.5">Only followers can see your collection</p>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-11 h-6 rounded-full transition-colors relative ${isPrivate ? "bg-accent" : "bg-zinc-800"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isPrivate ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Blocked Users</label>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-zinc-700 italic">No blocked users.</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                    <div>
                      <p className="text-sm font-medium">{b.profiles?.display_name || b.profiles?.username}</p>
                      <p className="text-xs text-zinc-600">@{b.profiles?.username}</p>
                    </div>
                    <button
                      onClick={() => handleUnblock(b.blocked_id)}
                      className="px-3 py-1 border border-border text-xs text-zinc-400 rounded-full hover:text-foreground transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={savePrivacy}
            disabled={saving}
            className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Privacy"}
          </button>
        </div>
      )}

      {/* REQUESTS TAB */}
      {tab === "requests" && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl">
              <p className="text-zinc-500 text-sm">No pending requests</p>
              <p className="text-xs text-zinc-700 mt-1">Follow requests show up here when your profile is private.</p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-sm text-zinc-600 shrink-0 overflow-hidden">
                  {req.requester?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : req.requester?.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{req.requester?.display_name || req.requester?.username}</p>
                  <p className="text-xs text-zinc-600">@{req.requester?.username}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req.id, req.requester_id)}
                    className="px-4 py-1.5 bg-accent text-white text-xs rounded-full hover:bg-accent-hover transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    className="px-4 py-1.5 border border-border text-xs text-zinc-500 rounded-full hover:text-red-400 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
