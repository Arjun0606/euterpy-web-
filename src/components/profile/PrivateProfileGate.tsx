"use client";

import FollowButton from "@/components/ui/FollowButton";

interface Props {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    follower_count: number;
    following_count: number;
    album_count: number;
    is_private: boolean;
  };
  requestPending: boolean;
}

export default function PrivateProfileGate({ profile, requestPending }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-card border-2 border-border flex items-center justify-center text-3xl text-muted mb-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="font-display">{profile.username[0].toUpperCase()}</span>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl font-semibold">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-accent text-sm">@{profile.username}</p>

          {profile.bio && (
            <p className="text-muted mt-2 text-sm leading-relaxed italic max-w-sm">
              &ldquo;{profile.bio}&rdquo;
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-6 mt-4 text-sm text-muted">
            <span><strong className="text-foreground">{profile.album_count}</strong> albums</span>
            <span><strong className="text-foreground">{profile.follower_count}</strong> followers</span>
            <span><strong className="text-foreground">{profile.following_count}</strong> following</span>
          </div>

          {/* Private notice */}
          <div className="mt-8 p-6 border border-border rounded-xl bg-card/50 max-w-sm">
            <div className="text-2xl mb-3">🔒</div>
            <p className="text-sm font-medium mb-1">This account is private</p>
            <p className="text-xs text-muted/60 mb-4">Follow this account to see their collection, stats, and reviews.</p>
            {requestPending ? (
              <div className="px-5 py-2 border border-border rounded-full text-sm text-muted">
                Requested
              </div>
            ) : (
              <FollowButton targetUserId={profile.id} isPrivate />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
