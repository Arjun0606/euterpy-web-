-- ============================================================
-- PROFILE ENHANCEMENTS
-- ============================================================

-- Social links and additional profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
-- Format: {"instagram": "username", "twitter": "username", "spotify": "url", "tiktok": "username"}

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,  -- emoji or icon name
  criteria TEXT,       -- how to earn it
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  is_displayed BOOLEAN DEFAULT false,  -- max 5 displayed
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public user badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Own badges update" ON user_badges FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public badges" ON badges FOR SELECT USING (true);

-- Seed initial badges
INSERT INTO badges (name, description, icon, criteria) VALUES
  ('First Note', 'Rated your first album', '🎵', 'Rate 1 album'),
  ('Vinyl Head', 'Own 10+ vinyl records', '🎶', 'Log 10 vinyl-owned albums'),
  ('Deep Listener', 'Rated 50+ albums', '🎧', 'Rate 50 albums'),
  ('Critic', 'Written 25+ reviews', '✍️', 'Write 25 reviews'),
  ('Genre Hopper', 'Rated albums in 10+ genres', '🌍', 'Rate across 10 genres'),
  ('Century Club', 'Rated 100+ albums', '💯', 'Rate 100 albums'),
  ('Tastemaker', '50+ followers', '👑', 'Get 50 followers'),
  ('Decade Diver', 'Rated albums from 5+ decades', '📅', 'Rate across 5 decades'),
  ('Storyteller', 'Completed Get to Know Me', '📖', 'Fill all 3 GTKM slots'),
  ('Collector', 'Created 5+ shelves', '📚', 'Create 5 shelves');

-- ============================================================
-- REVIEWS (full review system, separate from one-liner reactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  title TEXT CHECK (char_length(title) <= 200),
  body TEXT NOT NULL CHECK (char_length(body) <= 5000),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_loved BOOLEAN DEFAULT false,  -- auto-set when upvote ratio >= 80%
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (album_id IS NOT NULL AND song_id IS NULL) OR
    (song_id IS NOT NULL AND album_id IS NULL)
  )
);

CREATE INDEX idx_reviews_user ON reviews(user_id, created_at DESC);
CREATE INDEX idx_reviews_album ON reviews(album_id, created_at DESC);
CREATE INDEX idx_reviews_song ON reviews(song_id, created_at DESC);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Own reviews insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own reviews update" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own reviews delete" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- REVIEW VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

CREATE INDEX idx_review_votes_review ON review_votes(review_id);

ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public review votes" ON review_votes FOR SELECT USING (true);
CREATE POLICY "Own votes insert" ON review_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own votes update" ON review_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own votes delete" ON review_votes FOR DELETE USING (auth.uid() = user_id);

-- Vote count triggers
CREATE OR REPLACE FUNCTION handle_review_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE reviews SET upvotes = upvotes + 1 WHERE id = NEW.review_id;
    ELSE
      UPDATE reviews SET downvotes = downvotes + 1 WHERE id = NEW.review_id;
    END IF;
    -- Check if loved
    UPDATE reviews SET is_loved = (
      upvotes + downvotes >= 5 AND upvotes::float / GREATEST(upvotes + downvotes, 1) >= 0.8
    ) WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE reviews SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.review_id;
    ELSE
      UPDATE reviews SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.review_id;
    END IF;
    UPDATE reviews SET is_loved = (
      upvotes + downvotes >= 5 AND upvotes::float / GREATEST(upvotes + downvotes, 1) >= 0.8
    ) WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_vote_created AFTER INSERT ON review_votes
  FOR EACH ROW EXECUTE FUNCTION handle_review_vote();
CREATE TRIGGER on_review_vote_deleted AFTER DELETE ON review_votes
  FOR EACH ROW EXECUTE FUNCTION handle_review_vote();

-- ============================================================
-- SHELF CUSTOMIZATION
-- ============================================================
ALTER TABLE shelves ADD COLUMN IF NOT EXISTS style TEXT CHECK (style IN ('minimal', 'wood', 'ornate', 'glass')) DEFAULT 'minimal';

-- ============================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================
CREATE TRIGGER set_updated_at_reviews BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
