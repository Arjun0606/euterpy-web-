-- ============================================================
-- SOCIAL LAYER — verified accounts, stars, comments, circles
-- The gravitational force. Identity is what gives the product
-- value; social is what makes that value compound.
-- ============================================================

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
CREATE POLICY "Public stars" ON stars FOR SELECT USING (true);
CREATE POLICY "Own stars insert" ON stars FOR INSERT WITH CHECK (auth.uid() = user_id);
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
CREATE POLICY "Public story comments" ON story_comments FOR SELECT USING (true);
CREATE POLICY "Own comments insert" ON story_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own comments update" ON story_comments FOR UPDATE USING (auth.uid() = user_id);
-- Story author can also delete comments on their story
CREATE POLICY "Own comments delete" ON story_comments FOR DELETE USING (
  auth.uid() = user_id OR
  auth.uid() = (SELECT user_id FROM stories WHERE stories.id = story_comments.story_id)
);

CREATE TRIGGER set_updated_at_story_comments BEFORE UPDATE ON story_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- CIRCLES — friend groups, the closer-than-followers tier
-- A circle is a small private group (e.g. "the listening crew",
-- "summer 2026 friends", "music nerds") whose members can share
-- private stories, lists, and charts with each other.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT CHECK (char_length(description) <= 500),
  cover_emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circles_owner ON circles(owner_id, created_at DESC);

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
-- Members can read; owner can write/delete
CREATE POLICY "Members see circles" ON circles FOR SELECT USING (
  auth.uid() = owner_id OR
  EXISTS (SELECT 1 FROM circle_members WHERE circle_members.circle_id = circles.id AND circle_members.user_id = auth.uid())
);
CREATE POLICY "Own circles insert" ON circles FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Own circles update" ON circles FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Own circles delete" ON circles FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER set_updated_at_circles BEFORE UPDATE ON circles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see members" ON circle_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM circles WHERE circles.id = circle_members.circle_id AND (
    circles.owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM circle_members cm2 WHERE cm2.circle_id = circles.id AND cm2.user_id = auth.uid())
  ))
);
CREATE POLICY "Owner manages members" ON circle_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM circles WHERE circles.id = circle_members.circle_id AND circles.owner_id = auth.uid())
);
CREATE POLICY "Owner removes members" ON circle_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM circles WHERE circles.id = circle_members.circle_id AND circles.owner_id = auth.uid())
  OR auth.uid() = user_id
);
