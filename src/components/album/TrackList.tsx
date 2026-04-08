"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Stars from "@/components/ui/Stars";

interface Track {
  appleId: string;
  title: string;
  artistName: string;
  trackNumber: number;
  durationMs: number;
  artworkUrl: string;
}

interface SongRating {
  song_id: string;
  score: number;
  reaction: string | null;
  songs: {
    apple_id: string;
  };
}

interface Props {
  albumAppleId: string;
  songRatings?: SongRating[];
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TrackList({ albumAppleId, songRatings = [] }: Props) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchTracks() {
      try {
        const res = await fetch(`/api/albums/${albumAppleId}/tracks`);
        const data = await res.json();
        setTracks(data.tracks || []);
      } catch {
        setTracks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTracks();
  }, [albumAppleId]);

  if (loading) {
    return (
      <div className="mb-10">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">
          Tracks
        </h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-card rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (tracks.length === 0) return null;

  // Map song ratings by apple_id for quick lookup
  const ratingsByAppleId = new Map<string, SongRating>();
  for (const sr of songRatings) {
    if (sr.songs?.apple_id) {
      ratingsByAppleId.set(sr.songs.apple_id, sr);
    }
  }

  return (
    <div className="mb-10">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">
        Tracks
      </h2>

      <div className="border border-border rounded-xl overflow-hidden">
        {(expanded ? tracks : tracks.slice(0, 6)).map((track, index, arr) => {
          const rating = ratingsByAppleId.get(track.appleId);
          const isLast = index === arr.length - 1 && (expanded || tracks.length <= 6);

          return (
            <Link
              key={track.appleId}
              href={`/song/${track.appleId}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-card-hover transition-colors group ${
                !isLast ? "border-b border-border/50" : ""
              }`}
            >
              {/* Track number */}
              <span className="w-6 text-right text-xs text-muted/40 shrink-0 tabular-nums group-hover:text-accent transition-colors">
                {track.trackNumber}
              </span>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{track.title}</p>
                {track.artistName && (
                  <p className="text-xs text-muted/60 truncate">
                    {track.artistName}
                  </p>
                )}
              </div>

              {/* User rating for this track */}
              {rating && <Stars score={rating.score} size="sm" />}

              {/* Duration */}
              <span className="text-xs text-muted/40 tabular-nums shrink-0">
                {formatDuration(track.durationMs)}
              </span>
            </Link>
          );
        })}
        {tracks.length > 6 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-4 py-2.5 text-xs text-zinc-500 hover:text-accent border-t border-border/50 transition-colors"
          >
            {expanded ? "Show less" : `Show all ${tracks.length} tracks`}
          </button>
        )}
      </div>
    </div>
  );
}
