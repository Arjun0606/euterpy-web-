-- Euterpy Schema v2
-- Uses Apple Music IDs as primary identifiers
-- Tables: profiles, albums, songs, ratings, song_ratings,
--         get_to_know_me, shelves, shelf_items, follows, feed_items

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT CHECK (char_length(bio) <= 160),
  avatar_url TEXT,
  album_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_username ON profiles(LOWER(username));
ALTER TABLE profiles ADD CONSTRAINT valid_username
  CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');

-- ============================================================
-- ALBUMS (Apple Music catalog data)
-- ============================================================
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_id TEXT UNIQUE NOT NULL,        -- Apple Music catalog ID
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  release_date DATE,
  artwork_url TEXT,                      -- Apple artwork template URL
  genre_names TEXT[] DEFAULT '{}',
  track_count INTEGER,
  rating_count INTEGER DEFAULT 0,
  rating_sum NUMERIC(10,1) DEFAULT 0,
  average_rating NUMERIC(3,2) GENERATED ALWAYS AS (
    CASE WHEN rating_count > 0 THEN ROUND(rating_sum / rating_count, 2) ELSE NULL END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_albums_apple_id ON albums(apple_id);
CREATE INDEX idx_albums_artist ON albums(artist_name);
CREATE INDEX idx_albums_rating ON albums(average_rating DESC NULLS LAST) WHERE rating_count > 0;

ALTER TABLE albums ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(artist_name, '')), 'B')
  ) STORED;
CREATE INDEX idx_albums_search ON albums USING GIN(search_vector);

-- ============================================================
-- SONGS (Apple Music catalog data)
-- ============================================================
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  album_apple_id TEXT,                   -- link to parent album
  duration_ms INTEGER,
  artwork_url TEXT,
  track_number INTEGER,
  genre_names TEXT[] DEFAULT '{}',
  rating_count INTEGER DEFAULT 0,
  rating_sum NUMERIC(10,1) DEFAULT 0,
  average_rating NUMERIC(3,2) GENERATED ALWAYS AS (
    CASE WHEN rating_count > 0 THEN ROUND(rating_sum / rating_count, 2) ELSE NULL END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_songs_apple_id ON songs(apple_id);
CREATE INDEX idx_songs_artist ON songs(artist_name);

ALTER TABLE songs ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(artist_name, '')), 'B')
  ) STORED;
CREATE INDEX idx_songs_search ON songs USING GIN(search_vector);

-- ============================================================
-- RATINGS (album ratings)
-- ============================================================
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  score NUMERIC(2,1) NOT NULL CHECK (score >= 0.5 AND score <= 5.0),
  reaction TEXT CHECK (char_length(reaction) <= 280),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

CREATE INDEX idx_ratings_user ON ratings(user_id, created_at DESC);
CREATE INDEX idx_ratings_album ON ratings(album_id, created_at DESC);

-- ============================================================
-- SONG RATINGS
-- ============================================================
CREATE TABLE song_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  score NUMERIC(2,1) NOT NULL CHECK (score >= 0.5 AND score <= 5.0),
  reaction TEXT CHECK (char_length(reaction) <= 280),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

CREATE INDEX idx_song_ratings_user ON song_ratings(user_id, created_at DESC);
CREATE INDEX idx_song_ratings_song ON song_ratings(song_id, created_at DESC);

-- ============================================================
-- GET TO KNOW ME (hero carousel — 3 albums with stories)
-- ============================================================
CREATE TABLE get_to_know_me (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 3),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  story TEXT CHECK (char_length(story) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, position)
);

CREATE INDEX idx_gtkm_user ON get_to_know_me(user_id, position);

-- ============================================================
-- SHELVES (curated collections)
-- ============================================================
CREATE TABLE shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 300),
  is_favorites BOOLEAN DEFAULT false,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shelves_user ON shelves(user_id, created_at DESC);

-- ============================================================
-- SHELF ITEMS (albums or songs)
-- ============================================================
CREATE TABLE shelf_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('album', 'song')),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  note TEXT CHECK (char_length(note) <= 200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (item_type = 'album' AND album_id IS NOT NULL AND song_id IS NULL) OR
    (item_type = 'song' AND song_id IS NOT NULL AND album_id IS NULL)
  )
);

CREATE INDEX idx_shelf_items_shelf ON shelf_items(shelf_id, position);

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================
-- FEED ITEMS (fan-out on write)
-- ============================================================
CREATE TABLE feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating_id UUID REFERENCES ratings(id) ON DELETE CASCADE,
  song_rating_id UUID REFERENCES song_ratings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (rating_id IS NOT NULL AND song_rating_id IS NULL) OR
    (song_rating_id IS NOT NULL AND rating_id IS NULL)
  )
);

CREATE INDEX idx_feed_user_created ON feed_items(user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public albums" ON albums FOR SELECT USING (true);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public songs" ON songs FOR SELECT USING (true);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public ratings" ON ratings FOR SELECT USING (true);
CREATE POLICY "Own ratings insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own ratings update" ON ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own ratings delete" ON ratings FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE song_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public song ratings" ON song_ratings FOR SELECT USING (true);
CREATE POLICY "Own song ratings insert" ON song_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own song ratings update" ON song_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own song ratings delete" ON song_ratings FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE get_to_know_me ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public gtkm" ON get_to_know_me FOR SELECT USING (true);
CREATE POLICY "Own gtkm insert" ON get_to_know_me FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own gtkm update" ON get_to_know_me FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own gtkm delete" ON get_to_know_me FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public shelves" ON shelves FOR SELECT USING (true);
CREATE POLICY "Own shelves insert" ON shelves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own shelves update" ON shelves FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own shelves delete" ON shelves FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE shelf_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public shelf items" ON shelf_items FOR SELECT USING (true);
CREATE POLICY "Own shelf items insert" ON shelf_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM shelves WHERE id = shelf_id AND user_id = auth.uid()));
CREATE POLICY "Own shelf items update" ON shelf_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM shelves WHERE id = shelf_id AND user_id = auth.uid()));
CREATE POLICY "Own shelf items delete" ON shelf_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM shelves WHERE id = shelf_id AND user_id = auth.uid()));

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Own follows insert" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Own follows delete" ON follows FOR DELETE USING (auth.uid() = follower_id);

ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own feed" ON feed_items FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Album rating: update counters + fan-out to feed
CREATE OR REPLACE FUNCTION handle_new_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE albums SET rating_count = rating_count + 1, rating_sum = rating_sum + NEW.score, updated_at = NOW()
  WHERE id = NEW.album_id;
  UPDATE profiles SET album_count = album_count + 1, updated_at = NOW()
  WHERE id = NEW.user_id;
  -- Fan-out
  INSERT INTO feed_items (user_id, actor_id, rating_id, created_at)
  SELECT follower_id, NEW.user_id, NEW.id, NEW.created_at FROM follows WHERE following_id = NEW.user_id;
  INSERT INTO feed_items (user_id, actor_id, rating_id, created_at)
  VALUES (NEW.user_id, NEW.user_id, NEW.id, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_rating_created AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION handle_new_rating();

CREATE OR REPLACE FUNCTION handle_rating_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE albums SET rating_sum = rating_sum - OLD.score + NEW.score, updated_at = NOW()
  WHERE id = NEW.album_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_rating_updated AFTER UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION handle_rating_update();

CREATE OR REPLACE FUNCTION handle_rating_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE albums SET rating_count = rating_count - 1, rating_sum = rating_sum - OLD.score, updated_at = NOW()
  WHERE id = OLD.album_id;
  UPDATE profiles SET album_count = album_count - 1, updated_at = NOW()
  WHERE id = OLD.user_id;
  DELETE FROM feed_items WHERE rating_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_rating_deleted AFTER DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION handle_rating_delete();

-- Song rating triggers
CREATE OR REPLACE FUNCTION handle_new_song_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE songs SET rating_count = rating_count + 1, rating_sum = rating_sum + NEW.score, updated_at = NOW()
  WHERE id = NEW.song_id;
  INSERT INTO feed_items (user_id, actor_id, song_rating_id, created_at)
  SELECT follower_id, NEW.user_id, NEW.id, NEW.created_at FROM follows WHERE following_id = NEW.user_id;
  INSERT INTO feed_items (user_id, actor_id, song_rating_id, created_at)
  VALUES (NEW.user_id, NEW.user_id, NEW.id, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_song_rating_created AFTER INSERT ON song_ratings
  FOR EACH ROW EXECUTE FUNCTION handle_new_song_rating();

CREATE OR REPLACE FUNCTION handle_song_rating_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE songs SET rating_sum = rating_sum - OLD.score + NEW.score, updated_at = NOW()
  WHERE id = NEW.song_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_song_rating_updated AFTER UPDATE ON song_ratings
  FOR EACH ROW EXECUTE FUNCTION handle_song_rating_update();

CREATE OR REPLACE FUNCTION handle_song_rating_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE songs SET rating_count = rating_count - 1, rating_sum = rating_sum - OLD.score, updated_at = NOW()
  WHERE id = OLD.song_id;
  DELETE FROM feed_items WHERE song_rating_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_song_rating_deleted AFTER DELETE ON song_ratings
  FOR EACH ROW EXECUTE FUNCTION handle_song_rating_delete();

-- Follow count triggers
CREATE OR REPLACE FUNCTION handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET following_count = following_count + 1, updated_at = NOW() WHERE id = NEW.follower_id;
  UPDATE profiles SET follower_count = follower_count + 1, updated_at = NOW() WHERE id = NEW.following_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_created AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION handle_new_follow();

CREATE OR REPLACE FUNCTION handle_unfollow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET following_count = following_count - 1, updated_at = NOW() WHERE id = OLD.follower_id;
  UPDATE profiles SET follower_count = follower_count - 1, updated_at = NOW() WHERE id = OLD.following_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_deleted AFTER DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION handle_unfollow();

-- Shelf item count
CREATE OR REPLACE FUNCTION update_shelf_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shelves SET item_count = item_count + 1, updated_at = NOW() WHERE id = NEW.shelf_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shelves SET item_count = item_count - 1, updated_at = NOW() WHERE id = OLD.shelf_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_shelf_item_created AFTER INSERT ON shelf_items
  FOR EACH ROW EXECUTE FUNCTION update_shelf_item_count();
CREATE TRIGGER on_shelf_item_deleted AFTER DELETE ON shelf_items
  FOR EACH ROW EXECUTE FUNCTION update_shelf_item_count();

-- Auto-create favorites shelf
CREATE OR REPLACE FUNCTION create_favorites_shelf()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shelves (user_id, title, is_favorites) VALUES (NEW.id, 'Favorites', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_favorites AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_favorites_shelf();

-- updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_ratings BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_song_ratings BEFORE UPDATE ON song_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_gtkm BEFORE UPDATE ON get_to_know_me FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION claim_username(desired_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles SET username = desired_username WHERE id = auth.uid();
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
WHEN check_violation THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
