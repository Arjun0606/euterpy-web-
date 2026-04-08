-- Track Apple Music artist ID on each album so we can link to artist pages
ALTER TABLE albums ADD COLUMN IF NOT EXISTS artist_apple_id TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_artist_apple_id ON albums(artist_apple_id);
