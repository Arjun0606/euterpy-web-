-- Migration 021 created the default favorites list with title "★ Favorites".
-- The BLACK STAR character renders fine in-app (browser falls back to a
-- system font) but not in the OG share-card route, which uses next/og's
-- edge-bundled font that only ships Latin sans-serif glyphs. The star
-- shows as a tofu box in shared images.
--
-- Strip the star prefix so the title is just "Favorites". The list is
-- recognizable without the decorative glyph and the share card renders
-- cleanly.
UPDATE lists
SET title = 'Favorites'
WHERE title = '★ Favorites';
