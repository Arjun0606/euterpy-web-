-- ============================================================
-- STORIES — long-form prose about an album, song, or artist
-- The narrative layer of identity. Bigger and richer than notes.
-- This is the unit Euterpy is built around.
-- ============================================================

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('album', 'song', 'artist')),
  target_apple_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  target_artist TEXT,
  target_artwork_url TEXT,
  headline TEXT CHECK (char_length(headline) <= 200),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_target ON stories(kind, target_apple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_pinned ON stories(user_id, is_pinned) WHERE is_pinned = true;

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Own stories insert" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own stories update" ON stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own stories delete" ON stories FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_stories BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- LYRIC PINS — quote a line from a song, attach to your profile
-- The lyric-on-Instagram-Story behavior, made permanent.
-- ============================================================

CREATE TABLE IF NOT EXISTS lyric_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_apple_id TEXT NOT NULL,
  song_title TEXT NOT NULL,
  song_artist TEXT NOT NULL,
  song_artwork_url TEXT,
  lyric TEXT NOT NULL CHECK (char_length(lyric) BETWEEN 1 AND 500),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lyric_pins_user ON lyric_pins(user_id, position);

ALTER TABLE lyric_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public lyric pins" ON lyric_pins FOR SELECT USING (true);
CREATE POLICY "Own lyric pins insert" ON lyric_pins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own lyric pins update" ON lyric_pins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own lyric pins delete" ON lyric_pins FOR DELETE USING (auth.uid() = user_id);
