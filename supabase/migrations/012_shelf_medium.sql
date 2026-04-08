-- Track listening medium per shelf item
-- Lets users say "I have this album on vinyl in this shelf"
ALTER TABLE shelf_items ADD COLUMN IF NOT EXISTS medium TEXT
  CHECK (medium IN ('vinyl', 'cd', 'cassette', 'digital', 'live')) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_shelf_items_medium ON shelf_items(medium);
