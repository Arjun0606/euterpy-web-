"use client";

import { useState } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";
import GetToKnowMe from "./GetToKnowMe";
import RecordShelf from "./RecordShelf";
import ShelfCard from "./ShelfCard";
import QuickSearch from "./QuickSearch";
import Stars from "@/components/ui/Stars";
import FollowButton from "@/components/ui/FollowButton";
import TasteMatch from "./TasteMatch";
import ShelfEditor from "./ShelfEditor";
import BlockButton from "./BlockButton";
import StatsView from "@/components/stats/StatsView";

type Tab = "collection" | "stats" | "reviews";

function artwork(url: string | null, size = 500): string | null {
  if (!url) return null;
  return getArtworkUrl(url, size, size);
}

interface Props {
  data: {
    profile: any;
    currentUserId: string | null;
    getToKnowMe: any[];
    ratings: any[];
    songRatings: any[];
    shelves: any[];
    reviews: any[];
    badges: any[];
  };
}

export default function ProfilePage({ data }: Props) {
  const { profile, currentUserId, getToKnowMe, ratings, songRatings, shelves, reviews, badges } = data;
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [copied, setCopied] = useState(false);
  const [showNewShelf, setShowNewShelf] = useState(false);

  const displayedBadges = badges.filter((b: any) => b.is_displayed).slice(0, 5);
  const isOwnProfile = currentUserId === profile.id;

  // Unify albums + songs into one shelf
  const shelfItems = [
    ...ratings.map((r: any) => ({
      id: r.id,
      score: r.score,
      reaction: r.reaction,
      created_at: r.created_at,
      type: "album" as const,
      ownership: r.ownership,
      apple_id: r.albums?.apple_id,
      title: r.albums?.title,
      artist_name: r.albums?.artist_name,
      artwork_url: r.albums?.artwork_url,
    })),
    ...songRatings.map((r: any) => ({
      id: r.id,
      score: r.score,
      reaction: r.reaction,
      created_at: r.created_at,
      type: "song" as const,
      ownership: null,
      apple_id: r.songs?.apple_id,
      title: r.songs?.title,
      artist_name: r.songs?.artist_name,
      artwork_url: r.songs?.artwork_url,
      album_name: r.songs?.album_name,
    })),
  ].filter((item) => item.apple_id);

  async function handleShare() {
    const url = `${window.location.origin}/${profile.username}`;
    const shareData = {
      title: `${profile.display_name || profile.username} on Euterpy`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* ====== Profile Header ====== */}
        <div className="flex items-start gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-card border-2 border-border flex items-center justify-center text-2xl text-muted shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="font-display text-3xl">{profile.username[0].toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold truncate">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-accent text-sm">@{profile.username}</p>

            {profile.bio && (
              <p className="text-muted mt-2 text-sm leading-relaxed italic">
                &ldquo;{profile.bio}&rdquo;
              </p>
            )}

            {/* Social links */}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="flex gap-3 mt-2">
                {Object.entries(profile.social_links).map(([platform, handle]: [string, any]) => {
                  if (!handle) return null;
                  const urls: Record<string, string> = {
                    instagram: `https://instagram.com/${handle}`,
                    twitter: `https://x.com/${handle}`,
                    spotify: `https://open.spotify.com/user/${handle}`,
                  };
                  const icons: Record<string, string> = { instagram: "📸", twitter: "𝕏", spotify: "🎧" };
                  return (
                    <a
                      key={platform}
                      href={urls[platform] || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted/60 hover:text-accent transition-colors"
                    >
                      {icons[platform] || "🔗"} {handle}
                    </a>
                  );
                })}
              </div>
            )}

            {/* Stats row */}
            <div className="flex gap-4 mt-3 text-sm text-muted">
              <span><strong className="text-foreground">{profile.album_count}</strong> albums</span>
              <span><strong className="text-foreground">{profile.follower_count}</strong> followers</span>
              <span><strong className="text-foreground">{profile.following_count}</strong> following</span>
            </div>

            {/* Badges */}
            {displayedBadges.length > 0 && (
              <div className="flex gap-2 mt-3">
                {displayedBadges.map((ub: any) => (
                  <span key={ub.id} className="text-lg" title={ub.badges?.name}>
                    {ub.badges?.icon}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={handleShare}
                    className="px-4 py-1.5 bg-accent text-white text-xs font-medium rounded-full hover:bg-accent-hover transition-colors"
                  >
                    {copied ? "Link Copied!" : "Share Profile"}
                  </button>
                  <a href="/settings" className="px-4 py-1.5 border border-border text-xs text-muted rounded-full hover:text-foreground hover:border-foreground/20 transition-colors">
                    Edit Profile
                  </a>
                </>
              ) : (
                <>
                  <FollowButton targetUserId={profile.id} />
                  <button
                    onClick={handleShare}
                    className="px-4 py-1.5 border border-border text-xs text-muted rounded-full hover:text-foreground hover:border-foreground/20 transition-colors"
                  >
                    {copied ? "Copied!" : "Share"}
                  </button>
                  <TasteMatch targetUserId={profile.id} />
                  <BlockButton targetUserId={profile.id} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* ====== Sub-menu Tabs ====== */}
        <div className="flex border-b border-border mb-6">
          {([
            ["collection", isOwnProfile ? "My Collection" : "Collection"],
            ["stats", "Stats"],
            ["reviews", isOwnProfile ? "My Reviews" : "Reviews"],
          ] as [Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? "text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* ====== Tab Content ====== */}

        {/* COLLECTION TAB */}
        {activeTab === "collection" && (
          <div>
            {/* Quick Search + Rate (only on own profile) */}
            {isOwnProfile && <QuickSearch />}

            {/* Get to Know Me — the hero carousel */}
            <GetToKnowMe items={getToKnowMe} username={profile.username} />

            {/* The Shelf — ALL rated albums + songs, unified */}
            <RecordShelf items={shelfItems} title="The Shelf" />

            {/* Custom Shelves */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-widest text-muted">Curated Shelves</h2>
                {isOwnProfile && (
                  <button
                    onClick={() => setShowNewShelf(true)}
                    className="text-xs text-accent hover:underline"
                  >
                    + New Shelf
                  </button>
                )}
              </div>
              {shelves.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {shelves.map((shelf: any) => (
                    <ShelfCard key={shelf.id} shelf={shelf} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-border rounded-xl">
                  <p className="text-muted text-sm">No curated shelves yet.</p>
                  {isOwnProfile && <p className="text-xs text-muted/60 mt-1">Create themed shelves to organize your collection.</p>}
                </div>
              )}
            </div>

            {showNewShelf && (
              <ShelfEditor
                onClose={() => setShowNewShelf(false)}
                onSaved={() => window.location.reload()}
              />
            )}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === "stats" && (
          <div>
            {ratings.length === 0 && songRatings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted">No stats yet.</p>
                <p className="text-sm text-muted/60 mt-2">Rate some albums to see your taste breakdown.</p>
              </div>
            ) : (
              <StatsView ratings={ratings} songRatings={songRatings} />
            )}
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted">No reviews yet.</p>
                <p className="text-sm text-muted/60 mt-2">Write a review on any album or song page.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => {
                  const item = review.albums || review.songs;
                  const isAlbum = !!review.albums;
                  return (
                    <div key={review.id} className="bg-card border border-border rounded-xl p-5">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        {item?.artwork_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={artwork(item.artwork_url, 80)!} alt="" className="w-10 h-10 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item?.title}</p>
                          <p className="text-xs text-muted">{item?.artist_name} · {isAlbum ? "Album" : "Song"}</p>
                        </div>
                        <Stars score={review.score} />
                      </div>

                      {/* Review content */}
                      {review.title && (
                        <h3 className="font-semibold text-sm mb-1">{review.title}</h3>
                      )}
                      <p className="text-sm text-muted leading-relaxed">{review.body}</p>

                      {/* Footer */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs text-muted/60">
                          {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {review.is_loved && (
                          <span className="text-xs text-accent font-medium">❤️ Users love this</span>
                        )}
                        <div className="flex-1" />
                        <span className="text-xs text-muted/40">
                          ▲ {review.upvotes} · ▼ {review.downvotes}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 mt-8 border-t border-border">
          <p className="text-xs text-muted/40">
            Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}
