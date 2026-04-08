-- Now Playing — ephemeral status (lyric-on-Story behavior for music)
-- Stored as a minimal blob on the profile, expires after 24h client-side

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS now_playing_apple_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS now_playing_kind TEXT CHECK (now_playing_kind IN ('song', 'album')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS now_playing_title TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS now_playing_artist TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS now_playing_artwork_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS now_playing_set_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_now_playing ON profiles(now_playing_set_at DESC) WHERE now_playing_set_at IS NOT NULL;
