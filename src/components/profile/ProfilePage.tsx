"use client";

import { useState, useMemo } from "react";
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

  const shelfItems = useMemo(() => [
    ...ratings.map((r: any) => ({
      id: r.id, score: r.score, reaction: r.reaction, created_at: r.created_at,
      type: "album" as const, ownership: r.ownership,
      apple_id: r.albums?.apple_id, title: r.albums?.title,
      artist_name: r.albums?.artist_name, artwork_url: r.albums?.artwork_url,
      album_type: r.albums?.album_type || "album",
    })),
    ...songRatings.map((r: any) => ({
      id: r.id, score: r.score, reaction: r.reaction, created_at: r.created_at,
      type: "song" as const, ownership: null,
      apple_id: r.songs?.apple_id, title: r.songs?.title,
      artist_name: r.songs?.artist_name, artwork_url: r.songs?.artwork_url,
      album_name: r.songs?.album_name,
      album_type: "song",
    })),
  ].filter((item) => item.apple_id), [ratings, songRatings]);

  async function handleShare() {
    const url = `${window.location.origin}/${profile.username}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${profile.display_name || profile.username} on Euterpy`, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

        {/* ====== Profile Header ====== */}
        <div className="flex items-start gap-5 sm:gap-7 mb-12">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-card border border-border flex items-center justify-center shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-4xl sm:text-5xl text-zinc-600">{profile.username[0].toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl sm:text-5xl tracking-tight truncate leading-none mb-1">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-accent text-sm">@{profile.username}</p>

            {profile.bio && (
              <p className="editorial text-base text-zinc-300 mt-4 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Social links */}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="flex gap-4 mt-2">
                {Object.entries(profile.social_links).map(([platform, handle]: [string, any]) => {
                  if (!handle) return null;
                  const urls: Record<string, string> = { instagram: `https://instagram.com/${handle}`, twitter: `https://x.com/${handle}`, spotify: `https://open.spotify.com/user/${handle}` };
                  return (
                    <a key={platform} href={urls[platform] || "#"} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">{handle}</a>
                  );
                })}
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-5 mt-4 text-sm">
              <span className="text-zinc-500"><span className="text-white font-semibold">{profile.album_count}</span> albums</span>
              <span className="text-zinc-500"><span className="text-white font-semibold">{profile.follower_count}</span> followers</span>
              <span className="text-zinc-500"><span className="text-white font-semibold">{profile.following_count}</span> following</span>
            </div>

            {/* Badges */}
            {displayedBadges.length > 0 && (
              <div className="flex gap-2 mt-3">
                {displayedBadges.map((ub: any) => (
                  <span key={ub.id} className="text-lg" title={ub.badges?.name}>{ub.badges?.icon}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {isOwnProfile ? (
                <>
                  <a href="/settings" className="px-5 py-2 bg-card-hover text-zinc-200 text-xs font-medium rounded-full hover:bg-card-hover transition-colors">
                    Edit Profile
                  </a>
                  <button onClick={handleShare}
                    className="px-5 py-2 bg-card border border-border text-zinc-400 text-xs font-medium rounded-full hover:text-zinc-200 hover:border-zinc-700 transition-colors">
                    {copied ? "Copied!" : "Share"}
                  </button>
                </>
              ) : (
                <>
                  <FollowButton targetUserId={profile.id} />
                  <button onClick={handleShare}
                    className="px-5 py-2 bg-card border border-border text-zinc-400 text-xs font-medium rounded-full hover:text-zinc-200 hover:border-zinc-700 transition-colors">
                    {copied ? "Copied!" : "Share"}
                  </button>
                  <TasteMatch targetUserId={profile.id} />
                  <BlockButton targetUserId={profile.id} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* ====== Tabs ====== */}
        <div className="flex gap-1 border-b border-border mb-8">
          {([
            ["collection", isOwnProfile ? "My Collection" : "Collection"],
            ["stats", "Stats"],
            ["reviews", isOwnProfile ? "My Reviews" : "Reviews"],
          ] as [Tab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab ? "text-white" : "text-zinc-600 hover:text-zinc-300 transition-colors"
              }`}>
              {label}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />}
            </button>
          ))}
        </div>

        {/* ====== COLLECTION ====== */}
        {activeTab === "collection" && (
          <div>
            {/* QuickSearch — owner only, clean card */}
            {isOwnProfile && (
              <div className="mb-10">
                <QuickSearch />
              </div>
            )}

            {/* GTKM — only show if has items OR is owner */}
            {(getToKnowMe.length > 0 || isOwnProfile) && (
              <GetToKnowMe items={getToKnowMe} username={profile.username} isOwner={isOwnProfile} />
            )}

            {/* The Shelf */}
            {shelfItems.length > 0 && (
              <RecordShelf
                items={shelfItems}
                title="The Shelf"
                showSort={isOwnProfile || shelfItems.length > 5}
                shelfStyle={profile.shelf_style || "minimal"}
              />
            )}
            {shelfItems.length === 0 && isOwnProfile && (
              <div className="mb-10 text-center py-12 border border-dashed border-border rounded-2xl">
                <p className="text-zinc-500 text-sm">Your shelf is empty.</p>
                <p className="text-zinc-700 text-xs mt-1">Rate albums to start building your collection.</p>
              </div>
            )}

            {/* Curated Shelves */}
            {(shelves.length > 0 || isOwnProfile) && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">Shelves</h2>
                  {isOwnProfile && (
                    <button onClick={() => setShowNewShelf(true)} className="text-xs text-accent hover:underline">+ New</button>
                  )}
                </div>
                {shelves.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {shelves.map((shelf: any) => <ShelfCard key={shelf.id} shelf={shelf} />)}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-border rounded-2xl">
                    <p className="text-zinc-600 text-sm">No shelves yet.</p>
                  </div>
                )}
              </div>
            )}

            {showNewShelf && <ShelfEditor onClose={() => setShowNewShelf(false)} onSaved={() => window.location.reload()} />}
          </div>
        )}

        {/* ====== STATS ====== */}
        {activeTab === "stats" && (
          <div>
            {ratings.length === 0 && songRatings.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-500">No stats yet.</p>
                <p className="text-zinc-700 text-xs mt-2">Rate some albums to see your taste breakdown.</p>
              </div>
            ) : (
              <StatsView ratings={ratings} songRatings={songRatings} />
            )}
          </div>
        )}

        {/* ====== REVIEWS ====== */}
        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-500">No reviews yet.</p>
                <p className="text-zinc-700 text-xs mt-2">Write a review on any album or song page.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => {
                  const item = review.albums || review.songs;
                  const isAlbum = !!review.albums;
                  return (
                    <div key={review.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        {item?.artwork_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={artwork(item.artwork_url, 80)!} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item?.title}</p>
                          <p className="text-xs text-zinc-500">{item?.artist_name} · {isAlbum ? "Album" : "Song"}</p>
                        </div>
                        <Stars score={review.score} />
                      </div>
                      {review.title && <h3 className="font-semibold text-sm mb-1">{review.title}</h3>}
                      <p className="text-sm text-zinc-400 leading-relaxed">{review.body}</p>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        <span className="text-[11px] text-zinc-600">
                          {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {review.is_loved && <span className="text-[11px] text-accent font-medium">❤️ Users love this</span>}
                        <div className="flex-1" />
                        <span className="text-[11px] text-zinc-700">▲ {review.upvotes} · ▼ {review.downvotes}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-10 mt-10 border-t border-white/[0.03]">
          <p className="text-[11px] text-zinc-800">
            Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}
