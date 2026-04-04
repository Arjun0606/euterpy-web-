"use client";

import { useState, useMemo } from "react";
import TopArtistsChart from "./TopArtistsChart";
import GenreChart from "./GenreChart";
import SongLengthPie from "./SongLengthPie";
import OwnershipPie from "./OwnershipPie";
import RatingDistribution from "./RatingDistribution";
import DecadeChart from "./DecadeChart";
import ListeningStats from "./ListeningStats";

interface Album {
  apple_id: string;
  title: string;
  artist_name: string;
  release_date: string | null;
  genre_names: string[] | null;
  track_count: number | null;
}

interface Song {
  apple_id: string;
  title: string;
  artist_name: string;
  album_name: string | null;
  duration_ms: number | null;
  genre_names: string[] | null;
}

interface Rating {
  id: string;
  score: number;
  reaction: string | null;
  ownership?: string;
  albums: Album;
}

interface SongRating {
  id: string;
  score: number;
  reaction: string | null;
  songs: Song;
}

interface Props {
  ratings: Rating[];
  songRatings: SongRating[];
}

export default function StatsView({ ratings, songRatings }: Props) {
  const [viewMode, setViewMode] = useState<"album" | "song">("album");

  // ============================================================
  // Computed stats
  // ============================================================

  const stats = useMemo(() => {
    // Top artists by album count
    const artistAlbumCounts: Record<string, number> = {};
    for (const r of ratings) {
      const artist = r.albums.artist_name;
      artistAlbumCounts[artist] = (artistAlbumCounts[artist] || 0) + 1;
    }

    // Top artists by song count
    const artistSongCounts: Record<string, number> = {};
    for (const sr of songRatings) {
      const artist = sr.songs.artist_name;
      artistSongCounts[artist] = (artistSongCounts[artist] || 0) + 1;
    }

    // Genre distribution (from albums)
    const genreCounts: Record<string, number> = {};
    for (const r of ratings) {
      const genres = r.albums.genre_names || [];
      for (const g of genres) {
        if (g !== "Music") {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        }
      }
    }

    // Song length distribution
    let under3 = 0;
    let between3and5 = 0;
    let over5 = 0;
    for (const sr of songRatings) {
      const ms = sr.songs.duration_ms;
      if (!ms) continue;
      const mins = ms / 60000;
      if (mins < 3) under3++;
      else if (mins <= 5) between3and5++;
      else over5++;
    }

    // Ownership distribution
    const ownershipCounts: Record<string, number> = {
      vinyl: 0,
      cd: 0,
      cassette: 0,
      digital: 0,
    };
    for (const r of ratings) {
      const type = r.ownership || "digital";
      ownershipCounts[type] = (ownershipCounts[type] || 0) + 1;
    }

    // Total minutes listened (estimated from songs)
    let totalMinutes = 0;
    for (const sr of songRatings) {
      if (sr.songs.duration_ms) {
        totalMinutes += sr.songs.duration_ms / 60000;
      }
    }

    // Minutes by genre
    const genreMinutes: Record<string, number> = {};
    for (const sr of songRatings) {
      const genres = sr.songs.genre_names || [];
      const mins = (sr.songs.duration_ms || 0) / 60000;
      for (const g of genres) {
        if (g !== "Music") {
          genreMinutes[g] = (genreMinutes[g] || 0) + mins;
        }
      }
    }

    // Rating distribution (albums)
    const albumRatingDist: Record<string, number> = {};
    for (const r of ratings) {
      const key = r.score.toString();
      albumRatingDist[key] = (albumRatingDist[key] || 0) + 1;
    }

    // Rating distribution (songs)
    const songRatingDist: Record<string, number> = {};
    for (const sr of songRatings) {
      const key = sr.score.toString();
      songRatingDist[key] = (songRatingDist[key] || 0) + 1;
    }

    // Decade distribution (albums)
    const albumDecades: Record<string, number> = {};
    for (const r of ratings) {
      if (r.albums.release_date) {
        const year = new Date(r.albums.release_date).getFullYear();
        const decade = `${Math.floor(year / 10) * 10}s`;
        albumDecades[decade] = (albumDecades[decade] || 0) + 1;
      }
    }

    // Decade distribution (songs — from album_name or parent data)
    const songDecades: Record<string, number> = {};
    // Songs don't have release_date directly, so we skip this for now

    return {
      artistAlbumCounts,
      artistSongCounts,
      genreCounts,
      songLength: { under3, between3and5, over5 },
      ownershipCounts,
      totalMinutes: Math.round(totalMinutes),
      genreMinutes,
      albumRatingDist,
      songRatingDist,
      albumDecades,
      songDecades,
    };
  }, [ratings, songRatings]);

  const isEmpty = ratings.length === 0 && songRatings.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-20">
        <p className="text-muted text-lg">No stats yet.</p>
        <p className="text-muted/60 text-sm mt-2">
          Rate some albums and songs to see your taste breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Toggle: Album / Song */}
      <div className="flex justify-center">
        <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
          <button
            onClick={() => setViewMode("album")}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === "album"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            By Album
          </button>
          <button
            onClick={() => setViewMode("song")}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === "song"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            By Song
          </button>
        </div>
      </div>

      {/* 5. All time minutes listened */}
      <ListeningStats
        totalMinutes={stats.totalMinutes}
        totalAlbums={ratings.length}
        totalSongs={songRatings.length}
        genreMinutes={stats.genreMinutes}
      />

      {/* 1. Top Artists — horizontal bar */}
      <TopArtistsChart
        data={
          viewMode === "album"
            ? stats.artistAlbumCounts
            : stats.artistSongCounts
        }
        label={viewMode === "album" ? "Albums" : "Songs"}
      />

      {/* 2. Genres — vertical bar */}
      <GenreChart data={stats.genreCounts} />

      {/* 7 & 8. Rating Distribution with toggle */}
      <RatingDistribution
        albumData={stats.albumRatingDist}
        songData={stats.songRatingDist}
        viewMode={viewMode}
      />

      {/* 9. By Decade */}
      <DecadeChart
        albumData={stats.albumDecades}
        viewMode={viewMode}
      />

      {/* 3. Song Length pie */}
      {songRatings.length > 0 && (
        <SongLengthPie data={stats.songLength} />
      )}

      {/* 4. Ownership pie */}
      {ratings.length > 0 && (
        <OwnershipPie data={stats.ownershipCounts} />
      )}
    </div>
  );
}
