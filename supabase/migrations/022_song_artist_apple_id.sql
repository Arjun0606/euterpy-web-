-- Track Apple Music artist ID on each song so we can link to artist pages
-- (mirrors migration 013 which did the same for albums)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS artist_apple_id TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_artist_apple_id ON songs(artist_apple_id);
