-- ============================================================
-- Kill the shelves system entirely.
--
-- Decision: shelves and lists are the same thing with different
-- names. Lists are the better implementation (drag-to-reorder,
-- captions, share images, marks/echoes, OEmbed). Lists wins.
--
-- This migration:
--   1. Copies every shelf into lists (preserving data)
--   2. Copies every shelf_item into list_items (preserving data)
--   3. Drops the shelves and shelf_items tables
--   4. Drops the related triggers and functions
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add a temporary tracking column on lists so we can map
--    old shelf IDs to new list IDs during the item copy.
-- ------------------------------------------------------------
ALTER TABLE lists ADD COLUMN IF NOT EXISTS _migrated_from_shelf_id UUID;

-- ------------------------------------------------------------
-- 2. Copy shelves into lists.
--    Default "Favorites" shelves become a list named "★ Favorites".
-- ------------------------------------------------------------
INSERT INTO lists (user_id, title, subtitle, created_at, updated_at, _migrated_from_shelf_id)
SELECT
  s.user_id,
  CASE WHEN s.is_favorites THEN '★ Favorites' ELSE s.title END,
  NULL,
  s.created_at,
  s.updated_at,
  s.id
FROM shelves s
WHERE NOT EXISTS (
  -- Defensive: don't double-migrate if this script runs twice
  SELECT 1 FROM lists WHERE _migrated_from_shelf_id = s.id
);

-- ------------------------------------------------------------
-- 3. Copy shelf_items into list_items.
--    shelf_items references album_id / song_id (DB UUIDs);
--    list_items needs target_apple_id + title + artist + artwork.
--    JOIN with the albums and songs tables to hydrate.
--    Renumber positions per-list because shelf_items all had
--    position=0 by default and list_items has UNIQUE(list_id, position).
-- ------------------------------------------------------------
INSERT INTO list_items (list_id, position, kind, target_apple_id, target_title, target_artist, target_artwork_url, caption, created_at)
SELECT
  l.id AS list_id,
  ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY si.created_at) - 1 AS position,
  si.item_type AS kind,
  COALESCE(a.apple_id, sg.apple_id) AS target_apple_id,
  COALESCE(a.title, sg.title) AS target_title,
  COALESCE(a.artist_name, sg.artist_name) AS target_artist,
  COALESCE(a.artwork_url, sg.artwork_url) AS target_artwork_url,
  si.note AS caption,
  si.created_at
FROM shelf_items si
JOIN lists l ON l._migrated_from_shelf_id = si.shelf_id
LEFT JOIN albums a ON si.album_id = a.id
LEFT JOIN songs sg ON si.song_id = sg.id
WHERE COALESCE(a.apple_id, sg.apple_id) IS NOT NULL
ON CONFLICT (list_id, position) DO NOTHING;

-- ------------------------------------------------------------
-- 4. Drop the temp column
-- ------------------------------------------------------------
ALTER TABLE lists DROP COLUMN IF EXISTS _migrated_from_shelf_id;

-- ------------------------------------------------------------
-- 5. Drop shelves and related machinery
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS on_shelf_item_created ON shelf_items;
DROP TRIGGER IF EXISTS on_shelf_item_deleted ON shelf_items;

-- The trigger functions can stay defined (harmless if unreferenced)
-- but let's clean them up too
DROP FUNCTION IF EXISTS handle_shelf_item_change() CASCADE;

DROP TABLE IF EXISTS shelf_items CASCADE;
DROP TABLE IF EXISTS shelves CASCADE;

-- shelf_style on profiles is a visual preference, harmless leftover.
-- Leaving it in place — it doesn't cost anything and dropping it
-- would require touching profile selects across the app.
