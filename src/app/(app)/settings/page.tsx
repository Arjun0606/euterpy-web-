"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AvatarUploader from "@/components/profile/AvatarUploader";

const DELETE_CONFIRM_PHRASE = "DELETE";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
}

interface BlockedUser {
  id: string;
  blocked_id: string;
  profiles: { username: string; display_name: string | null } | null;
}

type Tab = "profile" | "privacy" | "requests";

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Delete-account flow state — gated behind a typed confirmation
  // dialog so it can never be triggered by an accidental click.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast("Profile saved");
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast("Privacy updated");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE) {
      toast.error(`Type ${DELETE_CONFIRM_PHRASE} to confirm.`);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Account deletion failed.");
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      toast("Account deleted.");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Couldn't delete account.");
      setDeleting(false);
    }
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

  const tabs: { id: Tab; label: string; description: string; badge?: number }[] = [
    { id: "profile", label: "Profile", description: "Avatar, display name, bio." },
    { id: "privacy", label: "Privacy", description: "Visibility, blocked users." },
    { id: "requests", label: "Requests", description: "Pending follow requests.", badge: pendingRequests.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* Page header */}
        <div className="mb-12 sm:mb-16">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-3">— Manage</p>
          <h1 className="font-display text-5xl sm:text-7xl tracking-tighter leading-[0.92]">
            Settings.
          </h1>
        </div>

        {/* Two-column layout: sidebar tab nav + content. Fills the
            full editorial canvas instead of a narrow centered column. */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-16">
          {/* Sidebar — sticky tab nav */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="flex lg:flex-col gap-1 lg:gap-0 overflow-x-auto no-scrollbar lg:border-r lg:border-border lg:pr-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`text-left px-4 py-3 lg:py-4 rounded-lg lg:rounded-none lg:border-l-2 lg:-ml-px transition-colors whitespace-nowrap lg:whitespace-normal ${
                    tab === t.id
                      ? "lg:border-accent text-foreground bg-card lg:bg-transparent"
                      : "lg:border-transparent text-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.label}</span>
                    {t.badge ? (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold">
                        {t.badge}
                      </span>
                    ) : null}
                  </span>
                  <p className="hidden lg:block text-[11px] text-zinc-600 mt-1 leading-relaxed italic editorial">
                    {t.description}
                  </p>
                </button>
              ))}
            </nav>
          </aside>

          {/* Right column — tab content + always-visible Account section */}
          <main className="min-w-0">
            {/* PROFILE TAB */}
            {tab === "profile" && (
              <section className="space-y-10 max-w-2xl">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-3">— Your portrait</p>
                  <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-[0.95] mb-3">
                    How you appear.
                  </h2>
                  <p className="editorial italic text-sm text-zinc-500 leading-relaxed">
                    The face, name, and one-line introduction other people see at the top of your page.
                  </p>
                </div>

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
                  <p className="text-zinc-200 font-mono text-base">@{profile.username}</p>
                  <p className="text-xs text-zinc-700 mt-1 italic">Username can&apos;t be changed.</p>
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
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
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
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/40 transition-colors resize-none"
                  />
                  <p className="text-right text-[11px] text-zinc-700 mt-1">{bio.length}/160</p>
                </div>

                {/* Quick link — manage the three */}
                <Link
                  href="/gtkm"
                  className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl hover:border-accent/30 transition-colors group"
                >
                  <div>
                    <p className="font-display text-lg tracking-tight">Manage your three albums</p>
                    <p className="text-xs text-zinc-500 mt-0.5 italic editorial">
                      Edit the Get to Know Me carousel that opens your profile.
                    </p>
                  </div>
                  <span className="text-zinc-600 group-hover:text-accent transition-colors text-xl">→</span>
                </Link>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full sm:w-auto px-8 py-3.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </section>
            )}

            {/* PRIVACY TAB */}
            {tab === "privacy" && (
              <section className="space-y-10 max-w-2xl">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-3">— Visibility</p>
                  <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-[0.95] mb-3">
                    Who can see you.
                  </h2>
                  <p className="editorial italic text-sm text-zinc-500 leading-relaxed">
                    Lock your profile so only people you accept can see your work, and manage anyone you&apos;ve blocked.
                  </p>
                </div>

                <div className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl">
                  <div>
                    <p className="text-sm font-medium">Private profile</p>
                    <p className="text-xs text-zinc-500 mt-1 italic">
                      Only followers can see your collection.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      isPrivate ? "bg-accent" : "bg-zinc-800"
                    }`}
                    aria-label={isPrivate ? "Make profile public" : "Make profile private"}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                        isPrivate ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Blocked users</label>
                  {blockedUsers.length === 0 ? (
                    <p className="text-sm text-zinc-700 italic">No blocked users.</p>
                  ) : (
                    <div className="space-y-2">
                      {blockedUsers.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
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
                  className="w-full sm:w-auto px-8 py-3.5 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save privacy"}
                </button>
              </section>
            )}

            {/* REQUESTS TAB */}
            {tab === "requests" && (
              <section className="space-y-6 max-w-2xl">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-3">— Letters at the door</p>
                  <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-[0.95] mb-3">
                    Pending requests.
                  </h2>
                  <p className="editorial italic text-sm text-zinc-500 leading-relaxed">
                    People who&apos;ve asked to follow your private profile. Only shown when your profile is private.
                  </p>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                    <p className="text-zinc-500 text-sm">No pending requests.</p>
                    <p className="text-xs text-zinc-700 mt-1 italic">
                      Follow requests show up here when your profile is private.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl">
                        <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-sm text-zinc-600 shrink-0 overflow-hidden">
                          {req.requester?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={req.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            req.requester?.username?.[0]?.toUpperCase() || "?"
                          )}
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
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ==========================================================
                ACCOUNT — always visible at the bottom of every tab.
                Sign Out is the routine action; Delete Account is the
                destructive one, gated behind a typed-confirmation dialog.
                ========================================================== */}
            <section className="mt-20 pt-12 border-t border-border max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mb-3">— Account</p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-[0.95] mb-3">
                The door.
              </h2>
              <p className="editorial italic text-sm text-zinc-500 leading-relaxed mb-8">
                Logging out signs you out of this device. Deleting your
                account is permanent — your profile, stories, lyric pins,
                lists, and collection are all removed and can&apos;t be recovered.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleSignOut}
                  className="w-full py-3.5 border border-border text-zinc-300 rounded-xl hover:border-zinc-600 hover:text-foreground transition-colors text-sm font-medium"
                >
                  Log out
                </button>

                <button
                  onClick={() => setDeleteOpen(true)}
                  className="w-full py-3.5 border border-red-900/50 text-red-400/80 rounded-xl hover:border-red-500/60 hover:text-red-400 hover:bg-red-950/10 transition-colors text-sm font-medium"
                >
                  Delete account
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => {
            if (!deleting) {
              setDeleteOpen(false);
              setDeleteConfirmText("");
            }
          }}
        >
          <div
            className="w-full max-w-md bg-background border border-border rounded-3xl p-7 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-red-400 font-semibold mb-4">
              — Permanent action
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-[0.95] mb-4">
              Delete your account?
            </h2>
            <p className="editorial italic text-sm text-zinc-400 leading-relaxed mb-6">
              Your profile, stories, lyric pins, lists, charts, collection,
              follows, marks, and echoes will all be removed permanently.
              This cannot be undone.
            </p>

            <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">
              Type <span className="text-foreground font-semibold">{DELETE_CONFIRM_PHRASE}</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              disabled={deleting}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-red-500/60 disabled:opacity-50"
              autoFocus
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmText("");
                }}
                disabled={deleting}
                className="flex-1 py-3 border border-border text-zinc-300 rounded-full text-sm font-medium hover:border-zinc-600 hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE}
                className="flex-1 py-3 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
