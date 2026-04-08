-- Album type classification: album / ep / single / compilation
ALTER TABLE albums ADD COLUMN IF NOT EXISTS album_type TEXT DEFAULT 'album'
  CHECK (album_type IN ('album', 'ep', 'single', 'compilation'));

-- Backfill from existing is_single flag
UPDATE albums SET album_type = 'single' WHERE is_single = true AND album_type = 'album';

-- Quick lookup
CREATE INDEX IF NOT EXISTS idx_albums_type ON albums(album_type);

-- Also ensure songs.album_apple_id is indexed for the album → songs lookup
CREATE INDEX IF NOT EXISTS idx_songs_album_apple_id ON songs(album_apple_id);
