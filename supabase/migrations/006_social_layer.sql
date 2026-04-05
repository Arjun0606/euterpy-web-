-- ============================================================
-- PRIVATE PROFILES
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- ============================================================
-- FOLLOW REQUESTS (for private profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, target_id),
  CHECK (requester_id != target_id)
);

CREATE INDEX idx_follow_requests_target ON follow_requests(target_id, status);
CREATE INDEX idx_follow_requests_requester ON follow_requests(requester_id);

ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own requests" ON follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Users can create requests" ON follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Target can update requests" ON follow_requests FOR UPDATE
  USING (auth.uid() = target_id);
CREATE POLICY "Users can delete own requests" ON follow_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- ============================================================
-- BLOCKED USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own blocks" ON blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Create blocks" ON blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Delete blocks" ON blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow', 'follow_request', 'review_vote', 'badge_earned')),
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own notifications update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Trigger: notify on new follow
CREATE OR REPLACE FUNCTION notify_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_notify AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_new_follow();

-- Trigger: notify on follow request
CREATE OR REPLACE FUNCTION notify_follow_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id)
  VALUES (NEW.target_id, 'follow_request', NEW.requester_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_request_notify AFTER INSERT ON follow_requests
  FOR EACH ROW EXECUTE FUNCTION notify_follow_request();

-- ============================================================
-- TASTE MATCH FUNCTION
-- Calculates % overlap between two users' rated albums
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_taste_match(user_a UUID, user_b UUID)
RETURNS NUMERIC AS $$
DECLARE
  shared_albums INTEGER;
  total_albums INTEGER;
  score_similarity NUMERIC;
BEGIN
  -- Count albums both users have rated
  SELECT COUNT(*) INTO shared_albums
  FROM ratings r1
  JOIN ratings r2 ON r1.album_id = r2.album_id
  WHERE r1.user_id = user_a AND r2.user_id = user_b;

  -- Total unique albums between both users
  SELECT COUNT(DISTINCT album_id) INTO total_albums
  FROM ratings
  WHERE user_id IN (user_a, user_b);

  IF total_albums = 0 OR shared_albums = 0 THEN
    RETURN 0;
  END IF;

  -- Calculate rating similarity on shared albums (1 - avg_diff/4) * 100
  SELECT 100 * (1 - AVG(ABS(r1.score - r2.score)) / 4.0) INTO score_similarity
  FROM ratings r1
  JOIN ratings r2 ON r1.album_id = r2.album_id
  WHERE r1.user_id = user_a AND r2.user_id = user_b;

  -- Weighted: 40% overlap + 60% rating similarity
  RETURN ROUND(
    (0.4 * (shared_albums::numeric / total_albums * 100)) +
    (0.6 * COALESCE(score_similarity, 0))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
