-- ============================================================
-- LISTS — titled, ordered, captioned curation
-- The unit of music discourse. Letterboxd has these.
-- "10 albums that sound like a foggy morning",
-- "songs for when nothing makes sense",
-- "the records I'd save from a fire"
-- ============================================================

CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  subtitle TEXT CHECK (char_length(subtitle) <= 500),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lists_user ON lists(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lists_pinned ON lists(user_id, is_pinned) WHERE is_pinned = true;

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public lists" ON lists FOR SELECT USING (true);
CREATE POLICY "Own lists insert" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own lists update" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own lists delete" ON lists FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_lists BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('album', 'song')),
  target_apple_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  target_artist TEXT NOT NULL,
  target_artwork_url TEXT,
  caption TEXT CHECK (char_length(caption) <= 280),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, position)
);

CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id, position);

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public list items" ON list_items FOR SELECT USING (true);
CREATE POLICY "Own list items insert" ON list_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));
CREATE POLICY "Own list items update" ON list_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));
CREATE POLICY "Own list items delete" ON list_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));

-- ============================================================
-- CHARTS — "my ten right now"
-- Weekly status update in list form, low stakes, ritual.
-- The format every NTS DJ and music critic has used for 50 years.
-- ============================================================

CREATE TABLE IF NOT EXISTS charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charts_user_recent ON charts(user_id, created_at DESC);

ALTER TABLE charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public charts" ON charts FOR SELECT USING (true);
CREATE POLICY "Own charts insert" ON charts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own charts update" ON charts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own charts delete" ON charts FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS chart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 10),
  kind TEXT NOT NULL CHECK (kind IN ('album', 'song')),
  target_apple_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  target_artist TEXT NOT NULL,
  target_artwork_url TEXT,
  caption TEXT CHECK (char_length(caption) <= 280),
  UNIQUE(chart_id, position)
);

CREATE INDEX IF NOT EXISTS idx_chart_items_chart ON chart_items(chart_id, position);

ALTER TABLE chart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public chart items" ON chart_items FOR SELECT USING (true);
CREATE POLICY "Own chart items insert" ON chart_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM charts WHERE charts.id = chart_items.chart_id AND charts.user_id = auth.uid()));
CREATE POLICY "Own chart items update" ON chart_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM charts WHERE charts.id = chart_items.chart_id AND charts.user_id = auth.uid()));
CREATE POLICY "Own chart items delete" ON chart_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM charts WHERE charts.id = chart_items.chart_id AND charts.user_id = auth.uid()));
