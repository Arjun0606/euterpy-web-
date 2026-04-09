"use client";

import { useState, useMemo } from "react";
import { getArtworkUrl } from "@/lib/apple-music/client";
import GetToKnowMe from "./GetToKnowMe";
import ThreeShareCard from "./ThreeShareCard";
import RecordShelf from "./RecordShelf";
import { isCurator, curatorLabel } from "@/lib/curator";
import QuickSearch from "./QuickSearch";
import Stars from "@/components/ui/Stars";
import FollowButton from "@/components/ui/FollowButton";
import TasteMatch from "./TasteMatch";
import BlockButton from "./BlockButton";
import IdentityStats from "@/components/stats/IdentityStats";
import StoriesSection from "@/components/story/StoriesSection";
import LyricPinsSection from "./LyricPinsSection";
import ListsSection from "@/components/list/ListsSection";
import ChartSection from "@/components/chart/ChartSection";

type Tab = "collection" | "stats" | "stories";

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
    stories: any[];
    lyricPins: any[];
    lists: any[];
    charts: any[];
    badges: any[];
    mutuals?: any[];
    mostMarkedStory?: any | null;
    socialCounts?: {
      stories: number;
      lyricPins: number;
      lists: number;
      charts: number;
      marksGiven: number;
      marksReceived: number;
      echoesGiven: number;
      echoesReceived: number;
      followers?: number;
      following?: number;
    };
  };
}

export default function ProfilePage({ data }: Props) {
  const { profile, currentUserId, getToKnowMe, ratings, songRatings, stories, lyricPins, lists, charts, badges, mutuals = [], socialCounts, mostMarkedStory } = data;
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [copied, setCopied] = useState(false);

  const displayedBadges = badges.filter((b: any) => b.is_displayed).slice(0, 5);
  const isOwnProfile = currentUserId === profile.id;

  // Curator status — derived from actual portfolio counts. Shown to
  // visitors as a small editorial eyebrow under the username; hidden
  // from the owner themselves so it doesn't feel performative.
  const curatorInputs = {
    storyCount: socialCounts?.stories ?? stories.length,
    lyricCount: socialCounts?.lyricPins ?? lyricPins.length,
    listCount: socialCounts?.lists ?? lists.length,
    marksReceived: socialCounts?.marksReceived ?? 0,
  };
  const showCuratorTag = !isOwnProfile && isCurator(curatorInputs);
  const curatorTagText = showCuratorTag ? curatorLabel(curatorInputs) : null;

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
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

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
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl sm:text-5xl tracking-tight truncate leading-none mb-1">
                {profile.display_name || profile.username}
              </h1>
              {isOwnProfile && (
                <a href="/settings" aria-label="Edit profile"
                  className="shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-zinc-500 hover:text-accent hover:border-zinc-700 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </a>
              )}
            </div>
            <p className="text-accent text-sm">@{profile.username}</p>

            {curatorTagText && (
              <p className="mt-2 inline-flex items-center text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-semibold">
                — {curatorTagText}
              </p>
            )}

            {profile.bio && (
              <p className="editorial text-base text-zinc-300 mt-4 leading-relaxed">
                {profile.bio}
              </p>
            )}


            {/* Stats — engagement counts hidden from public view by design.
                Cosmos.fm playbook: show the work, not the score. Owners see
                their own numbers (so they're not flying blind), visitors see
                navigable links without the leaderboard psychology. */}
            <div className="flex gap-5 mt-4 text-sm">
              <span className="text-zinc-500">
                <span className="text-white font-semibold">{profile.album_count}</span> albums
              </span>
              <a
                href={`/${profile.username}/followers`}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {isOwnProfile ? (
                  <>
                    <span className="text-white font-semibold">{profile.follower_count}</span> followers
                  </>
                ) : (
                  "Followers"
                )}
              </a>
              <a
                href={`/${profile.username}/following`}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {isOwnProfile ? (
                  <>
                    <span className="text-white font-semibold">{profile.following_count}</span> following
                  </>
                ) : (
                  "Following"
                )}
              </a>
            </div>

            {/* Badges */}
            {displayedBadges.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                {displayedBadges.map((ub: any) => (
                  <span key={ub.id} className="text-lg" title={ub.badges?.name}>{ub.badges?.icon}</span>
                ))}
                {badges.length > displayedBadges.length && (
                  <span className="text-[10px] text-zinc-600 ml-1">+{badges.length - displayedBadges.length} more</span>
                )}
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

        {/* ====== Mutuals — only when viewing someone else ====== */}
        {/* The whole strip is one big link to the dedicated mutuals page,
            where each shared connection shows up as a magazine-grade
            portrait via FollowList. */}
        {!isOwnProfile && mutuals.length > 0 && (
          <a
            href={`/${profile.username}/mutuals`}
            className="group block mb-10 p-4 bg-card border border-border rounded-2xl hover:border-accent/30 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-3 group-hover:text-accent transition-colors">
              — {mutuals.length} mutual{mutuals.length === 1 ? "" : "s"} →
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex -space-x-2">
                {mutuals.slice(0, 5).map((m: any) => (
                  <div
                    key={m.id}
                    title={m.display_name || m.username}
                    className="w-8 h-8 rounded-full bg-background border-2 border-card overflow-hidden flex items-center justify-center text-[10px] text-zinc-600"
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.username[0].toUpperCase()
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 ml-2">
                Followed by{" "}
                {mutuals.slice(0, 2).map((m: any, i: number) => (
                  <span key={m.id}>
                    {i > 0 && ", "}
                    <span className="text-zinc-300 font-medium">{m.display_name || m.username}</span>
                  </span>
                ))}
                {mutuals.length > 2 && (
                  <span className="text-zinc-600">
                    {" "}and {mutuals.length - 2} other{mutuals.length - 2 === 1 ? "" : "s"} you follow
                  </span>
                )}
              </p>
            </div>
          </a>
        )}

        {/* ====== Tabs ====== */}
        <div className="flex gap-1 border-b border-border mb-8">
          {([
            ["collection", isOwnProfile ? "My Collection" : "Collection"],
            ["stories", isOwnProfile ? "My Stories" : "Stories"],
            ["stats", "Stats"],
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

            {/* The Three share card — owner only, only when all 3 slots filled.
                This is the highest-leverage viral artifact in the product. */}
            {isOwnProfile && getToKnowMe.length === 3 && (
              <ThreeShareCard username={profile.username} />
            )}

            {/* Chart — my ten right now */}
            <ChartSection charts={charts} username={profile.username} isOwner={isOwnProfile} ownerId={profile.id} />

            {/* Lyric pins */}
            <LyricPinsSection pins={lyricPins} isOwner={isOwnProfile} ownerId={profile.id} />

            {/* Lists */}
            <ListsSection lists={lists} isOwner={isOwnProfile} />

            {/* Collection — every album/song you've added in one place */}
            {shelfItems.length > 0 && (
              <RecordShelf
                items={shelfItems}
                title="Collection"
                showSort={isOwnProfile || shelfItems.length > 5}
              />
            )}
            {shelfItems.length === 0 && isOwnProfile && (
              <div className="mb-10 text-center py-14 border border-dashed border-border rounded-2xl">
                <p className="font-display text-3xl mb-2">Your collection is yours.</p>
                <p className="text-zinc-500 text-sm mb-5 max-w-sm mx-auto">
                  Every album you collect lives here. Find one and add it to make this page yours.
                </p>
                <a href="/discover" className="inline-block px-6 py-2.5 bg-accent text-white rounded-full text-xs font-medium hover:bg-accent-hover transition-colors">
                  Find an album →
                </a>
              </div>
            )}
          </div>
        )}

        {/* ====== STATS — the magazine portrait ====== */}
        {activeTab === "stats" && (
          <div>
            <IdentityStats
              username={profile.username}
              displayName={profile.display_name || profile.username}
              ratings={ratings}
              songRatings={songRatings}
              stories={stories}
              mostMarkedStory={mostMarkedStory}
              counts={socialCounts || {
                stories: stories.length,
                lyricPins: lyricPins.length,
                lists: lists.length,
                charts: charts.length,
                marksGiven: 0,
                marksReceived: 0,
                echoesGiven: 0,
                echoesReceived: 0,
              }}
            />
          </div>
        )}

        {/* ====== STORIES ====== */}
        {activeTab === "stories" && (
          <div>
            {stories.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-2xl">
                <p className="font-display text-3xl mb-2">{isOwnProfile ? "Your stories will live here." : "No stories yet."}</p>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                  {isOwnProfile
                    ? "Open any album, song, or artist and tap \u2018Tell its story\u2019 to write."
                    : "When they share what music means to them, you\u2019ll find it here."}
                </p>
                {isOwnProfile && (
                  <a
                    href="/search"
                    className="inline-block mt-6 px-6 py-2.5 bg-accent text-white rounded-full text-xs font-medium hover:bg-accent-hover transition-colors"
                  >
                    Find something to write about
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {stories.map((story: any) => {
                  const cover = artwork(story.target_artwork_url, 200);
                  const preview = story.body.length > 280 ? story.body.slice(0, 280).trimEnd() + "\u2026" : story.body;
                  return (
                    <a key={story.id} href={`/story/${story.id}`} className="block group border-b border-white/[0.04] pb-8">
                      {/* Subject pill */}
                      <div className="flex items-center gap-3 mb-4">
                        {cover && (
                          <div className={`${story.kind === "artist" ? "rounded-full" : "rounded-md"} w-10 h-10 overflow-hidden border border-white/[0.06] shrink-0`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cover} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-accent">on a {story.kind}</p>
                          <p className="text-sm text-zinc-400 truncate">
                            {story.target_title}
                            {story.target_artist && story.kind !== "artist" && <span className="text-zinc-600"> · {story.target_artist}</span>}
                          </p>
                        </div>
                        <span className="ml-auto text-[10px] text-zinc-700">
                          {new Date(story.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      {story.headline && (
                        <h3 className="font-display text-2xl sm:text-3xl tracking-tight leading-tight mb-3 group-hover:text-accent transition-colors">
                          {story.headline}
                        </h3>
                      )}
                      <p className="editorial text-base text-zinc-400 leading-relaxed line-clamp-4 group-hover:text-zinc-300 transition-colors">
                        {preview}
                      </p>
                      <p className="text-[11px] text-zinc-700 mt-3 group-hover:text-accent transition-colors">Read more \u2192</p>
                    </a>
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
