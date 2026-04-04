-- Fix the handle_new_user trigger to generate valid usernames
-- The issue: 'user_' + UUID prefix could have hyphens, violating the username constraint
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
BEGIN
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || REPLACE(LEFT(NEW.id::text, 8), '-', '')
  );

  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    new_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  );
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- If username taken, append random suffix
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    new_username || '_' || LEFT(md5(random()::text), 4),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
