-- ============================================================
-- SOCIAL LAYER — verified accounts, stars, comments
-- The gravitational force. Identity is what gives the product
-- value; social is what makes that value compound.
--
-- This migration is idempotent — safe to re-run.
-- It also cleans up any partial circles tables from a prior
-- attempt (we removed circles in favor of follows + reposts).
-- ============================================================

-- ------------------------------------------------------------
-- Cleanup: drop any circles tables that may exist from a prior
-- partial run of this migration. Circles are gone for good.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS circle_members CASCADE;
DROP TABLE IF EXISTS circles CASCADE;

-- ------------------------------------------------------------
-- VERIFIED — for music legends, critics, notable curators
-- Granted by hand by the founder. Manually flipped via SQL for now.
-- ------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_label TEXT;
-- verified_label e.g. 'Critic', 'Artist', 'Producer', 'Editor'

CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(is_verified) WHERE is_verified = true;

-- ------------------------------------------------------------
-- STARS — universal validation primitive
-- Stars work on stories, lists, charts, lyric pins.
-- Polymorphic table — kind + target_id.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('story', 'list', 'chart', 'lyric')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, kind, target_id)
);

CREATE INDEX IF NOT EXISTS idx_stars_target ON stars(kind, target_id);
CREATE INDEX IF NOT EXISTS idx_stars_user ON stars(user_id, created_at DESC);

ALTER TABLE stars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public stars" ON stars;
CREATE POLICY "Public stars" ON stars FOR SELECT USING (true);
DROP POLICY IF EXISTS "Own stars insert" ON stars;
CREATE POLICY "Own stars insert" ON stars FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own stars delete" ON stars;
CREATE POLICY "Own stars delete" ON stars FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- STORY COMMENTS — discussion under a story
-- Flat for now (no threading). Magazine letters-to-the-editor.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_comments_story ON story_comments(story_id, created_at);

ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public story comments" ON story_comments;
CREATE POLICY "Public story comments" ON story_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Own comments insert" ON story_comments;
CREATE POLICY "Own comments insert" ON story_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own comments update" ON story_comments;
CREATE POLICY "Own comments update" ON story_comments FOR UPDATE USING (auth.uid() = user_id);
-- Story author can also delete comments on their story
DROP POLICY IF EXISTS "Own comments delete" ON story_comments;
CREATE POLICY "Own comments delete" ON story_comments FOR DELETE USING (
  auth.uid() = user_id OR
  auth.uid() = (SELECT user_id FROM stories WHERE stories.id = story_comments.story_id)
);

DROP TRIGGER IF EXISTS set_updated_at_story_comments ON story_comments;
CREATE TRIGGER set_updated_at_story_comments BEFORE UPDATE ON story_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
