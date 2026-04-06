"use client";

import { useState, useMemo } from "react";
import TasteProfile from "./TasteProfile";
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
  created_at?: string;
  albums: Album;
}

interface SongRating {
  id: string;
  score: number;
  reaction: string | null;
  created_at?: string;
  songs: Song;
}

interface Props {
  ratings: Rating[];
  songRatings: SongRating[];
}

export default function StatsView({ ratings, songRatings }: Props) {
  const [viewMode, setViewMode] = useState<"album" | "song">("album");

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

    // Genre distribution
    const genreCounts: Record<string, number> = {};
    for (const r of ratings) {
      for (const g of (r.albums.genre_names || [])) {
        if (g !== "Music") genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
    }
    for (const sr of songRatings) {
      for (const g of (sr.songs.genre_names || [])) {
        if (g !== "Music") genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
    }

    // Song length distribution
    let under3 = 0, between3and5 = 0, over5 = 0;
    for (const sr of songRatings) {
      const ms = sr.songs.duration_ms;
      if (!ms) continue;
      const mins = ms / 60000;
      if (mins < 3) under3++;
      else if (mins <= 5) between3and5++;
      else over5++;
    }

    // Ownership distribution
    const ownershipCounts: Record<string, number> = { vinyl: 0, cd: 0, cassette: 0, digital: 0 };
    for (const r of ratings) {
      const type = r.ownership || "digital";
      ownershipCounts[type] = (ownershipCounts[type] || 0) + 1;
    }

    // Total minutes
    let totalMinutes = 0;
    for (const sr of songRatings) {
      if (sr.songs.duration_ms) totalMinutes += sr.songs.duration_ms / 60000;
    }

    // Minutes by genre
    const genreMinutes: Record<string, number> = {};
    for (const sr of songRatings) {
      const mins = (sr.songs.duration_ms || 0) / 60000;
      for (const g of (sr.songs.genre_names || [])) {
        if (g !== "Music") genreMinutes[g] = (genreMinutes[g] || 0) + mins;
      }
    }

    // Rating distributions
    const albumRatingDist: Record<string, number> = {};
    for (const r of ratings) albumRatingDist[r.score.toString()] = (albumRatingDist[r.score.toString()] || 0) + 1;

    const songRatingDist: Record<string, number> = {};
    for (const sr of songRatings) songRatingDist[sr.score.toString()] = (songRatingDist[sr.score.toString()] || 0) + 1;

    // Decade distribution
    const albumDecades: Record<string, number> = {};
    for (const r of ratings) {
      if (r.albums.release_date) {
        const year = new Date(r.albums.release_date).getFullYear();
        const decade = `${Math.floor(year / 10) * 10}s`;
        albumDecades[decade] = (albumDecades[decade] || 0) + 1;
      }
    }

    // === NEW: Taste Profile data ===

    // Average rating
    const allScores = [...ratings.map((r) => r.score), ...songRatings.map((sr) => sr.score)];
    const avgRating = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

    // Top genre
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Top artist (by albums)
    const topArtist = Object.entries(artistAlbumCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Top decade
    const topDecade = Object.entries(albumDecades).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Dominant ownership
    const physicalOwnership = Object.entries(ownershipCounts)
      .filter(([k]) => k !== "digital")
      .sort((a, b) => b[1] - a[1]);
    const dominantOwnership = physicalOwnership[0]?.[1] > 0 ? physicalOwnership[0][0] : null;

    // Superfan artists (3+ albums rated)
    const superfanArtists = Object.entries(artistAlbumCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Highest rated album
    const highestRatedAlbum = ratings.length > 0
      ? ratings.reduce((best, r) => r.score > best.score ? r : best, ratings[0])
      : null;
    const highestRated = highestRatedAlbum
      ? { title: highestRatedAlbum.albums.title, artist: highestRatedAlbum.albums.artist_name, score: highestRatedAlbum.score }
      : null;

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
      avgRating,
      topGenre,
      topArtist,
      topDecade,
      dominantOwnership,
      superfanArtists,
      highestRated,
    };
  }, [ratings, songRatings]);

  if (ratings.length === 0 && songRatings.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted text-lg">No stats yet.</p>
        <p className="text-muted/60 text-sm mt-2">Rate some albums and songs to see your taste breakdown.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Taste Profile — the hero summary */}
      <TasteProfile
        topGenre={stats.topGenre}
        topArtist={stats.topArtist}
        albumCount={ratings.length}
        songCount={songRatings.length}
        avgRating={stats.avgRating}
        topDecade={stats.topDecade}
        dominantOwnership={stats.dominantOwnership}
        superfanArtists={stats.superfanArtists}
        highestRated={stats.highestRated}
      />

      {/* Toggle: Album / Song */}
      <div className="flex justify-center">
        <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
          <button
            onClick={() => setViewMode("album")}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === "album" ? "bg-accent text-white" : "text-muted hover:text-foreground transition-colors"
            }`}
          >
            By Album
          </button>
          <button
            onClick={() => setViewMode("song")}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === "song" ? "bg-accent text-white" : "text-muted hover:text-foreground transition-colors"
            }`}
          >
            By Song
          </button>
        </div>
      </div>

      {/* All time numbers */}
      <ListeningStats
        totalMinutes={stats.totalMinutes}
        totalAlbums={ratings.length}
        totalSongs={songRatings.length}
        genreMinutes={stats.genreMinutes}
      />

      {/* Top Artists */}
      <TopArtistsChart
        data={viewMode === "album" ? stats.artistAlbumCounts : stats.artistSongCounts}
        label={viewMode === "album" ? "Albums" : "Songs"}
      />

      {/* Genres */}
      <GenreChart data={stats.genreCounts} />

      {/* Rating Distribution */}
      <RatingDistribution
        albumData={stats.albumRatingDist}
        songData={stats.songRatingDist}
        viewMode={viewMode}
      />

      {/* By Decade */}
      <DecadeChart albumData={stats.albumDecades} viewMode={viewMode} />

      {/* Song Length */}
      {songRatings.length > 0 && <SongLengthPie data={stats.songLength} />}

      {/* Ownership */}
      {ratings.length > 0 && <OwnershipPie data={stats.ownershipCounts} />}
    </div>
  );
}
