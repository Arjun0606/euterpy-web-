-- ============================================================
-- REPOSTS — the amplification layer
-- The single most powerful growth mechanic in identity-based
-- social products. Substack restacks. Twitter retweets.
-- Pinterest repins. Letterboxd doesn't have this and it's
-- their biggest gap.
--
-- A user reposts a story / list / chart / lyric pin from
-- another user. The reposted content appears in the reposter's
-- followers' feeds with attribution intact.
-- Polymorphic — kind + target_id, parallel to stars.
-- ============================================================

CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('story', 'list', 'chart', 'lyric')),
  target_id UUID NOT NULL,
  comment TEXT CHECK (char_length(comment) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, kind, target_id)
);

CREATE INDEX IF NOT EXISTS idx_reposts_target ON reposts(kind, target_id);
CREATE INDEX IF NOT EXISTS idx_reposts_user ON reposts(user_id, created_at DESC);

ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reposts" ON reposts;
CREATE POLICY "Public reposts" ON reposts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Own reposts insert" ON reposts;
CREATE POLICY "Own reposts insert" ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own reposts delete" ON reposts;
CREATE POLICY "Own reposts delete" ON reposts FOR DELETE USING (auth.uid() = user_id);
