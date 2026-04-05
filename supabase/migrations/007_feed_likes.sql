-- Rating likes: simple heart on ratings in the feed
CREATE TABLE IF NOT EXISTS rating_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating_id UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, rating_id)
);

-- Add like_count to ratings
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rating_likes_rating ON rating_likes(rating_id);
CREATE INDEX IF NOT EXISTS idx_rating_likes_user ON rating_likes(user_id);

-- RLS
ALTER TABLE rating_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see likes" ON rating_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON rating_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own" ON rating_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to maintain like_count
CREATE OR REPLACE FUNCTION handle_rating_like()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ratings SET like_count = like_count + 1 WHERE id = NEW.rating_id;
    -- Create notification for the rating owner
    INSERT INTO notifications (user_id, type, actor_id, data)
    SELECT r.user_id, 'rating_like', NEW.user_id, jsonb_build_object('rating_id', NEW.rating_id)
    FROM ratings r WHERE r.id = NEW.rating_id AND r.user_id != NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ratings SET like_count = like_count - 1 WHERE id = OLD.rating_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_rating_like_created
  AFTER INSERT ON rating_likes
  FOR EACH ROW EXECUTE FUNCTION handle_rating_like();

CREATE TRIGGER on_rating_like_deleted
  AFTER DELETE ON rating_likes
  FOR EACH ROW EXECUTE FUNCTION handle_rating_like();
